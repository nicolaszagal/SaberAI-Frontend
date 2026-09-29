import type { CombateActivo } from '../../domain/entities/Combate';

const ACTION_LABELS: Record<string, string> = {
  AttackA:      'ATAQUE',
  AttackB:      'ATAQUE',
  ContrattackA: 'CONTRAATAQUE',
  ContrattackB: 'CONTRAATAQUE',
  RiposteA:     'RIPOSTE',
  RiposteB:     'RIPOSTE',
};

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
