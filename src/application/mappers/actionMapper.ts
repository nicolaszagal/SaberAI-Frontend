const ACTION_LABELS: Record<string, string> = {
  AttackA:   'ATAQUE',
  AttackB:   'ATAQUE',
  ResponseA: 'RESPUESTA',
  ResponseB: 'RESPUESTA',
};

export function translateAction(backendAction: string): string {
  return ACTION_LABELS[backendAction] ?? backendAction;
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
