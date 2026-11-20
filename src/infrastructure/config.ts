/**
 * Nodo Fog: configuración de ejecución (DEPLOY11).
 *
 * Cada usuario trabaja con su propio Fog. La dirección ya no se fija al construir la imagen: el
 * usuario la escribe en el login ("Nodo Fog") y el navegador la recuerda en `localStorage`.
 * `EXPO_PUBLIC_FOG_URL` solo da el valor inicial en desarrollo y en pruebas; sin ella, el valor
 * inicial es `http://localhost:8001`.
 */

export const NODO_FOG_POR_DEFECTO = 'http://localhost:8001';
const CLAVE_NODO = 'sabre.nodoFog';

const MENSAJE_HTTP =
  'Solo se aceptan http://localhost, http://127.0.0.1 o direcciones https://. ' +
  'El navegador bloquea las llamadas http:// a otro equipo desde una página https:// (contenido mixto): ' +
  'use https:// o instale el Fog en este mismo equipo.';

export type NodoValidado = { ok: true; url: string } | { ok: false; mensaje: string };

/**
 * Valida y normaliza la dirección de un nodo Fog.
 *
 * Args:
 *   entrada: texto escrito por el usuario.
 *
 * Returns:
 *   `{ ok: true, url }` con la dirección normalizada (sin barra final) si es
 *   `http://localhost[:puerto]`, `http://127.0.0.1[:puerto]` o `https://...`; si no,
 *   `{ ok: false, mensaje }` con el motivo, listo para mostrar.
 */
export function validarNodoFog(entrada: string): NodoValidado {
  const texto = entrada.trim();
  if (!texto) return { ok: false, mensaje: 'Escriba la dirección del nodo Fog.' };
  let u: URL;
  try {
    u = new URL(texto);
  } catch {
    return { ok: false, mensaje: 'La dirección no es válida. Ejemplo: http://localhost:8001' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, mensaje: 'La dirección debe empezar por http://localhost o https://.' };
  }
  if (u.username || u.password) {
    return { ok: false, mensaje: 'La dirección no puede llevar usuario ni contraseña.' };
  }
  if ((u.pathname !== '/' && u.pathname !== '') || u.search || u.hash) {
    return { ok: false, mensaje: 'Escriba solo el origen, sin ruta (por ejemplo http://localhost:8001).' };
  }
  const loopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol === 'http:' && !loopback) return { ok: false, mensaje: MENSAJE_HTTP };
  return { ok: true, url: u.origin };
}

function almacen(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Valor inicial: la variable de desarrollo si existe, y si no `http://localhost:8001`. */
function valorInicial(): string {
  const env = (process.env.EXPO_PUBLIC_FOG_URL as string | undefined)?.trim();
  return env ? env.replace(/\/+$/, '') : NODO_FOG_POR_DEFECTO;
}

let nodoEnMemoria: string | null = null;

/**
 * Dirección del nodo Fog vigente.
 *
 * Returns:
 *   La recordada en `localStorage` si es válida; si no (o sin almacenamiento), la de esta sesión
 *   de la página o el valor inicial.
 */
export function getNodoFog(): string {
  if (nodoEnMemoria) return nodoEnMemoria;
  let guardado: string | null = null;
  try { guardado = almacen()?.getItem(CLAVE_NODO) ?? null; } catch { guardado = null; }
  if (guardado) {
    const v = validarNodoFog(guardado);
    if (v.ok) return v.url;
  }
  return valorInicial();
}

/**
 * Fija y recuerda el nodo Fog.
 *
 * Args:
 *   url: dirección ya validada con `validarNodoFog`.
 *
 * Funciona sin almacenamiento (queda solo en memoria).
 */
export function setNodoFog(url: string): void {
  nodoEnMemoria = url;
  try { almacen()?.setItem(CLAVE_NODO, url); } catch { /* sin almacenamiento: solo memoria */ }
}

/** True si el nodo es de este mismo equipo (`localhost` o `127.0.0.1`). */
export function esNodoLoopback(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1';
  } catch {
    return false;
  }
}

/** Opciones extra de `fetch` hacia un nodo local desde una página https (permiso de red local del navegador). */
export function opcionesRedLocal(url: string): RequestInit {
  const https = typeof location !== 'undefined' && location.protocol === 'https:';
  return https && esNodoLoopback(url) ? ({ targetAddressSpace: 'loopback' } as RequestInit) : {};
}

/**
 * Pista para cuando no se puede hablar con un Fog local desde una página https.
 *
 * Args:
 *   url: dirección del nodo Fog.
 *
 * Returns:
 *   Texto sobre el permiso de red local (Chrome, Edge, Firefox) y el bloqueo de Safari, o cadena
 *   vacía si el caso no aplica (la página no es https o el nodo no es local).
 */
export function pistaRedLocal(url: string): string {
  const https = typeof location !== 'undefined' && location.protocol === 'https:';
  if (!https || !esNodoLoopback(url) || !url.startsWith('http:')) return '';
  return ' Si el Fog está encendido, puede ser el navegador: Chrome, Edge y Firefox piden permiso para que esta página ' +
    'acceda a aplicaciones de su equipo (elija Permitir); Safari no permite que una página https:// hable con ' +
    'http://localhost (use Chrome, Edge o Firefox).';
}
