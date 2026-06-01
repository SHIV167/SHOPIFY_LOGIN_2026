'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AdminContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || '';
  const [customers, setCustomers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop) return;
    fetch(`/api/customers?shop=${encodeURIComponent(shop)}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.customers || []);
        setSettings(data.settings || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [shop]);

  const toggleSetting = (key: string) => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, ...updated }),
    }).catch(console.error);
  };

  if (!shop) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <p className="text-gray-600">Missing shop parameter.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900">LoginRegister Admin</h1>
        <p className="text-gray-600 mt-1">{shop}</p>

        {loading ? (
          <p className="mt-8 text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900">Settings</h2>
              <div className="mt-4 space-y-3">
                {settings && (
                  <>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.enableRegistration}
                        onChange={() => toggleSetting('enableRegistration')}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Enable Registration</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.enableSocialLogin}
                        onChange={() => toggleSetting('enableSocialLogin')}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Enable Social Login</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.enablePhoneLogin}
                        onChange={() => toggleSetting('enablePhoneLogin')}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Enable Phone Login (OTP)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.requireEmailVerification}
                        onChange={() => toggleSetting('requireEmailVerification')}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Require Email Verification</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900">Customers ({customers.length})</h2>
              {customers.length === 0 ? (
                <p className="mt-4 text-gray-500">No customers registered yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Phone</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Verified</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Last Login</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customers.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-2 text-gray-900">{c.email}</td>
                          <td className="px-4 py-2 text-gray-600">
                            {c.firstName} {c.lastName}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{c.phone || '-'}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                c.emailVerified
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {c.emailVerified ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center p-6 bg-gray-50"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" /></main>}>
      <AdminContent />
    </Suspense>
  );
}
