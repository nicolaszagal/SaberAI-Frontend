import { FOG_BASE_URL } from '../config';
import { expirarSesion, getToken } from './sesionToken';

/**
 * `fetch` hacia el Fog: único punto que agrega `Authorization: Bearer`.
 *
 * Ante un 401 con token enviado, borra la sesión y avisa a la interfaz (vuelve al login).
 *
 * Args:
 *   path: ruta del Fog, con la barra inicial (`/matches/config`).
 *   init: opciones de `fetch`.
 *
 * Returns:
 *   La respuesta tal cual; el llamador decide qué hacer con los errores.
 *
 * Raises:
 *   TypeError: si no hay conexión (error de red de `fetch`).
 */
export async function fogFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${FOG_BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401 && token) expirarSesion();
  return res;
}
