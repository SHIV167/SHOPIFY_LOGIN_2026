import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shop, ...updates } = body;

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop' }, { status: 400 });
    }

    // Auto-create shop if not exists (no auth restriction)
    let existingShop = await prisma.shop.findUnique({
      where: { shopifyDomain: shop },
    });

    if (!existingShop) {
      existingShop = await prisma.shop.create({
        data: {
          shopifyDomain: shop,
          accessToken: '', // No OAuth required
          isActive: true,
          loginRegisterSettings: { create: {} },
        },
      });
    }

    const settings = await (prisma.loginRegisterSettings.upsert as any)({
      where: { shopId: existingShop.id },
      update: {
        enableRegistration: updates.enableRegistration,
        enableSocialLogin: updates.enableSocialLogin,
        enablePhoneLogin: updates.enablePhoneLogin,
        requireEmailVerification: updates.requireEmailVerification,
      },
      create: {
        shopId: existingShop.id,
        enableRegistration: updates.enableRegistration ?? true,
        enableSocialLogin: updates.enableSocialLogin ?? false,
        enablePhoneLogin: updates.enablePhoneLogin ?? false,
        requireEmailVerification: updates.requireEmailVerification ?? false,
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (err) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
