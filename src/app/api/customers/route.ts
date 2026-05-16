import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateShopifyCustomer, deleteShopifyCustomer, findShopifyCustomerByEmail } from '@/lib/shopify-api';

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

    // Sync to Shopify (best effort)
    let shopifySync: { ok: boolean; reason?: string } = { ok: true };
    try {
      const shopifyPayload: Record<string, unknown> = {};
      if ('firstName' in data) shopifyPayload.first_name = data.firstName || null;
      if ('lastName' in data) shopifyPayload.last_name = data.lastName || null;
      if ('phone' in data) shopifyPayload.phone = data.phone || null;

      if (Object.keys(shopifyPayload).length > 0 && customer.shopifyCustomerId) {
        await updateShopifyCustomer(
          shop.shopifyDomain,
          shop.accessToken,
          Number(customer.shopifyCustomerId),
          shopifyPayload as any
        );
      } else if (Object.keys(shopifyPayload).length > 0) {
        // Try to find Shopify customer by email
        const shopifyCustomer = await findShopifyCustomerByEmail(
          shop.shopifyDomain,
          shop.accessToken,
          customer.email
        );
        if (shopifyCustomer) {
          await updateShopifyCustomer(
            shop.shopifyDomain,
            shop.accessToken,
            shopifyCustomer.id,
            shopifyPayload as any
          );
          // Store the Shopify customer ID for future updates
          await prisma.customer.update({
            where: { id },
            data: { shopifyCustomerId: String(shopifyCustomer.id) },
          });
        }
      }
    } catch (syncErr: any) {
      console.error('[PUT /api/customers] Shopify sync failed:', syncErr.message || syncErr);
      shopifySync = { ok: false, reason: syncErr.message || 'Shopify sync failed' };
    }

    return NextResponse.json({
      success: true,
      shopifySync,
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
        isActive: updated.isActive,
        lastLoginAt: updated.lastLoginAt,
        createdAt: updated.createdAt,
        provider: updated.provider,
      },
    });
  } catch (err) {
    console.error('Customer update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, shopDomain } = body;

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

    // Delete from Shopify first (best effort)
    let shopifySync: { ok: boolean; reason?: string } = { ok: true };
    try {
      if (customer.shopifyCustomerId) {
        await deleteShopifyCustomer(
          shop.shopifyDomain,
          shop.accessToken,
          Number(customer.shopifyCustomerId)
        );
      } else {
        const shopifyCustomer = await findShopifyCustomerByEmail(
          shop.shopifyDomain,
          shop.accessToken,
          customer.email
        );
        if (shopifyCustomer) {
          await deleteShopifyCustomer(
            shop.shopifyDomain,
            shop.accessToken,
            shopifyCustomer.id
          );
        }
      }
    } catch (syncErr: any) {
      console.error('[DELETE /api/customers] Shopify sync failed:', syncErr.message || syncErr);
      shopifySync = { ok: false, reason: syncErr.message || 'Shopify sync failed' };
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, shopifySync, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Customer delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
