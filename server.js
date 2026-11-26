require('dotenv').config();
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const { initiateSTKPush, formatPhoneNumber } = require('./mpesa');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper: Generate random 8-character slug
function generateRandomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// ----------------------------------------------------
// PAYMENT LINK ROUTES
// ----------------------------------------------------

// 1. Create a payment link
app.post('/api/links', async (req, res) => {
  try {
    const { amount, description, slug } = req.body;

    if (!amount || Number(amount) < 1) {
      return res.status(400).json({ success: false, error: 'Amount must be at least 1 KES.' });
    }
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Description is required.' });
    }

    // Generate or validate slug
    let finalSlug = slug
      ? slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : generateRandomSlug();

    if (!finalSlug || finalSlug.length < 2) {
      finalSlug = generateRandomSlug();
    }

    // Check if slug is already taken
    const existing = await prisma.paymentLink.findUnique({
      where: { slug: finalSlug },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `The slug "${finalSlug}" is already taken. Try a different one.`,
      });
    }

    const link = await prisma.paymentLink.create({
      data: {
        slug: finalSlug,
        amount: parseFloat(amount),
        description: description.trim(),
      },
    });

    res.json({
      success: true,
      data: {
        id: link.id,
        slug: link.slug,
        amount: link.amount,
        description: link.description,
        url: `/pay/${link.slug}`,
      },
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. List all payment links with stats
app.get('/api/links', async (req, res) => {
  try {
    const links = await prisma.paymentLink.findMany({
      include: {
        _count: {
          select: { payments: true },
        },
        payments: {
          where: { status: 'completed' },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = links.map((link) => ({
      id: link.id,
      slug: link.slug,
      amount: link.amount,
      description: link.description,
      active: link.active,
      totalPayments: link._count.payments,
      totalCollected: link.payments.reduce((sum, p) => sum + p.amount, 0),
      url: `/pay/${link.slug}`,
      createdAt: link.createdAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Get a payment link by slug
app.get('/api/links/:slug', async (req, res) => {
  try {
    const link = await prisma.paymentLink.findUnique({
      where: { slug: req.params.slug },
      include: {
        payments: {
          where: { status: 'completed' },
          select: { amount: true, createdAt: true },
        },
      },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Payment link not found.' });
    }

    if (!link.active) {
      return res.status(410).json({ success: false, error: 'This payment link is no longer active.' });
    }

    res.json({
      success: true,
      data: {
        id: link.id,
        slug: link.slug,
        amount: link.amount,
        description: link.description,
        active: link.active,
        totalPayments: link.payments.length,
      },
    });
  } catch (error) {
    console.error('Error fetching link by slug:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Toggle Link Active Status (Bonus Feature)
app.patch('/api/links/:slug/toggle', async (req, res) => {
  try {
    const link = await prisma.paymentLink.findUnique({
      where: { slug: req.params.slug },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Payment link not found.' });
    }

    const updated = await prisma.paymentLink.update({
      where: { slug: req.params.slug },
      data: { active: !link.active },
    });

    res.json({
      success: true,
      data: updated,
      message: `Link is now ${updated.active ? 'active' : 'inactive'}`,
    });
  } catch (error) {
    console.error('Error toggling link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Generate QR Code for a Payment Link (Bonus Feature)
app.get('/api/links/:slug/qr', async (req, res) => {
  try {
    const link = await prisma.paymentLink.findUnique({
      where: { slug: req.params.slug },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Link not found.' });
    }

    const origin = process.env.APP_URL || 'http://localhost:5173';
    const payUrl = `${origin}/pay/${link.slug}`;
    const qrDataUrl = await QRCode.toDataURL(payUrl, { width: 300, margin: 2 });

    res.json({ success: true, data: { qr: qrDataUrl, url: payUrl } });
  } catch (error) {
    console.error('QR code error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Export Payments as CSV (Bonus Feature)
app.get('/api/links/:slug/export', async (req, res) => {
  try {
    const link = await prisma.paymentLink.findUnique({
      where: { slug: req.params.slug },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Link not found.' });
    }

    // Generate CSV content
    const headers = 'Payment ID,Receipt Number,Phone Number,Amount (KES),Status,Transaction Date,Created At\n';
    const rows = link.payments.map((p) => {
      const receipt = p.mpesaReceiptNumber || 'N/A';
      const phone = p.phoneNumber || '';
      const amount = p.amount;
      const status = p.status;
      const txDate = p.transactionDate || '';
      const created = p.createdAt.toISOString();
      return `"${p.id}","${receipt}","${phone}",${amount},"${status}","${txDate}","${created}"`;
    }).join('\n');

    const csvContent = headers + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payments-${link.slug}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// M-PESA & PAYMENT ROUTES
// ----------------------------------------------------

// 7. Initiate STK Push
app.post('/api/mpesa/stkpush', async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference, transactionDesc, linkSlug } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }
    if (!amount || Number(amount) < 1) {
      return res.status(400).json({ success: false, error: 'Amount must be at least 1 KES.' });
    }

    // Format phone number
    let formattedPhone;
    try {
      formattedPhone = formatPhoneNumber(phoneNumber);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid phone format.' });
    }

    if (!/^254[17]\d{8}$/.test(formattedPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Kenyan phone number. Use format 07XXXXXXXX or 01XXXXXXXX.',
      });
    }

    // Find the payment link if slug is provided
    let paymentLinkId = null;
    if (linkSlug) {
      const link = await prisma.paymentLink.findUnique({ where: { slug: linkSlug } });
      if (!link) {
        return res.status(404).json({ success: false, error: 'Payment link not found.' });
      }
      if (!link.active) {
        return res.status(410).json({ success: false, error: 'This payment link is no longer active.' });
      }
      paymentLinkId = link.id;
    }

    const result = await initiateSTKPush(
      formattedPhone,
      amount,
      accountReference || (linkSlug ? `Pay-${linkSlug}` : 'PayLink'),
      transactionDesc || 'PayLink Payment'
    );

    const payment = await prisma.payment.create({
      data: {
        checkoutRequestId: result.CheckoutRequestID,
        merchantRequestId: result.MerchantRequestID,
        phoneNumber: formattedPhone,
        amount: parseFloat(amount),
        accountReference: accountReference || 'PayLink',
        transactionDesc: transactionDesc || 'Payment',
        status: 'pending',
        paymentLinkId,
      },
    });

    res.json({
      success: true,
      message: 'STK Push sent. Check your phone.',
      data: {
        paymentId: payment.id,
        checkoutRequestId: result.CheckoutRequestID,
      },
    });
  } catch (error) {
    console.error('STK Push error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.errorMessage || error.message;
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// 8. Handle M-Pesa Callback from Safaricom
app.post('/api/mpesa/callback', async (req, res) => {
  try {
    console.log('--- Incoming M-Pesa Callback ---');
    console.log(JSON.stringify(req.body, null, 2));

    const callbackData = req.body?.Body?.stkCallback;
    if (!callbackData) {
      return res.status(400).json({ success: false, error: 'Invalid callback payload' });
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData;

    const payment = await prisma.payment.findUnique({
      where: { checkoutRequestId: CheckoutRequestID },
    });

    if (!payment) {
      console.warn(`Payment not found for CheckoutRequestID: ${CheckoutRequestID}`);
      // Safaricom expects an acknowledgment regardless
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (ResultCode === 0) {
      // Payment Successful
      let receiptNumber = null;
      let transactionDate = null;
      let callbackAmount = payment.amount;

      if (CallbackMetadata && CallbackMetadata.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') receiptNumber = String(item.Value);
          if (item.Name === 'TransactionDate') transactionDate = String(item.Value);
          if (item.Name === 'Amount') callbackAmount = parseFloat(item.Value);
        }
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          mpesaReceiptNumber: receiptNumber,
          transactionDate,
          amount: callbackAmount,
        },
      });

      console.log(`Payment ${payment.id} marked as completed! Receipt: ${receiptNumber}`);
    } else {
      // Payment Failed or Cancelled by User
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          resultCode: ResultCode,
          resultDesc: ResultDesc,
        },
      });

      console.log(`Payment ${payment.id} failed: ${ResultDesc} (Code: ${ResultCode})`);
    }

    // Acknowledge receipt to Safaricom
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('Callback error:', error);
    return res.json({ ResultCode: 0, ResultDesc: 'Error processed' });
  }
});

// 9. Poll payment status
app.get('/api/payments/:id/poll', async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found.' });
    }

    res.json({
      success: true,
      data: {
        id: payment.id,
        status: payment.status,
        resultCode: payment.resultCode,
        resultDesc: payment.resultDesc,
        mpesaReceiptNumber: payment.mpesaReceiptNumber,
        transactionDate: payment.transactionDate,
        amount: payment.amount,
        phoneNumber: payment.phoneNumber,
      },
    });
  } catch (error) {
    console.error('Poll error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. List all payments
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        paymentLink: {
          select: { slug: true, description: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`PayLink API server running on http://localhost:${PORT}`);
});

