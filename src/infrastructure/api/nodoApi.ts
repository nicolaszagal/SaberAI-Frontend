import { opcionesRedLocal } from '../config';
import type { HealthResponse } from '../../domain/entities/Combate';

/** Resultado de "Probar conexión": `tipo` para la interfaz y `mensaje` listo para mostrar. */
export interface PruebaNodo {
  tipo: 'ok' | 'degradado' | 'error';
  mensaje: string;
}

const ESPERA_MS = 8000;
const NOMBRES: Record<string, string> = { redis: 'Redis', cloud: 'Cloud', postgres: 'la base de datos' };

/**
 * GET /health de un nodo Fog, sin token (la ruta es pública).
 *
 * Args:
 *   url: dirección ya validada con `validarNodoFog`.
 *
 * Returns:
 *   `ok` si responden Fog y lo que informa; `degradado` si Fog responde pero un componente no
 *   (se nombra); `error` si no se pudo hablar con el Fog, con las causas probables.
 */
export async function probarNodoFog(url: string): Promise<PruebaNodo> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MS);
  try {
    const res = await fetch(`${url}/health`, { ...opcionesRedLocal(url), signal: control.signal });
    let cuerpo: Partial<HealthResponse> | null = null;
    try { cuerpo = (await res.json()) as Partial<HealthResponse>; } catch { cuerpo = null; }
    if (!cuerpo || cuerpo.fog !== 'ok') {
      return { tipo: 'error', mensaje: 'Respondió algo que no es un Fog de SABRE.AI. Revise la dirección.' };
    }
    const caidos = Object.entries(cuerpo).filter(([k, v]) => k !== 'fog' && v !== 'ok').map(([k]) => NOMBRES[k] ?? k);
    if (res.ok && caidos.length === 0) return { tipo: 'ok', mensaje: 'Conectado: el Fog responde.' };
    return {
      tipo: 'degradado',
      mensaje: `El Fog responde, pero no responde ${caidos.join(' ni ') || 'uno de sus componentes'}. Puede iniciar sesión; el sistema estará limitado.`,
    };
  } catch {
    const remota = typeof location !== 'undefined' && location.protocol === 'https:' && /^http:\/\/(localhost|127\.0\.0\.1)/.test(url);
    return {
      tipo: 'error',
      mensaje: 'No se pudo conectar con el Fog. Compruebe que esté encendido en esa dirección' +
        (remota
          ? ' y que el navegador tenga permitido a esta página acceder a aplicaciones de su equipo (si apareció un aviso de "red local", elija Permitir).'
          : '.'),
    };
  } finally {
    clearTimeout(reloj);
  }
}
