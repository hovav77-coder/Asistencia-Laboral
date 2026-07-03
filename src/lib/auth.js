import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'asistencia_session';
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 horas en segundos

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Falta la variable de entorno SESSION_SECRET');
  }
  return new TextEncoder().encode(secret);
}

/** Crea un token de sesión firmado (JWT) válido por 12 horas. */
export async function createSessionToken() {
  return await new SignJWT({ auth: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

/** Verifica un token de sesión. Devuelve true si es válido y no ha expirado. */
export async function verifySessionToken(token) {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

/** Opciones estándar para la cookie de sesión httpOnly. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}
