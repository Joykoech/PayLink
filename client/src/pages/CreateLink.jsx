import React, { useState } from 'react';
import { Copy, Check, Sparkles, QrCode, Download, Eye } from 'lucide-react';

export default function CreateLink() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [createdLink, setCreatedLink] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [showQr, setShowQr] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description,
          slug: slug.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error);
        return;
      }

      setCreatedLink(result.data);

      // Fetch the QR code for this newly created link
      try {
        const qrRes = await fetch(`/api/links/${result.data.slug}/qr`);
        const qrResult = await qrRes.json();
        if (qrResult.success) {
          setQrDataUrl(qrResult.data.qr);
        }
      } catch (qrErr) {
        console.warn('Failed to pre-fetch QR code:', qrErr);
      }
    } catch {
      setError('Failed to create payment link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function getFullUrl() {
    return `${window.location.origin}/pay/${createdLink.slug}`;
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(getFullUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Payment Link</h1>
        <p className="text-gray-500 text-sm mt-1">
          Set up an instant M-Pesa payment link to share with your clients or customers.
        </p>
      </div>

      {createdLink ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6">
          <div className="flex items-center gap-3 text-emerald-600">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Payment Link Created!</h2>
              <p className="text-xs text-emerald-600 font-medium">Ready to share and accept payments</p>
            </div>
          </div>

          {/* URL Box */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Shareable URL</p>
            <p className="font-mono text-sm break-all font-semibold text-emerald-700 bg-white p-3 rounded-lg border border-gray-200">
              {getFullUrl()}
            </p>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <span className="text-gray-400 text-xs block">Amount</span>
              <span className="font-bold text-gray-800">KES {createdLink.amount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs block">Description</span>
              <span className="font-medium text-gray-800 truncate block">{createdLink.description}</span>
            </div>
          </div>

          {/* QR Code Preview Card */}
          {qrDataUrl && (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-center space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Instant Scan-to-Pay QR
                </span>
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                >
                  {showQr ? 'Hide' : 'Show'}
                </button>
              </div>

              {showQr && (
                <>
                  <div className="bg-white p-3 rounded-xl inline-block shadow-xs border border-emerald-200/60">
                    <img src={qrDataUrl} alt="Payment QR Code" className="w-44 h-44 mx-auto rounded-lg" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Share this QR code on posters, invoices, or social media for direct mobile checkout.
                  </p>
                  <div>
                    <a
                      href={qrDataUrl}
                      download={`paylink-${createdLink.slug}-qr.png`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download QR PNG
                    </a>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Link'}
            </button>
            <a
              href={`/pay/${createdLink.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 transition text-center flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              View Payment Page
            </a>
          </div>

          <button
            onClick={() => {
              setCreatedLink(null);
              setQrDataUrl(null);
              setAmount('');
              setDescription('');
              setSlug('');
            }}
            className="w-full text-center text-sm text-gray-500 hover:text-emerald-600 font-medium transition pt-2"
          >
            + Create another link
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5">
          <div>
            <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-1">
              Amount (KES) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 font-medium text-sm">
                KES
              </span>
              <input
                id="amount"
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15000"
                className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-900 font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Logo Design - Acme Corp, Ticket #204"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-900"
              required
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-semibold text-gray-700 mb-1">
              Custom Link Slug (optional)
            </label>
            <div className="flex items-center">
              <span className="text-gray-400 text-sm font-mono mr-2 bg-gray-100 px-3 py-3 rounded-xl border border-gray-200">
                /pay/
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="logo-design"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-900 font-mono text-sm"
              />
            </div>
            <p className="text-gray-400 text-xs mt-1.5">
              Leave blank to auto-generate a random 8-character slug. Letters, numbers, and dashes only.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl font-bold shadow-md transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Creating Link...' : 'Create Payment Link'}
          </button>
        </form>
      )}
    </div>
  );
}
