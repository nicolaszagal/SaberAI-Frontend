import { useLayoutEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface Opciones {
  /** Valor de `KeyboardEvent.key` (sin distinguir mayúsculas), p. ej. `s` o `Enter`. */
  tecla: string;
  /** Exige Ctrl (o Cmd en macOS). Con `true` el atajo también actúa dentro de un campo de texto. */
  ctrl?: boolean;
  /** Si es `false` el atajo no responde. */
  activo?: boolean;
}

/**
 * Registra un atajo de teclado (solo web). Sin Ctrl, se ignora mientras el foco
 * está en un campo de texto (para no competir con la escritura) y, si la tecla es
 * Enter, mientras el foco está en un botón (que ya se activa con Enter).
 *
 * Args:
 *   opciones: tecla, si exige Ctrl y si está activo.
 *   accion: función a ejecutar al pulsar el atajo.
 */
export function useShortcut({ tecla, ctrl = false, activo = true }: Opciones, accion: () => void): void {
  const accionRef = useRef(accion);
  accionRef.current = accion;

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !activo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== tecla.toLowerCase()) return;
      if (ctrl !== (e.ctrlKey || e.metaKey)) return;
      if (!ctrl) {
        if (e.altKey || e.shiftKey) return;
        const el = e.target as HTMLElement | null;
        const escribiendo = !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
        // Enter sobre un botón enfocado ya lo activa el propio botón: no se duplica.
        const activaBoton = e.key === 'Enter' && !!el &&
          (['BUTTON', 'A'].includes(el.tagName) || el.getAttribute('role') === 'button');
        if (escribiendo || activaBoton) return;
      }
      e.preventDefault();
      accionRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tecla, ctrl, activo]);
}
