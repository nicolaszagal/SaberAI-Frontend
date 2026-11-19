import { useEffect, useState } from 'react';
import { descargarClipTocado } from '../../infrastructure/api/tocadosApi';

/**
 * URL de objeto del clip de un tocado (se descarga una sola vez por tocado y se libera al cambiar).
 *
 * Args:
 *   tocadoId: tocado a mostrar, o null.
 *   disponible: False si el clip ya no está en el Fog (se purga al cerrar la sesión).
 *
 * Returns:
 *   La URL para el `<video>`, o null mientras baja o si no hay clip.
 */
export function useClipTocado(tocadoId: string | null, disponible: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!tocadoId || !disponible) return undefined;
    let vivo = true;
    let objeto: string | null = null;
    descargarClipTocado(tocadoId)
      .then(u => { if (vivo) { objeto = u; setUrl(u); } else URL.revokeObjectURL(u); })
      .catch(() => { if (vivo) setUrl(null); });
    return () => { vivo = false; if (objeto) URL.revokeObjectURL(objeto); };
  }, [tocadoId, disponible]);
  return url;
}
