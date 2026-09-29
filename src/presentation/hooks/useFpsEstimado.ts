import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Cuadros que se miden para estimar los fps del clip. */
const MUESTRAS = 8;
/** Tiempo máximo de la medición (ms). */
const LIMITE_MS = 5000;

/**
 * Estima los fps de un clip midiendo el tiempo entre cuadros consecutivos
 * (`requestVideoFrameCallback`) en un reproductor oculto, sin tocar el visible.
 *
 * No supone ningún valor: si el navegador no lo soporta o el clip no se puede
 * reproducir, devuelve null y el avance por cuadro queda deshabilitado.
 *
 * Args:
 *   src: URL del clip (object URL) o null.
 *
 * Returns:
 *   Los fps medidos, o null si no hay medición.
 */
export function useFpsEstimado(src: string | null): number | null {
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    setFps(null);
    if (Platform.OS !== 'web' || !src || typeof document === 'undefined') return;
    const v = document.createElement('video') as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
    };
    if (typeof v.requestVideoFrameCallback !== 'function') return;

    let vigente = true;
    const tiempos: number[] = [];
    const cerrar = () => {
      vigente = false;
      clearTimeout(limite);
      v.pause();
      v.removeAttribute('src');
      v.load();
    };
    const limite = setTimeout(cerrar, LIMITE_MS);
    const alCuadro = (_now: number, meta: { mediaTime: number }) => {
      if (!vigente) return;
      tiempos.push(meta.mediaTime);
      if (tiempos.length < MUESTRAS) { v.requestVideoFrameCallback!(alCuadro); return; }
      const saltos = tiempos.slice(1).map((t, i) => t - tiempos[i]).filter(d => d > 0).sort((a, b) => a - b);
      if (saltos.length > 0) setFps(Math.round((1 / saltos[Math.floor(saltos.length / 2)]) * 100) / 100);
      cerrar();
    };

    v.muted = true;
    v.preload = 'auto';
    v.src = src;
    v.requestVideoFrameCallback(alCuadro);
    v.play().catch(cerrar);
    return cerrar;
  }, [src]);

  return fps;
}
