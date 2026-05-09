'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ShopSettings {
  enableRegistration: boolean;
  enableSocialLogin: boolean;
  requireEmailVerification: boolean;
}

function EmbedContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || '';
  const oauthSuccess = searchParams.get('oauth_success');

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  // Fetch shop settings
  useEffect(() => {
    if (!shop) return;
    fetch(`/api/customers?shop=${encodeURIComponent(shop)}`)
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings ?? null);
        setSettingsLoading(false);
      })
      .catch(() => setSettingsLoading(false));
  }, [shop]);

  // Handle OAuth success on load
  useEffect(() => {
    if (oauthSuccess && shop) {
      setSuccess('Logged in with Google successfully!');
    }
  }, [oauthSuccess, shop]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setNeedsVerification(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain: shop, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.requiresVerification) {
          setNeedsVerification(true);
          setVerificationEmail(email);
        }
        setError(data.error || 'Login failed');
      } else {
        setSuccess('Logged in successfully!');
        localStorage.setItem('lr_customer', JSON.stringify(data.customer));
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain: shop, email, password, firstName, lastName, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else if (data.requiresVerification) {
        setSuccess(data.message || 'Please check your email to verify your account.');
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setPhone('');
      } else {
        setSuccess('Registered successfully!');
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setPhone('');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain: shop, email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Request failed');
      } else {
        setSuccess(data.message || 'If an account exists, a reset link has been sent.');
        setEmail('');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain: shop, email: verificationEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to resend');
      } else {
        setSuccess(data.message || 'Verification email sent.');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const googleLoginUrl = `/api/auth/oauth/google?shop=${encodeURIComponent(shop)}&redirectTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`;

  const showSocial = settings?.enableSocialLogin;

  if (settingsLoading) {
    return (
      <div className="w-full max-w-sm mx-auto p-4 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4">
      {/* Mode tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setMode('login'); setError(''); setSuccess(''); setNeedsVerification(false); }}
          className={`flex-1 py-2 text-sm font-medium rounded ${
            mode === 'login' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Login
        </button>
        {settings?.enableRegistration !== false && (
          <button
            onClick={() => { setMode('register'); setError(''); setSuccess(''); setNeedsVerification(false); }}
            className={`flex-1 py-2 text-sm font-medium rounded ${
              mode === 'register' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Register
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          {needsVerification && (
            <button
              onClick={handleResendVerification}
              className="ml-2 underline font-medium"
              disabled={loading}
            >
              Resend
            </button>
          )}
        </div>
      )}
      {success && <p className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

      {/* Social login */}
      {mode === 'login' && showSocial && (
        <>
          <a
            href={googleLoginUrl}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.85 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.86-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </a>
          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500">or</span>
            </div>
          </div>
        </>
      )}

      {/* Login form */}
      {mode === 'login' && (
        <form onSubmit={handleLoginSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setNeedsVerification(false); }}
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              Forgot password?
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : 'Login'}
          </button>
        </form>
      )}

      {/* Register form */}
      {mode === 'register' && (
        <form onSubmit={handleRegisterSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500"
          />
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : 'Register'}
          </button>
        </form>
      )}

      {/* Forgot password form */}
      {mode === 'forgot' && (
        <form onSubmit={handleForgotSubmit} className="space-y-3">
          <p className="text-sm text-gray-600">
            Enter your email and we will send you a link to reset your password.
          </p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            className="w-full rounded bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Back to Login
          </button>
        </form>
      )}
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm mx-auto p-4 text-center"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" /></div>}>
      <EmbedContent />
    </Suspense>
  );
}
