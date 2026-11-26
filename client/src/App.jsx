import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import CreateLink from './pages/CreateLink';
import PayPage from './pages/PayPage';
import Dashboard from './pages/Dashboard';
import { Link2, PlusCircle, LayoutDashboard } from 'lucide-react';

function Navbar() {
  const location = useLocation();

  // If on a pay page, show clean checkout header
  if (location.pathname.startsWith('/pay/')) {
    return (
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-emerald-600 font-extrabold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Link2 className="w-5 h-5" />
            </div>
            <span>PayLink</span>
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
            M-Pesa Checkout
          </span>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-gray-200/60 bg-white sticky top-0 z-40 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 text-emerald-600 font-extrabold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Link2 className="w-5 h-5" />
          </div>
          <span>PayLink</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/dashboard"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
              location.pathname === '/' || location.pathname === '/dashboard'
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            to="/create"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
              location.pathname === '/create'
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Create Link
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50/50 flex flex-col text-gray-800 font-sans">
        <Navbar />
        <main className="max-w-5xl mx-auto w-full px-4 py-8 flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateLink />} />
            <Route path="/pay/:slug" element={<PayPage />} />
          </Routes>
        </main>
        <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
          PayLink &copy; {new Date().getFullYear()} &bull; Fast, secure M-Pesa payment links
        </footer>
      </div>
    </BrowserRouter>
  );
}
