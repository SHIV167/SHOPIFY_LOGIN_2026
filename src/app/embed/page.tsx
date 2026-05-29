'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ShopSettings {
  enableRegistration: boolean;
  enableSocialLogin: boolean;
  enablePhoneLogin: boolean;
  requireEmailVerification: boolean;
}

function EmbedContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || '';
  const oauthSuccess = searchParams.get('oauth_success');

  const urlMode = searchParams.get('mode') as 'login' | 'register' | 'forgot' | 'profile' | null;
  const validMode = urlMode && ['login', 'register', 'forgot', 'profile'].includes(urlMode) ? urlMode : 'login';
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'customers' | 'profile' | 'phone'>(validMode);
  const [profile, setProfile] = useState<any>(null);
  const isAdmin = !!(searchParams.get('host') || searchParams.get('embedded'));
  const [customers, setCustomers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpStep, setOtpStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [profileEdit, setProfileEdit] = useState<any>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch shop settings and customers
  useEffect(() => {
    if (!shop) return;
    fetch(`/api/customers?shop=${encodeURIComponent(shop)}`)
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings ?? null);
        setCustomers(data.customers || []);
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

  // Auto-resize iframe and notify parent on login success
  useEffect(() => {
    const postResize = () => {
      const height = document.documentElement.scrollHeight || document.body.scrollHeight;
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'lr_resize', height }, '*');
      }
    };
    postResize();
    const timer = setTimeout(postResize, 300);
    return () => clearTimeout(timer);
  }, [mode, error, success, settings, customers, profileEdit]);

  useEffect(() => {
    if (success && success.includes('Logged in successfully') && window.parent !== window) {
      const customer = localStorage.getItem('lr_customer');
      window.parent.postMessage({ type: 'lr_login_success', customer: customer ? JSON.parse(customer) : null }, '*');
    }
  }, [success]);

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
        let msg = data.message || 'Please check your email to verify your account.';
        if (data.shopifySync && data.shopifySync.ok === false) {
          msg += ` (Shopify sync warning: ${data.shopifySync.reason || 'failed'})`;
        }
        setSuccess(msg);
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setPhone('');
        // Switch to login mode after registration
        setMode('login');
      } else {
        let msg = 'Registered successfully!';
        if (data.shopifySync && data.shopifySync.ok === false) {
          msg += ` Note: Shopify customer sync failed (${data.shopifySync.reason || 'unknown error'}).`;
        }
        setSuccess(msg);
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setPhone('');
        // Switch to login mode after registration
        setMode('login');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    } finally {
      setLoading(false);
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'lr_logout' }, '*');
      }
    }
  };

  const startProfileEdit = () => {
    setProfileEdit({ ...profile });
    setProfileError('');
    setProfileSuccess('');
  };

  const cancelProfileEdit = () => {
    setProfileEdit(null);
    setProfileError('');
    setProfileSuccess('');
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile.id, shopDomain: shop, ...profileEdit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Update failed');
      } else {
        setProfile(data.customer);
        localStorage.setItem('lr_customer', JSON.stringify(data.customer));
        setProfileSuccess('Profile updated successfully!');
        setProfileEdit(null);
      }
    } catch {
      setProfileError('Network error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain: shop, customerId: profile.id, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password');
      } else {
        setPasswordSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowChangePassword(false), 1500);
      }
    } catch {
      setPasswordError('Network error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile.id, shopDomain: shop }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Failed to delete account');
      } else {
        localStorage.removeItem('lr_customer');
        setProfile(null);
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'lr_logout' }, '*');
        }
      }
    } catch {
      setProfileError('Network error');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Load profile from query if in profile mode
  useEffect(() => {
    if (mode !== 'profile') return;
    const raw = searchParams.get('customer');
    if (raw) {
      try { setProfile(JSON.parse(decodeURIComponent(raw))); } catch { /* noop */ }
    } else if (window.parent !== window) {
      // Ask parent to send stored customer
      window.parent.postMessage({ type: 'lr_request_customer' }, '*');
    }
  }, [mode, searchParams]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data && e.data.type === 'lr_customer_data' && e.data.customer) {
        setProfile(e.data.customer);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain: shop, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send OTP');
      } else {
        setSuccess(data.message || 'OTP sent');
        setOtpSent(true);
        setOtpStep('otp');
        if (data.devOtp) {
          console.log('[dev] OTP:', data.devOtp);
          setSuccess(`OTP sent. Dev OTP: ${data.devOtp}`);
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: shop,
          phone,
          otp,
          firstName,
          lastName,
          email,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid OTP');
      } else {
        setSuccess('Logged in successfully!');
        localStorage.setItem('lr_customer', JSON.stringify(data.customer));
        setOtpStep('phone');
        setOtp('');
        setOtpSent(false);
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

  if (mode === 'profile') {
    const initials = profile
      ? [profile.firstName, profile.lastName]
          .filter(Boolean)
          .map((n: string) => n[0])
          .join('')
          .toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'
      : '?';

    const formatDate = (d: string | null) => {
      if (!d) return '—';
      return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const InfoRow = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
      <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
        <span className="text-gray-500 text-sm">{label}</span>
        {children || <span className="text-gray-900 text-sm font-medium text-right">{value || '—'}</span>}
      </div>
    );

    return (
      <div className="w-full max-w-md mx-auto p-4">
        {!profile ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900" />
            <p className="ml-3 text-sm text-gray-500">Loading profile…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header / Avatar */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl font-semibold overflow-hidden">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'My Account'}
                </h2>
                <p className="text-sm text-gray-500 truncate">{profile.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {profile.emailVerified ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Email Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700">Email Unverified</span>
                  )}
                  {profile.provider && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">{profile.provider}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Alerts */}
            {profileError && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</div>}
            {profileSuccess && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{profileSuccess}</div>}

            {/* Edit Form */}
            {profileEdit ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Edit Profile</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                      <input
                        type="text"
                        value={profileEdit.firstName || ''}
                        onChange={(e) => setProfileEdit({ ...profileEdit, firstName: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={profileEdit.lastName || ''}
                        onChange={(e) => setProfileEdit({ ...profileEdit, lastName: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profileEdit.phone || ''}
                      onChange={(e) => setProfileEdit({ ...profileEdit, phone: e.target.value })}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                    <input
                      type="text"
                      value={profileEdit.address || ''}
                      onChange={(e) => setProfileEdit({ ...profileEdit, address: e.target.value })}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                      <input
                        type="text"
                        value={profileEdit.city || ''}
                        onChange={(e) => setProfileEdit({ ...profileEdit, city: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                      <input
                        type="text"
                        value={profileEdit.state || ''}
                        onChange={(e) => setProfileEdit({ ...profileEdit, state: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ZIP Code</label>
                      <input
                        type="text"
                        value={profileEdit.zipCode || ''}
                        onChange={(e) => setProfileEdit({ ...profileEdit, zipCode: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                      <input
                        type="text"
                        value={profileEdit.country || ''}
                        onChange={(e) => setProfileEdit({ ...profileEdit, country: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex-1 rounded bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelProfileEdit}
                    disabled={profileSaving}
                    className="flex-1 rounded bg-gray-100 text-gray-700 py-2.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Personal Info Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
                    <button
                      onClick={startProfileEdit}
                      className="text-xs font-medium text-gray-700 hover:text-gray-900 underline"
                    >
                      Edit
                    </button>
                  </div>
                  <InfoRow label="Full Name" value={[profile.firstName, profile.lastName].filter(Boolean).join(' ')} />
                  <InfoRow label="Email" value={profile.email} />
                  <InfoRow label="Phone" value={profile.phone} />
                </div>

                {/* Address Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Address</h3>
                  <InfoRow label="Street" value={profile.address} />
                  <InfoRow label="City" value={profile.city} />
                  <InfoRow label="State" value={profile.state} />
                  <InfoRow label="ZIP Code" value={profile.zipCode} />
                  <InfoRow label="Country" value={profile.country} />
                </div>

                {/* Account Info Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Account</h3>
                  <InfoRow label="Member Since" value={formatDate(profile.createdAt)} />
                  <InfoRow label="Last Login" value={formatDate(profile.lastLoginAt)} />
                  <InfoRow label="Account Status" value={profile.isActive ? 'Active' : 'Inactive'} />
                  <InfoRow label="Login Method">
                    <span className="text-sm font-medium text-gray-900 capitalize">{profile.provider || 'Email & Password'}</span>
                  </InfoRow>
                </div>

                {/* Security Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Security</h3>
                  {!showChangePassword ? (
                    <button
                      onClick={() => { setShowChangePassword(true); setPasswordError(''); setPasswordSuccess(''); }}
                      className="w-full text-left text-sm text-gray-700 hover:text-gray-900 font-medium py-2 border-b border-gray-100 last:border-0"
                    >
                      Change Password →
                    </button>
                  ) : (
                    <form onSubmit={handleChangePassword} className="space-y-3">
                      {passwordError && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError}</div>}
                      {passwordSuccess && <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{passwordSuccess}</div>}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                          required
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={passwordSaving}
                          className="flex-1 rounded bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                        >
                          {passwordSaving ? 'Saving…' : 'Update Password'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowChangePassword(false)}
                          disabled={passwordSaving}
                          className="flex-1 rounded bg-gray-100 text-gray-700 py-2 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-lg border border-red-200 p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-3">Danger Zone</h3>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full text-left text-sm text-red-600 hover:text-red-800 font-medium py-2"
                    >
                      Delete Account →
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-red-600">Are you sure? This action cannot be undone. All your data will be permanently deleted.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteLoading}
                          className="flex-1 rounded bg-red-600 text-white py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleteLoading ? 'Deleting…' : 'Yes, Delete My Account'}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={deleteLoading}
                          className="flex-1 rounded bg-gray-100 text-gray-700 py-2 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={startProfileEdit}
                    className="flex-1 rounded bg-gray-900 text-white py-2.5 text-sm font-medium hover:bg-gray-800"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="flex-1 rounded bg-gray-100 text-gray-700 py-2.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                  >
                    {loading ? 'Logging out…' : 'Logout'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4">
      {/* Mode tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => { setMode('login'); setError(''); setSuccess(''); setNeedsVerification(false); }}
          className={`flex-1 py-2 text-sm font-medium rounded ${
            mode === 'login' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Login
        </button>
        {settings?.enablePhoneLogin && (
          <button
            onClick={() => { setMode('phone'); setError(''); setSuccess(''); setOtpStep('phone'); setOtp(''); setOtpSent(false); }}
            className={`flex-1 py-2 text-sm font-medium rounded ${
              mode === 'phone' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Phone
          </button>
        )}
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
        {isAdmin && (
          <button
            onClick={() => { setMode('customers'); setError(''); setSuccess(''); setNeedsVerification(false); }}
            className={`flex-1 py-2 text-sm font-medium rounded ${
              mode === 'customers' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Customers
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

      {/* Phone login form */}
      {mode === 'phone' && (
        <div className="space-y-3">
          {otpStep === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <p className="text-sm text-gray-600">
                Enter your phone number and we will send you a verification code.
              </p>
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {otpStep === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <p className="text-sm text-gray-600">
                Enter the 6-digit code sent to {phone}.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full rounded border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-gray-500 tracking-widest text-center text-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => { setOtpStep('phone'); setOtp(''); setError(''); setSuccess(''); }}
                  className="rounded bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Resend OTP
              </button>
            </form>
          )}
        </div>
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

      {/* Customers list (admin only) */}
      {mode === 'customers' && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            {customers.length} customer{customers.length !== 1 ? 's' : ''} registered
          </p>
          {customers.length === 0 ? (
            <p className="text-sm text-gray-500">No customers yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-700">Email</th>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-700">Name</th>
                    <th className="px-2 py-1.5 text-left font-medium text-gray-700">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="px-2 py-1.5 text-gray-900">{c.email}</td>
                      <td className="px-2 py-1.5 text-gray-600">{c.firstName} {c.lastName}</td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                          c.emailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {c.emailVerified ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
