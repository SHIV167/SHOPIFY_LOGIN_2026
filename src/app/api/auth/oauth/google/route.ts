import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomToken } from '@/lib/crypto';
import { signHmacSha256Hex } from '@/lib/hmac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = searchParams.get('shop') || '';
    const redirectTo = searchParams.get('redirectTo') || '/';

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const host = process.env.HOST;
    const secret = process.env.JWT_SECRET;

    if (!clientId) {
      return NextResponse.json({ error: 'Google OAuth is not configured' }, { status: 500 });
    }
    if (!host || !secret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const state = randomToken(16);
    const sig = signHmacSha256Hex(secret, `${shop}|${state}|${redirectTo}`);
    const stateValue = `${shop}|${state}|${redirectTo}|${sig}`;

    cookies().set('lr_oauth_state', stateValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    const redirectUri = `${host.replace(/\/$/, '')}/api/auth/oauth/callback`;

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'select_account');

    return NextResponse.redirect(url.toString());
  } catch (err) {
    console.error('OAuth initiate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
