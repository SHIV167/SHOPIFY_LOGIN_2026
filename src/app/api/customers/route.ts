import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopDomain = searchParams.get('shop');

    if (!shopDomain) {
      return NextResponse.json({ error: 'Missing shop' }, { status: 400 });
    }

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const customers = await prisma.customer.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
    });

    const settings = await prisma.loginRegisterSettings.findUnique({
      where: { shopId: shop.id },
    });

    return NextResponse.json({ customers, settings });
  } catch (err) {
    console.error('Customers fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, shopDomain, ...data } = body;

    if (!id || !shopDomain) {
      return NextResponse.json({ error: 'Missing id or shopDomain' }, { status: 400 });
    }

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const customer = await prisma.customer.findFirst({
      where: { id, shopId: shop.id },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Only allow updating safe profile fields
    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'avatarUrl',
      'address',
      'city',
      'state',
      'zipCode',
      'country',
    ];

    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in data) {
        updateData[key] = data[key] === '' ? null : data[key];
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
        address: updated.address,
        city: updated.city,
        state: updated.state,
        zipCode: updated.zipCode,
        country: updated.country,
        emailVerified: updated.emailVerified,
        phoneVerified: updated.phoneVerified,
        isActive: updated.isActive,
        lastLoginAt: updated.lastLoginAt,
        createdAt: updated.createdAt,
        provider: updated.provider,
        shopifyCustomerId: updated.shopifyCustomerId,
      },
    });
  } catch (err) {
    console.error('Customer update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
