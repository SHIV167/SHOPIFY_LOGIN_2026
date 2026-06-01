import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  createEmailVerificationToken,
  buildVerificationUrl,
} from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import {
  createShopifyCustomer,
  findShopifyCustomerByEmail,
  ShopifyCustomerError,
} from "@/lib/shopify-api";

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
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { shopDomain, email, password, firstName, lastName, phone } =
      parsed.data;

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Check existing by email
    const existing = await prisma.customer.findUnique({
      where: { shopId_email: { shopId: shop.id, email } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Customer already exists" },
        { status: 409 },
      );
    }

    // If phone provided, ensure uniqueness
    if (phone) {
      const existingPhone = await prisma.customer.findFirst({
        where: { shopId: shop.id, phone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: "Phone number already registered" },
          { status: 409 },
        );
      }
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

    // Sync customer to Shopify (best effort - do not fail registration on sync error)
    let shopifySync: { ok: boolean; reason?: string; status?: number } = {
      ok: false,
    };
    let shopifyCustomerId: number | null = null;
    try {
      const existingShopify = await findShopifyCustomerByEmail(
        shop.shopifyDomain,
        shop.accessToken,
        email,
      ).catch(() => null);

      if (existingShopify) {
        shopifyCustomerId = existingShopify.id;
        shopifySync = { ok: true, reason: "already_exists" };
      } else {
        const created = await createShopifyCustomer(
          shop.shopifyDomain,
          shop.accessToken,
          {
            email,
            first_name: firstName,
            last_name: lastName,
            phone,
            verified_email: false,
            send_email_welcome: false,
          },
        );
        shopifyCustomerId = created.id;
        shopifySync = { ok: true };
      }

      // Store Shopify customer ID for future updates
      if (shopifyCustomerId) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { shopifyCustomerId: String(shopifyCustomerId) },
        });
      }

      // Attempt to create a Storefront customer access token (best effort)
      try {
        const storefrontToken = await createStorefrontCustomerAccessToken(
          shop.shopifyDomain,
          email,
          password,
        );
        if (storefrontToken) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { shopifyCustomerToken: storefrontToken },
          });
        }
      } catch (e) {
        // non-fatal
        console.warn("[register] storefront token creation failed", e);
      }
    } catch (shopifyErr) {
      const status =
        shopifyErr instanceof ShopifyCustomerError
          ? shopifyErr.status
          : undefined;
      const body =
        shopifyErr instanceof ShopifyCustomerError
          ? shopifyErr.body
          : String(shopifyErr);
      console.error("[register] Shopify sync failed for", email, {
        status,
        body,
      });
      let reason = body;
      if (status === 401 || status === 403) {
        reason =
          "Missing write_customers scope or invalid access token. Reinstall the app with write_customers scope.";
      }
      shopifySync = { ok: false, status, reason };
    }

    // Check if email verification is required
    const settings = await prisma.loginRegisterSettings.findUnique({
      where: { shopId: shop.id },
    });

    const requireVerification = settings?.requireEmailVerification ?? false;

    if (requireVerification) {
      const token = await createEmailVerificationToken(customer.id);
      const host = process.env.HOST || "";
      const verifyUrl = buildVerificationUrl(token, host);

      await sendEmail({
        to: email,
        subject:
          settings?.verificationEmailSubject || "Verify your email address",
        html: `<p>Hello ${firstName || ""},</p>
               <p>Please verify your email by clicking the link below:</p>
               <p><a href="${verifyUrl}">Verify Email</a></p>
               <p>Or copy and paste this URL: ${verifyUrl}</p>`,
        text: `Hello ${firstName || ""},\n\nPlease verify your email by visiting:\n${verifyUrl}`,
      });

      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message:
          "Registration successful. Please check your email to verify your account.",
        shopifySync,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
        },
      });
    }

    // Build a best-effort redirect URL to account/orders on the storefront
    const shopRoot = `https://${shop.shopifyDomain}`;
    const redirectTo = `${shopRoot}/account/orders`;

    return NextResponse.json({
      success: true,
      shopifySync,
      redirectTo,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
