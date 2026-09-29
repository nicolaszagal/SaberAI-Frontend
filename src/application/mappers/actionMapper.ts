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

/** "A · ROJ" / "B · VER": el lado se deriva del sufijo de `backendAction`
 * (A/B, ver docs_claude/contexto_sabre.md D-06), no de un nombre de
 * tirador simulado (regla 8: no mostrar datos que no existen todavía). */
export function formatFencerLabel(backendAction: string, fencer: string): string {
  const side = backendAction.slice(-1);
  return `${side} · ${fencer}`;
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
