import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { signHmacSha256Hex } from '@/lib/hmac';

export const dynamic = 'force-dynamic';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect('/embed?error=oauth_denied');
    }

    if (!code || !state) {
      return NextResponse.redirect('/embed?error=invalid_oauth');
    }

    // Verify state cookie
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.redirect('/embed?error=server_error');
    }

    const stateCookie = cookies().get('lr_oauth_state')?.value;
    if (!stateCookie) {
      return NextResponse.redirect('/embed?error=invalid_state');
    }

    const [shopDomain, cookieState, redirectTo, sig] = stateCookie.split('|');
    if (!shopDomain || !cookieState || !redirectTo || !sig) {
      return NextResponse.redirect('/embed?error=invalid_state');
    }

    const expectedSig = signHmacSha256Hex(secret, `${shopDomain}|${cookieState}|${redirectTo}`);
    if (sig !== expectedSig || cookieState !== state) {
      return NextResponse.redirect('/embed?error=invalid_state');
    }

    // Clear state cookie
    cookies().delete('lr_oauth_state');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const host = process.env.HOST;

    if (!clientId || !clientSecret || !host) {
      return NextResponse.redirect('/embed?error=server_error');
    }

    const redirectUri = `${host.replace(/\/$/, '')}/api/auth/oauth/callback`;

    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Google token exchange failed:', text);
      return NextResponse.redirect('/embed?error=oauth_failed');
    }

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      console.error('Google userinfo failed:', await userRes.text());
      return NextResponse.redirect('/embed?error=oauth_failed');
    }

    const user = (await userRes.json()) as GoogleUserInfo;

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });

    if (!shop) {
      return NextResponse.redirect('/embed?error=shop_not_found');
    }

    // Find existing customer by email first (to allow linking)
    let customer = await prisma.customer.findUnique({
      where: { shopId_email: { shopId: shop.id, email: user.email } },
    });

    if (customer) {
      // Link Google ID if not already linked
      if (!customer.providerId) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            provider: 'google',
            providerId: user.id,
            lastLoginAt: new Date(),
          },
        });
      } else {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { lastLoginAt: new Date() },
        });
      }
    } else {
      // Create new customer from Google profile
      customer = await prisma.customer.create({
        data: {
          shopId: shop.id,
          email: user.email,
          firstName: user.given_name,
          lastName: user.family_name,
          avatarUrl: user.picture,
          emailVerified: user.verified_email,
          provider: 'google',
          providerId: user.id,
          lastLoginAt: new Date(),
        },
      });
    }

    // Build redirect URL with success indicator
    const redirectBase = redirectTo.replace(/\/$/, '');
    const redirectUrl = `${redirectBase}?shop=${encodeURIComponent(shopDomain)}&oauth_success=1&email=${encodeURIComponent(user.email)}`;

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect('/embed?error=server_error');
  }
}
