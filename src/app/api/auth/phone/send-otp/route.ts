import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSMS, generateOTP } from '@/lib/sms';
import { z } from 'zod';

const schema = z.object({
  shopDomain: z.string().min(1),
  phone: z.string().min(10).max(15),
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

    const { shopDomain, phone } = parsed.data;

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const settings = await prisma.loginRegisterSettings.findUnique({
      where: { shopId: shop.id },
    });

    if (!settings?.enablePhoneLogin) {
      return NextResponse.json(
        { error: 'Phone login is not enabled for this store' },
        { status: 403 }
      );
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert customer by phone (create if not exists so OTP works for both login and register)
    const existing = await prisma.customer.findFirst({
      where: { shopId: shop.id, phone },
    });

    if (existing) {
      await (prisma.customer.update as any)({
        where: { id: existing.id },
        data: { phoneOtp: otp, phoneOtpExpires: expires },
      });
    } else {
      await (prisma.customer.create as any)({
        data: {
          shopId: shop.id,
          email: `${phone}@phone.user`, // placeholder email until user provides real one
          phone,
          phoneOtp: otp,
          phoneOtpExpires: expires,
        },
      });
    }

    const smsResult = await sendSMS({
      to: phone,
      body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
    });

    if (!smsResult.ok) {
      console.error('[send-otp] SMS failed:', smsResult.error);
      // Still return success in dev so frontend can test with console OTP
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Failed to send OTP. Please try again.' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      // In development, return OTP so frontend can display it when SMS provider is console
      ...(process.env.NODE_ENV !== 'production' && process.env.SMS_PROVIDER !== 'twilio'
        ? { devOtp: otp }
        : {}),
    });
  } catch (err) {
    console.error('[send-otp] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
