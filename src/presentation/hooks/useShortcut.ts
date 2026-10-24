import { useLayoutEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface Opciones {
  /** Valor de `KeyboardEvent.key` (sin distinguir mayúsculas), p. ej. `s` o `Enter`. */
  tecla: string;
  /** Exige Ctrl (o Cmd en macOS). Con `true` el atajo también actúa dentro de un campo de texto. */
  ctrl?: boolean;
  /** Si es `false` el atajo no responde. */
  activo?: boolean;
  /** `true` = atajo del modal abierto: responde aunque haya un modal. Sin él, un modal abierto lo silencia. */
  enModal?: boolean;
}

/** Cantidad de modales abiertos. Con alguno abierto, los atajos de la pantalla de fondo no responden. */
let modalesAbiertos = 0;

/**
 * Silencia los atajos de la pantalla de fondo mientras un modal está abierto (solo los atajos
 * declarados con `enModal` siguen activos). Se libera al cerrar o desmontar.
 *
 * Args:
 *   abierto: si el modal está abierto.
 */
export function useBloqueoDeAtajos(abierto: boolean): void {
  useLayoutEffect(() => {
    if (!abierto) return undefined;
    modalesAbiertos += 1;
    return () => { modalesAbiertos -= 1; };
  }, [abierto]);
}

/**
 * Registra un atajo de teclado (solo web). Sin Ctrl, se ignora mientras el foco
 * está en un campo de texto (para no competir con la escritura) y, si la tecla es
 * Enter, mientras el foco está en un botón (que ya se activa con Enter). Con un modal abierto
 * (`useBloqueoDeAtajos`) solo responden los atajos con `enModal`.
 *
 * Args:
 *   opciones: tecla, si exige Ctrl, si está activo y si es de un modal.
 *   accion: función a ejecutar al pulsar el atajo.
 */
export function useShortcut({ tecla, ctrl = false, activo = true, enModal = false }: Opciones, accion: () => void): void {
  const accionRef = useRef(accion);
  accionRef.current = accion;

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !activo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== tecla.toLowerCase()) return;
      if (modalesAbiertos > 0 && !enModal) return;
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
  }, [tecla, ctrl, activo, enModal]);
}
