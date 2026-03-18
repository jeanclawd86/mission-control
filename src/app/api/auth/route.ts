import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const expected = process.env.MC_SITE_PASSWORD;

    if (!expected || password !== expected) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const cookieValue = createHmac('sha256', expected)
      .update('mc_auth_token')
      .digest('hex');

    const response = NextResponse.json({ ok: true });
    response.cookies.set('mc_auth', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 100, // 100 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
