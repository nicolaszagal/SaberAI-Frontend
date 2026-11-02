import { useCallback, useEffect, useRef, useState } from 'react';
import { FogError } from '../../infrastructure/api/fogApi';

/** Estado de la carga bajo demanda de un dato de una revisión. */
export type EstadoCarga<T> =
  | { tipo: 'inactivo' }
  | { tipo: 'cargando' }
  | { tipo: 'listo'; dato: T }
  /** `status` es el código HTTP del Fog y `codigo` el de sus 409; null si no hubo respuesta. */
  | { tipo: 'error'; mensaje: string; status: number | null; codigo: string | null };

/**
 * Carga bajo demanda de un dato por revisión (pose, razonamiento). Llama a `cargar` solo cuando
 * `activo` pasa a `true` y guarda las respuestas por revisión mientras el componente que usa el
 * hook siga montado: reabrir el modal no vuelve a pedirlas. Los errores no se guardan, así que
 * `reintentar` sí consulta de nuevo.
 *
 * Args:
 *   cargar: pide el dato al Fog; debe ser una función estable (no se vuelve a evaluar al renderizar).
 *   revisionId: revisión de la que se pide el dato; null = ninguna.
 *   activo: si el modal está abierto.
 *
 * Returns:
 *   El estado de la carga, el dato guardado de la revisión (aunque `activo` sea false) y `reintentar`.
 */
export function useCargaPorRevision<T>(
  cargar: (revisionId: string) => Promise<T>, revisionId: string | null, activo: boolean,
): { estado: EstadoCarga<T>; guardado: T | null; reintentar: () => void } {
  const cache = useRef(new Map<string, T>());
  const enVuelo = useRef(new Set<string>());
  const [recibido, setRecibido] = useState<Record<string, EstadoCarga<T>>>({});
  const [intento, setIntento] = useState(0);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    if (!activo || !revisionId || cache.current.has(revisionId) || enVuelo.current.has(revisionId)) return;
    const id = revisionId;
    enVuelo.current.add(id);
    setRecibido(r => ({ ...r, [id]: { tipo: 'cargando' } }));
    cargarRef.current(id)
      .then(dato => {
        cache.current.set(id, dato);
        setRecibido(r => ({ ...r, [id]: { tipo: 'listo', dato } }));
      })
      .catch(e => {
        const mensaje = e instanceof Error ? e.message : 'No se pudo leer el dato';
        setRecibido(r => ({
          ...r,
          [id]: {
            tipo: 'error', mensaje,
            status: e instanceof FogError ? e.status : null,
            codigo: e instanceof FogError ? e.codigo : null,
          },
        }));
      })
      .finally(() => { enVuelo.current.delete(id); });
  }, [activo, revisionId, intento]);

  const reintentar = useCallback(() => setIntento(n => n + 1), []);

  const guardado = revisionId ? cache.current.get(revisionId) ?? null : null;
  let estado: EstadoCarga<T> = { tipo: 'inactivo' };
  if (revisionId) {
    estado = guardado !== null
      ? { tipo: 'listo', dato: guardado }
      : recibido[revisionId] ?? (activo ? { tipo: 'cargando' } : estado);
  }
  return { estado, guardado, reintentar };
}
