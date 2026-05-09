'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function EmbedPage() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || '';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body =
      mode === 'login'
        ? { shopDomain: shop, email, password }
        : { shopDomain: shop, email, password, firstName, lastName, phone };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setSuccess(mode === 'login' ? 'Logged in successfully!' : 'Registered successfully!');
        if (mode === 'login') {
          // Store customer in localStorage for theme usage
          localStorage.setItem('lr_customer', JSON.stringify(data.customer));
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('login')}
          className={`flex-1 py-2 text-sm font-medium rounded ${
            mode === 'login' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Login
        </button>
        <button
          onClick={() => setMode('register')}
          className={`flex-1 py-2 text-sm font-medium rounded ${
            mode === 'register' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Register
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded border-gray-300 px-3 py-2 text-sm"
            />
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border-gray-300 px-3 py-2 text-sm"
        />
        {mode === 'register' && (
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded border-gray-300 px-3 py-2 text-sm"
          />
        )}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>
    </div>
  );
}
