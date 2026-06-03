'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

function AdminContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || '';
  const [customers, setCustomers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const updateSetting = (key: string, value: any) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, ...updated }),
    }).catch(console.error);
  };

  const testSmtp = async () => {
    if (!settings) return;
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/settings/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: shop,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser,
          smtpPass: settings.smtpPass,
          smtpFromAddress: settings.smtpFromAddress,
          smtpFromName: settings.smtpFromName,
          smtpEncryption: settings.smtpEncryption,
        }),
      });
      const d = await res.json();
      setSmtpTestResult({ success: d.success, message: d.message || (d.success ? 'SMTP configuration is valid!' : 'SMTP test failed') });
      if (d.success) {
        toast.success('SMTP test successful!');
      } else {
        toast.error('SMTP test failed');
      }
    } catch (error: any) {
      setSmtpTestResult({ success: false, message: error.message || 'Network error' });
      toast.error('SMTP test failed');
    } finally {
      setTestingSmtp(false);
    }
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
              <h2 className="text-lg font-medium text-gray-900">SMTP Settings</h2>
              <div className="mt-4 space-y-4">
                {settings && (
                  <>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.smtpEnabled || false}
                        onChange={() => toggleSetting('smtpEnabled')}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Enable SMTP</span>
                    </label>
                    {settings.smtpEnabled && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Host</label>
                          <input
                            type="text"
                            value={settings.smtpHost || ''}
                            onChange={(e) => updateSetting('smtpHost', e.target.value)}
                            placeholder="smtp.gmail.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Port</label>
                          <input
                            type="number"
                            value={settings.smtpPort || 587}
                            onChange={(e) => updateSetting('smtpPort', parseInt(e.target.value) || 587)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                          <input
                            type="text"
                            value={settings.smtpUser || ''}
                            onChange={(e) => updateSetting('smtpUser', e.target.value)}
                            placeholder="you@gmail.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                          <input
                            type="password"
                            value={settings.smtpPass || ''}
                            onChange={(e) => updateSetting('smtpPass', e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">From Address</label>
                          <input
                            type="email"
                            value={settings.smtpFromAddress || ''}
                            onChange={(e) => updateSetting('smtpFromAddress', e.target.value)}
                            placeholder="no-reply@store.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">From Name</label>
                          <input
                            type="text"
                            value={settings.smtpFromName || ''}
                            onChange={(e) => updateSetting('smtpFromName', e.target.value)}
                            placeholder="My Store"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={settings.smtpEncryption || false}
                              onChange={() => toggleSetting('smtpEncryption')}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700">Enable TLS/SSL Encryption</span>
                          </label>
                        </div>
                        <div className="col-span-2 flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={testSmtp}
                            disabled={testingSmtp || !settings.smtpHost || !settings.smtpUser || !settings.smtpPass}
                            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition"
                          >
                            {testingSmtp ? 'Testing...' : 'Test SMTP Configuration'}
                          </button>
                          {smtpTestResult && (
                            <span className={`text-sm ${smtpTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                              {smtpTestResult.message}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
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
