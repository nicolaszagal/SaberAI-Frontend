import { useEffect, useState } from 'react';

/**
 * Segundos transcurridos desde `inicio` (ms epoch), actualizados cada 250 ms.
 *
 * Args:
 *   inicio: instante de arranque, o null si no hay nada en curso.
 *
 * Returns:
 *   Segundos enteros transcurridos (0 si `inicio` es null).
 */
export function useTranscurrido(inicio: number | null): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (inicio == null) return;
    setAhora(Date.now());
    const id = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(id);
  }, [inicio]);
  return inicio == null ? 0 : Math.max(0, Math.floor((ahora - inicio) / 1000));
}
