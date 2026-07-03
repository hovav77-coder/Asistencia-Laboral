import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from './auth';

/**
 * Verifica la sesión dentro de una API route (defensa en profundidad,
 * además del middleware). Devuelve true si la cookie es válida.
 */
export async function isAuthenticated() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}
