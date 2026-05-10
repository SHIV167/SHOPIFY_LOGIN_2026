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
