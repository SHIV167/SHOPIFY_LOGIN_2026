type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const provider = process.env.EMAIL_PROVIDER || 'console';

  if (provider === 'resend') {
    return sendWithResend(payload);
  }

  if (provider === 'sendgrid') {
    return sendWithSendGrid(payload);
  }

  if (provider === 'ses') {
    return sendWithSES(payload);
  }

  // Default: log to console (development)
  console.log('--- EMAIL (console mode) ---');
  console.log(`To: ${payload.to}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`Text: ${payload.text || ''}`);
  console.log(`HTML: ${payload.html.substring(0, 500)}...`);
  console.log('--------------------------');
  return { success: true };
}

async function sendWithResend(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Resend error: ${text}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendWithSendGrid(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { success: false, error: 'SENDGRID_API_KEY or EMAIL_FROM is not configured' };
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: { email: from },
        subject: payload.subject,
        content: [
          { type: 'text/plain', value: payload.text || '' },
          { type: 'text/html', value: payload.html },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `SendGrid error: ${text}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendWithSES(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  // AWS SES requires the AWS SDK or Signature V4 signing.
  // For a lightweight approach without the full SDK, we leave this as a stub
  // that the user can fill in with their preferred SES integration.
  console.warn('AWS SES email provider is configured but not fully implemented. Falling back to console.');
  console.log('--- EMAIL (SES stub) ---');
  console.log(`To: ${payload.to}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`HTML: ${payload.html.substring(0, 500)}...`);
  return { success: true };
}
