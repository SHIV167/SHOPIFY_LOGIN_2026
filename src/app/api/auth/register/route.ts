import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createEmailVerificationToken, buildVerificationUrl } from '@/lib/tokens';
import { sendEmail } from '@/lib/email';

const registerSchema = z.object({
  shopDomain: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { shopDomain, email, password, firstName, lastName, phone } = parsed.data;

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const existing = await prisma.customer.findUnique({
      where: { shopId_email: { shopId: shop.id, email } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Customer already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
      },
    });

    // Check if email verification is required
    const settings = await prisma.loginRegisterSettings.findUnique({
      where: { shopId: shop.id },
    });

    const requireVerification = settings?.requireEmailVerification ?? false;

    if (requireVerification) {
      const token = await createEmailVerificationToken(customer.id);
      const host = process.env.HOST || '';
      const verifyUrl = buildVerificationUrl(token, host);

      await sendEmail({
        to: email,
        subject: settings?.verificationEmailSubject || 'Verify your email address',
        html: `<p>Hello ${firstName || ''},</p>
               <p>Please verify your email by clicking the link below:</p>
               <p><a href="${verifyUrl}">Verify Email</a></p>
               <p>Or copy and paste this URL: ${verifyUrl}</p>`,
        text: `Hello ${firstName || ''},\n\nPlease verify your email by visiting:\n${verifyUrl}`,
      });

      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: 'Registration successful. Please check your email to verify your account.',
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
        },
      });
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
