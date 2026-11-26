import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PaymentForm from '../components/PaymentForm';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function PayPage() {
  const { slug } = useParams();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLink() {
      try {
        const response = await fetch(`/api/links/${slug}`);
        const result = await response.json();

        if (!result.success) {
          setError(result.error || 'Payment link not found.');
          return;
        }

        setLink(result.data);
      } catch {
        setError('Could not load payment link. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }

    fetchLink();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading payment link...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-6 bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link Unavailable</h2>
        <p className="text-gray-600 text-sm mb-6">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <PaymentForm
        amount={link.amount}
        description={link.description}
        linkSlug={slug}
      />
    </div>
  );
}

