import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createPasswordResetToken, buildPasswordResetUrl } from '@/lib/tokens';
import { sendEmail } from '@/lib/email';

const schema = z.object({
  shopDomain: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { shopDomain, email } = parsed.data;

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const customer = await prisma.customer.findUnique({
      where: { shopId_email: { shopId: shop.id, email } },
    });

    // Always return success to avoid email enumeration
    if (!customer || !customer.passwordHash) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists, a reset link has been sent.',
      });
    }

    const token = await createPasswordResetToken(customer.id);
    const host = process.env.HOST || '';
    const resetUrl = buildPasswordResetUrl(token, host);

    await sendEmail({
      to: email,
      subject: 'Reset your password',
      html: `<p>Hello ${customer.firstName || ''},</p>
             <p>You requested a password reset. Click the link below to set a new password:</p>
             <p><a href="${resetUrl}">Reset Password</a></p>
             <p>Or copy and paste this URL: ${resetUrl}</p>
             <p>This link expires in 1 hour.</p>
             <p>If you didn't request this, you can safely ignore it.</p>`,
      text: `Hello ${customer.firstName || ''},\n\nYou requested a password reset. Visit:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore it.`,
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
