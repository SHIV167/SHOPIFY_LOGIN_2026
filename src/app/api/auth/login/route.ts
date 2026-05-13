import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createShopifyCustomer } from '@/lib/shopify-api';

const loginSchema = z.object({
  shopDomain: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { shopDomain, email, password } = parsed.data;

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const customer = await prisma.customer.findUnique({
      where: { shopId_email: { shopId: shop.id, email } },
    });

    if (!customer || !customer.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if email verification is required
    const settings = await prisma.loginRegisterSettings.findUnique({
      where: { shopId: shop.id },
    });

    if (settings?.requireEmailVerification && !customer.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in.', requiresVerification: true },
        { status: 403 }
      );
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    // Best-effort sync to Shopify (may already exist)
    try {
      await createShopifyCustomer(shop.shopifyDomain, shop.accessToken, {
        email: customer.email,
        first_name: customer.firstName || undefined,
        last_name: customer.lastName || undefined,
        phone: customer.phone || undefined,
        verified_email: customer.emailVerified,
        send_email_welcome: false,
      });
    } catch (e) {
      // Ignore duplicate or other Shopify errors but log for diagnosis
      console.warn('[login] Shopify sync skipped:', (e as Error).message);
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        emailVerified: customer.emailVerified,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
