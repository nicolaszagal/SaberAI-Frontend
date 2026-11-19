import { fogFetch } from './fogFetch';
import { errorDeRespuesta } from './fogApi';

export interface SesionCerrada {
  respaldo: string;
  clipsBorrados: number;
}

/**
 * POST /sesion/cerrar: respaldo verificado (sin clips) y, solo si pasa, purga de los clips de la sesión.
 *
 * Args:
 *   matchId: combate cuya sesión (evento) se cierra.
 *
 * Raises:
 *   FogError: 404 (`combate_inexistente`) si el combate no existe; 500 (`respaldo_fallido`) si el respaldo
 *     falló, con la salida del respaldo en `detalle`: en ese caso no se borró nada.
 */
export async function cerrarSesionValidacion(matchId: string): Promise<SesionCerrada> {
  const res = await fogFetch('/sesion/cerrar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match_id: matchId }),
  });
  if (!res.ok) throw await errorDeRespuesta(res);
  const j = (await res.json()) as { respaldo: string; clips_borrados: number };
  return { respaldo: j.respaldo, clipsBorrados: j.clips_borrados };
}
