import type { CombateActivo } from '../../domain/entities/Combate';
import type { FencerColor } from '../../domain/entities/Fencer';

const ACTION_LABELS: Record<string, string> = {
  AttackA:      'ATAQUE',
  AttackB:      'ATAQUE',
  ContrattackA: 'CONTRAATAQUE',
  ContrattackB: 'CONTRAATAQUE',
  RiposteA:     'RIPOSTE',
  RiposteB:     'RIPOSTE',
};

const ACTION_NAMES: Record<string, string> = {
  AttackA: 'Ataque', AttackB: 'Ataque',
  ContrattackA: 'Contraataque', ContrattackB: 'Contraataque',
  RiposteA: 'Riposte', RiposteB: 'Riposte',
};

/** Nombre completo de la acción para el panel de revisión (Ataque, Contraataque, Riposte). */
export function nombreAccion(backendAction: string): string {
  return ACTION_NAMES[backendAction] ?? backendAction;
}

/** Tirador atribuido ("A · ROJ" / "B · VER") a partir del sufijo de la clase del modelo. */
export function tiradorDeClase(backendAction: string): FencerColor {
  return backendAction.endsWith('B') ? 'VER' : 'ROJ';
}

/** Las 6 clases del modelo (D-06), en el orden en que se ofrecen al árbitro. */
export const CLASES_MODELO: readonly string[] = [
  'AttackA', 'AttackB', 'ContrattackA', 'ContrattackB', 'RiposteA', 'RiposteB',
];

const DECISION_LABELS: Record<string, string> = {
  mantener: 'Mantiene',
  cambiar: 'Cambia',
  anular: 'Anula',
};

/** Texto de la decisión del árbitro en el Historial ("Mantiene", "Cambia", "Anula"). */
export function etiquetaDecision(decision: string): string {
  return DECISION_LABELS[decision] ?? decision;
}

/** Motivo de "Clasificación no disponible" en lenguaje claro (valores de `motivo_no_disp`). */
export function motivoLegible(motivo: string | null | undefined): string {
  switch (motivo) {
    case 'pose_incompleta':  return 'No se pudo detectar a ambos tiradores en el clip.';
    case 'confianza_baja':   return 'La confianza de la sugerencia quedó por debajo del umbral configurado.';
    case 'clase_fuera_mvp':  return 'La acción detectada queda fuera de las 6 clases del sistema.';
    case 'timeout':          return 'El análisis superó el límite de 60 s.';
    case 'sin_senal_favero': return 'No llegó la señal de la luz Favero.';
    case 'mensaje_invalido': return 'El análisis recibió datos inválidos.';
    default:                 return 'El sistema no pudo clasificar la acción.';
  }
}

export function translateAction(backendAction: string): string {
  return ACTION_LABELS[backendAction] ?? backendAction;
}

/** Alias del tirador atribuido: el lado se deriva del sufijo de `backendAction`
 * (A/B, ver docs_claude/contexto_sabre.md D-06) y el alias sale del combate activo. */
export function aliasDelTirador(
  backendAction: string,
  combate: Pick<CombateActivo, 'aliasA' | 'aliasB'>,
): string {
  return backendAction.endsWith('B') ? combate.aliasB : combate.aliasA;
}

export function scaleConfidence(raw: number): number {
  return Math.round(raw * 100);
}

export function formatTimestamp(d: Date): string {
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  const ms  = String(d.getMilliseconds()).padStart(3, '0');
  return `${min}:${sec}:${ms}`;
}
