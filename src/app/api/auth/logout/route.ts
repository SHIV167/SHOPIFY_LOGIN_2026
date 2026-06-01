import { NextResponse } from 'next/server';

export async function POST() {
  // Stateless logout: storefront clears localStorage; we just acknowledge.
  // If session cookies are added later, clear them here.
  const res = NextResponse.json({ success: true });
  res.cookies.set('lr_session', '', { path: '/', maxAge: 0 });
  return res;
}
