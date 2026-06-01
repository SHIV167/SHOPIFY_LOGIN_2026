/**
 * SMS / OTP Sender
 * Supports: twilio, console (dev fallback)
 */

interface SendSMSOptions {
  to: string;
  body: string;
}

export async function sendSMS({ to, body }: SendSMSOptions): Promise<{ ok: boolean; error?: string }> {
  const provider = process.env.SMS_PROVIDER || 'console';

  if (provider === 'twilio') {
    const sid = process.env.TWILIO_SID || '';
    const token = process.env.TWILIO_AUTH_TOKEN || '';
    const from = process.env.TWILIO_PHONE_NUMBER || '';

    if (!sid || !token || !from) {
      console.warn('[SMS] Twilio credentials missing');
      return { ok: false, error: 'Twilio credentials missing' };
    }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: from, To: to, Body: body }),
        }
      );
      if (!res.ok) {
        const data = await res.text();
        console.error('[SMS] Twilio error:', data);
        return { ok: false, error: data };
      }
      return { ok: true };
    } catch (e) {
      console.error('[SMS] Twilio exception:', e);
      return { ok: false, error: String(e) };
    }
  }

  // Fallback: log to console in development
  console.log(`[SMS] TO: ${to} | BODY: ${body}`);
  return { ok: true };
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
