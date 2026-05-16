import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  createShopifyCustomer,
  findShopifyCustomerByEmail,
  createStorefrontCustomerAccessToken,
} from '@/lib/shopify-api';
import { z } from 'zod';

const schema = z.object({
  shopDomain: z.string().min(1),
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
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

    const { shopDomain, phone, otp, firstName, lastName, email } = parsed.data;

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const customer = (await prisma.customer.findFirst({
      where: { shopId: shop.id, phone },
    })) as any;

    if (!customer || !customer.phoneOtp || !customer.phoneOtpExpires) {
      return NextResponse.json({ error: 'Invalid request. Please request a new OTP.' }, { status: 400 });
    }

    if (new Date() > customer.phoneOtpExpires) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    if (customer.phoneOtp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 401 });
    }

    // Update customer (mark phone verified, clear OTP, update profile if provided)
    const updateData: any = {
      phoneVerified: true,
      phoneOtp: null,
      phoneOtpExpires: null,
      lastLoginAt: new Date(),
    };

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    // Update placeholder email if user provided a real one
    if (email && customer.email === `${phone}@phone.user`) {
      updateData.email = email;
    }

    await (prisma.customer.update as any)({
      where: { id: customer.id },
      data: updateData,
    });

    // Sync / create Shopify customer via Admin API
    let shopifyCustomerId: string | undefined;
    try {
      const existingShopify = await findShopifyCustomerByEmail(
        shop.shopifyDomain,
        shop.accessToken,
        updateData.email || customer.email
      ).catch(() => null);

      if (existingShopify) {
        shopifyCustomerId = String(existingShopify.id);
      } else {
        const created = await createShopifyCustomer(shop.shopifyDomain, shop.accessToken, {
          email: updateData.email || customer.email,
          first_name: firstName || customer.firstName || undefined,
          last_name: lastName || customer.lastName || undefined,
          phone,
          verified_email: true,
          send_email_welcome: false,
        });
        shopifyCustomerId = String(created.id);
      }
    } catch (e) {
      console.warn('[verify-otp] Shopify Admin sync skipped:', (e as Error).message);
    }

    // Generate Shopify Storefront customer access token (for non-Plus checkout sync)
    let shopifyCustomerToken: string | undefined;
    if (shopifyCustomerId) {
      try {
        const storefrontToken = await createStorefrontCustomerAccessToken(
          shop.shopifyDomain,
          updateData.email || customer.email,
          otp // For phone-only customers, OTP acts as temporary password
        );
        shopifyCustomerToken = storefrontToken;
      } catch (e) {
        console.warn('[verify-otp] Storefront token creation failed:', (e as Error).message);
      }
    }

    // Save Shopify IDs back to our DB
    if (shopifyCustomerId || shopifyCustomerToken) {
      await (prisma.customer.update as any)({
        where: { id: customer.id },
        data: {
          ...(shopifyCustomerId ? { shopifyCustomerId } : {}),
          ...(shopifyCustomerToken ? { shopifyCustomerToken } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: updateData.email || customer.email,
        firstName: firstName || customer.firstName,
        lastName: lastName || customer.lastName,
        phone: customer.phone,
        phoneVerified: true,
        shopifyCustomerId: shopifyCustomerId || customer.shopifyCustomerId || null,
        shopifyCustomerToken: shopifyCustomerToken || customer.shopifyCustomerToken || null,
      },
    });
  } catch (err) {
    console.error('[verify-otp] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
