import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Copy,
  Check,
  QrCode,
  Download,
  Power,
  ExternalLink,
  Layers,
  CheckCircle2,
  TrendingUp,
  X,
} from 'lucide-react';

export default function Dashboard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [qrModal, setQrModal] = useState({ open: false, slug: null, qrUrl: null });

  async function fetchLinks() {
    try {
      const response = await fetch('/api/links');
      const result = await response.json();
      if (result.success) {
        setLinks(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch links:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLinks();
  }, []);

  function copyLink(slug) {
    const fullUrl = `${window.location.origin}/pay/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  async function toggleStatus(slug) {
    try {
      const response = await fetch(`/api/links/${slug}/toggle`, { method: 'PATCH' });
      const result = await response.json();
      if (result.success) {
        setLinks((prev) =>
          prev.map((l) => (l.slug === slug ? { ...l, active: result.data.active } : l))
        );
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  }

  async function openQrModal(slug) {
    try {
      const response = await fetch(`/api/links/${slug}/qr`);
      const result = await response.json();
      if (result.success) {
        setQrModal({ open: true, slug, qrUrl: result.data.qr });
      }
    } catch (err) {
      console.error('Failed to fetch QR code:', err);
    }
  }

  const totalCollected = links.reduce((sum, link) => sum + link.totalCollected, 0);
  const totalPayments = links.reduce((sum, link) => sum + link.totalPayments, 0);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Payment Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your M-Pesa links, track conversions, and export transactions.</p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition"
        >
          <PlusCircle className="w-5 h-5" />
          Create Link
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Links</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{links.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Payments</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{totalPayments}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Collected</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">
              KES {totalCollected.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-base">Your Payment Links</h2>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {links.length} active/archived
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500 flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-sm">Loading links...</p>
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900 mb-1">No payment links created yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first link to start collecting payments via M-Pesa.</p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
            >
              <PlusCircle className="w-4 h-4" />
              Create Link
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-center">Paid</th>
                  <th className="px-6 py-3.5 text-right">Collected</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{link.description}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-gray-500">/pay/{link.slug}</span>
                        <a
                          href={`/pay/${link.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-emerald-600 transition"
                          title="Open link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      KES {link.amount.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStatus(link.slug)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          link.active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title="Click to toggle status"
                      >
                        <Power className="w-3 h-3" />
                        {link.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-center font-medium text-gray-700">
                      {link.totalPayments}
                    </td>

                    <td className="px-6 py-4 text-right font-extrabold text-emerald-600">
                      KES {link.totalCollected.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Copy Link Button */}
                        <button
                          onClick={() => copyLink(link.slug)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Copy link"
                        >
                          {copiedSlug === link.slug ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* QR Code Button */}
                        <button
                          onClick={() => openQrModal(link.slug)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Generate QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Export CSV Button */}
                        <a
                          href={`/api/links/${link.slug}/export`}
                          download
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Download CSV report"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setQrModal({ open: false, slug: null, qrUrl: null })}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-gray-900">Scan to Pay</h3>
              <p className="text-xs text-gray-500 mt-0.5">/pay/{qrModal.slug}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl inline-block border border-gray-100">
              <img src={qrModal.qrUrl} alt="QR Code" className="w-56 h-56 mx-auto rounded-lg" />
            </div>

            <p className="text-xs text-gray-400">
              Customers can scan this QR code using their camera to go directly to the M-Pesa checkout page.
            </p>

            <a
              href={qrModal.qrUrl}
              download={`qrcode-${qrModal.slug}.png`}
              className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition text-sm"
            >
              Download QR Image
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

