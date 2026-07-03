import { NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
  }

  const code = (body?.code || '').toString();
  const expected = process.env.ACCESS_CODE;

  if (!expected) {
    return NextResponse.json(
      { error: 'El servidor no tiene configurado ACCESS_CODE' },
      { status: 500 }
    );
  }

  // Validación en el servidor.
  if (code !== expected) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
