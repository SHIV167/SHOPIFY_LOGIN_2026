import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createEmailVerificationToken, buildVerificationUrl } from '@/lib/tokens';
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

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (customer.emailVerified) {
      return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
    }

    const settings = await prisma.loginRegisterSettings.findUnique({
      where: { shopId: shop.id },
    });

    const token = await createEmailVerificationToken(customer.id);
    const host = process.env.HOST || '';
    const verifyUrl = buildVerificationUrl(token, host);

    await sendEmail({
      to: email,
      subject: settings?.verificationEmailSubject || 'Verify your email address',
      html: `<p>Hello ${customer.firstName || ''},</p>
             <p>Please verify your email by clicking the link below:</p>
             <p><a href="${verifyUrl}">Verify Email</a></p>
             <p>Or copy and paste this URL: ${verifyUrl}</p>`,
      text: `Hello ${customer.firstName || ''},\n\nPlease verify your email by visiting:\n${verifyUrl}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (err) {
    console.error('Resend verification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
