import { NextRequest } from 'next/server';

export function validateAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const expected = process.env.MC_API_KEY;
  if (!expected) return false;
  return token === expected;
}
