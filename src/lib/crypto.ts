import { randomBytes } from 'crypto';

export function randomToken(length = 32): string {
  return randomBytes(length).toString('hex');
}
