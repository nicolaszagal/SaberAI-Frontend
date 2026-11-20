import { useEffect, useState } from 'react';
import { getHealth } from '../../infrastructure/api/fogApi';

export type Conexion = 'verificando' | 'ok' | 'degradado' | 'sin_conexion';

const INTERVALO_MS = 10_000;

/** Consulta GET /health cada 10 s: `ok` si responden todos los componentes que informa (fog, redis o cloud, y postgres), `degradado` si alguno falla, `sin_conexion` si el Fog no responde. */
export function useHealth(): Conexion {
  const [estado, setEstado] = useState<Conexion>('verificando');

  useEffect(() => {
    let activo = true;
    const consultar = async () => {
      try {
        const h = await getHealth();
        const todoOk = Object.values(h).every(v => v === 'ok');
        if (activo) setEstado(todoOk ? 'ok' : 'degradado');
      } catch {
        if (activo) setEstado('sin_conexion');
      }
    };
    consultar();
    const id = setInterval(consultar, INTERVALO_MS);
    return () => { activo = false; clearInterval(id); };
  }, []);

  return estado;
}
