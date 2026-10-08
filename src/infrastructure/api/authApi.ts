import { FOG_BASE_URL } from '../config';
import { fogFetch } from './fogFetch';

/** Fallo de login con el mensaje listo para mostrar al usuario. */
export class LoginError extends Error {
  constructor(message: string, readonly status: number | null) {
    super(message);
    this.name = 'LoginError';
  }
}

/**
 * POST /auth/login. Devuelve el token de acceso.
 *
 * Args:
 *   usuario: nombre de usuario.
 *   password: contraseña.
 *
 * Returns:
 *   El `access_token` (JWT).
 *
 * Raises:
 *   LoginError: 401 (mensaje genérico, sin distinguir usuario o contraseña), 429 (espera),
 *     o cualquier otro fallo o falta de conexión.
 */
export async function login(usuario: string, password: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${FOG_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password }),
    });
  } catch {
    throw new LoginError('No se pudo conectar con el servidor.', null);
  }
  if (res.status === 401) throw new LoginError('Usuario o contraseña incorrectos.', 401);
  if (res.status === 429) {
    const seg = Number(res.headers.get('Retry-After'));
    const espera = Number.isFinite(seg) && seg > 0 ? ` Intente de nuevo en ${Math.ceil(seg / 60)} min.` : ' Intente más tarde.';
    throw new LoginError(`Demasiados intentos fallidos.${espera}`, 429);
  }
  if (!res.ok) throw new LoginError('No se pudo iniciar sesión. Intente de nuevo.', res.status);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new LoginError('No se pudo iniciar sesión. Intente de nuevo.', res.status);
  return body.access_token;
}

/**
 * GET /auth/me: valida la sesión con el token guardado.
 *
 * Returns:
 *   true si el token sirve; false si el Fog responde 401 (`fogFetch` ya borró la sesión).
 *
 * Raises:
 *   Error: si el Fog no responde o falla con otro código (la sesión no se descarta).
 */
export async function validarSesion(): Promise<boolean> {
  const res = await fogFetch('/auth/me');
  if (res.status === 401) return false;
  if (!res.ok) throw new Error(`Fog ${res.status}`);
  return true;
}
