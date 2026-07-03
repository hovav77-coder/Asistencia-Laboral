import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE } from '@/lib/auth';

// El middleware corre en el runtime Edge; jose es compatible con Edge.
function getSecret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

async function isValid(token) {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await isValid(token);

  // Rutas de autenticación siempre permitidas (login/logout).
  if (pathname === '/api/login' || pathname === '/api/logout') {
    return NextResponse.next();
  }

  // Protección de las API routes: sin sesión válida -> 401.
  if (pathname.startsWith('/api/')) {
    if (!valid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Página de login: si ya hay sesión, redirige al inicio.
  if (pathname === '/login') {
    if (valid) return NextResponse.redirect(new URL('/', req.url));
    return NextResponse.next();
  }

  // Cualquier otra página requiere sesión válida.
  if (!valid) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a todo excepto estáticos de Next.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
