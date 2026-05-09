import { randomToken } from './crypto';
import prisma from './prisma';

export async function createEmailVerificationToken(customerId: string): Promise<string> {
  const token = randomToken(32);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      emailVerifyToken: token,
      emailVerifyExpires: expires,
    },
  });

  return token;
}

export async function createPasswordResetToken(customerId: string): Promise<string> {
  const token = randomToken(32);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      resetToken: token,
      resetTokenExpires: expires,
    },
  });

  return token;
}

export function buildVerificationUrl(token: string, host: string): string {
  const base = host.replace(/\/$/, '');
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetUrl(token: string, host: string): string {
  const base = host.replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
