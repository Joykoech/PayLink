import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, AlertCircle, Loader2, ArrowLeft, ShieldCheck, QrCode } from 'lucide-react';

export default function PaymentForm({ amount, description, linkSlug }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | polling | completed | failed
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  // Poll payment status every 2 seconds when in polling state
  useEffect(() => {
    let intervalId;
    if (status === 'polling' && paymentId) {
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds max

      intervalId = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`/api/payments/${paymentId}/poll`);
          const result = await res.json();

          if (result.success && result.data) {
            if (result.data.status === 'completed') {
              setPaymentDetails(result.data);
              setStatus('completed');
              clearInterval(intervalId);
            } else if (result.data.status === 'failed') {
              setErrorMessage(result.data.resultDesc || 'Payment failed or cancelled.');
              setStatus('failed');
              clearInterval(intervalId);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }

        if (attempts >= maxAttempts) {
          clearInterval(intervalId);
          setErrorMessage('Payment request timed out. If you received an SMS from M-Pesa, your payment will be reflected shortly.');
          setStatus('failed');
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, paymentId]);

  async function handlePayment(e) {
    e.preventDefault();
    setErrorMessage('');
    setStatus('submitting');

    try {
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          amount,
          linkSlug,
          transactionDesc: description,
          accountReference: linkSlug ? `Pay-${linkSlug.substring(0, 8)}` : 'PayLink',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to initiate STK Push.');
        setStatus('failed');
        return;
      }

      setPaymentId(result.data.paymentId);
      setStatus('polling');
    } catch (err) {
      setErrorMessage(err.message || 'Could not connect to payment server.');
      setStatus('failed');
    }
  }

  async function toggleQrCode() {
    if (!showQr && !qrDataUrl && linkSlug) {
      try {
        const res = await fetch(`/api/links/${linkSlug}/qr`);
        const result = await res.json();
        if (result.success) {
          setQrDataUrl(result.data.qr);
        }
      } catch (err) {
        console.error('Failed to load QR code:', err);
      }
    }
    setShowQr(!showQr);
  }

  function resetForm() {
    setStatus('idle');
    setErrorMessage('');
    setPaymentDetails(null);
    setPaymentId(null);
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header with M-Pesa styling */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-6 text-white text-center relative">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-3 backdrop-blur-sm">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold">Pay with M-Pesa</h2>
        <p className="text-green-100 text-sm mt-1">{description}</p>
        <div className="mt-4 bg-white/20 backdrop-blur-md rounded-xl py-2 px-4 inline-block">
          <span className="text-xs uppercase tracking-wider text-green-100 font-medium">Amount Due</span>
          <p className="text-2xl font-extrabold text-white">KES {amount?.toLocaleString()}</p>
        </div>
      </div>

      <div className="p-6">
        {/* State: Idle or Submitting */}
        {(status === 'idle' || status === 'submitting') && (
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1">
                M-Pesa Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 font-medium text-sm">
                  +254
                </span>
                <input
                  id="phone"
                  type="tel"
                  required
                  placeholder="712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900 font-medium"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Format: 07XXXXXXXX, 01XXXXXXXX, or 254XXXXXXXXX
              </p>
            </div>

            <button
              type="submit"
              disabled={status === 'submitting' || !phoneNumber}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending STK Push...
                </>
              ) : (
                <>Pay KES {amount?.toLocaleString()}</>
              )}
            </button>

            {/* QR Code toggle for desktop users who want to scan and pay on mobile */}
            {linkSlug && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={toggleQrCode}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 font-medium transition py-1 px-2 rounded-lg hover:bg-gray-50"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  {showQr ? 'Hide QR Code' : 'Scan QR code with phone'}
                </button>

                {showQr && qrDataUrl && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 inline-block animate-fade-in">
                    <img src={qrDataUrl} alt="Scan to pay" className="w-40 h-40 mx-auto rounded-lg" />
                    <p className="text-[11px] text-gray-400 mt-1.5">Scan to open on your phone</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Secured by Safaricom Daraja API</span>
            </div>
          </form>
        )}

        {/* State: Polling (Waiting for user to enter PIN) */}
        {status === 'polling' && (
          <div className="text-center py-6 space-y-4">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-ping opacity-75"></div>
              <div className="relative w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-emerald-600 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Check Your Phone</h3>
              <p className="text-sm text-gray-600">
                An M-Pesa STK prompt has been sent to <span className="font-semibold text-gray-800">{phoneNumber}</span>.
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                Enter your M-Pesa PIN on your phone to complete payment.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Waiting for confirmation...</span>
            </div>
          </div>
        )}

        {/* State: Completed */}
        {status === 'completed' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
              <p className="text-sm text-gray-500 mt-1">Your payment has been received and confirmed.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 border border-gray-100 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Receipt No:</span>
                <span className="font-mono font-bold text-gray-900">{paymentDetails?.mpesaReceiptNumber || 'Verified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid:</span>
                <span className="font-bold text-emerald-600">KES {paymentDetails?.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="font-medium text-gray-800">{paymentDetails?.phoneNumber}</span>
              </div>
              {paymentDetails?.transactionDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="text-gray-700">{paymentDetails.transactionDate}</span>
                </div>
              )}
            </div>

            <button
              onClick={resetForm}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl transition"
            >
              Make Another Payment
            </button>
          </div>
        )}

        {/* State: Failed */}
        {status === 'failed' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Payment Failed</h3>
              <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
            </div>

            <button
              onClick={resetForm}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
