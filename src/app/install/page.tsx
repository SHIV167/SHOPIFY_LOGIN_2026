'use client';

import { useMemo, useState } from 'react';

export default function InstallPage() {
  const initialShop = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    return url.searchParams.get('shop') || '';
  }, []);

  const [shop, setShop] = useState(initialShop);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold text-gray-900">Install LoginRegister</h1>
        <p className="mt-2 text-gray-600">Enter your store domain to begin installation.</p>

        <form className="mt-6 space-y-4" method="GET" action="/api/shopify/auth">
          <div>
            <label className="block text-sm font-medium text-gray-700">Shop Domain</label>
            <input
              name="shop"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="your-store.myshopify.com"
              className="mt-1 block w-full rounded border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
          >
            Install App
          </button>
        </form>
      </div>
    </main>
  );
}
