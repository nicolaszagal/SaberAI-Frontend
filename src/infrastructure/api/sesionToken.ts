/**
 * Almacén del token de sesión (DEPLOY06).
 *
 * El token vive en memoria y en `sessionStorage` (se pierde al cerrar la pestaña).
 * Nunca en `localStorage`, cookies legibles ni en la URL.
 */

const CLAVE = 'sabre.token';

type Oyente = () => void;

let token: string | null = null;
let cargado = false;
const oyentesExpiracion = new Set<Oyente>();

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Devuelve el token vigente (memoria; si no, `sessionStorage`) o null. */
export function getToken(): string | null {
  if (!cargado) {
    cargado = true;
    try { token = storage()?.getItem(CLAVE) ?? null; } catch { token = null; }
  }
  return token;
}

/** Guarda el token en memoria y en `sessionStorage`. */
export function setToken(nuevo: string): void {
  token = nuevo;
  cargado = true;
  try { storage()?.setItem(CLAVE, nuevo); } catch { /* sin storage: solo memoria */ }
}

/** Borra el token de memoria y de `sessionStorage`. */
export function clearToken(): void {
  token = null;
  cargado = true;
  try { storage()?.removeItem(CLAVE); } catch { /* sin storage */ }
}

/**
 * Registra un oyente para cuando el Fog rechaza el token (401).
 *
 * Returns:
 *   Función que cancela el registro.
 */
export function alExpirarSesion(oyente: Oyente): () => void {
  oyentesExpiracion.add(oyente);
  return () => { oyentesExpiracion.delete(oyente); };
}

/** Borra el token y avisa a los oyentes: la interfaz vuelve al login. */
export function expirarSesion(): void {
  clearToken();
  oyentesExpiracion.forEach(o => o());
}
