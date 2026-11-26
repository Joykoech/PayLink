const axios = require('axios');

// Get Safaricom Base URL based on environment
function getDarajaBaseUrl() {
  const env = (process.env.MPESA_ENVIRONMENT || 'sandbox').toLowerCase();
  return env === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

// Generate OAuth Token from Daraja
async function getOAuthToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret || consumerKey === 'your_consumer_key_here') {
    throw new Error('M-Pesa credentials not configured. Please add MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET to .env');
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const baseUrl = getDarajaBaseUrl();

  const response = await axios.get(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      timeout: 15000,
    }
  );

  return response.data.access_token;
}

// Generate current timestamp in YYYYMMDDHHmmss format
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Generate password for Lipa Na M-Pesa Online
function getPassword(shortCode, passkey, timestamp) {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

// Format Phone Number to 254XXXXXXXXX
function formatPhoneNumber(phone) {
  let cleaned = String(phone).trim().replace(/[\s\-\+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  return cleaned;
}

// Initiate STK Push
async function initiateSTKPush(phoneNumber, amount, accountReference = 'PayLink', transactionDesc = 'Payment') {
  const shortCode = process.env.MPESA_SHORTCODE || '174379';
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!passkey) {
    throw new Error('MPESA_PASSKEY is not configured in .env');
  }
  if (!callbackUrl) {
    throw new Error('MPESA_CALLBACK_URL is not configured in .env');
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);
  const token = await getOAuthToken();
  const timestamp = getTimestamp();
  const password = getPassword(shortCode, passkey, timestamp);
  const baseUrl = getDarajaBaseUrl();

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(Number(amount)),
    PartyA: formattedPhone,
    PartyB: shortCode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: (accountReference || 'PayLink').substring(0, 12),
    TransactionDesc: (transactionDesc || 'Payment').substring(0, 13),
  };

  const response = await axios.post(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    }
  );

  return response.data;
}

module.exports = {
  getOAuthToken,
  initiateSTKPush,
  formatPhoneNumber,
};

