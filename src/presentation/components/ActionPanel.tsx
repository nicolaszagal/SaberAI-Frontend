import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useC } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { Button } from './Button';
import { FENCER_LABEL, fencerColor } from '../theme/fencer';
import { FONT, RADIUS, space } from '../theme/tokens';

/**
 * Panel inferior de la Revisión VAR: sugerencia del sistema, confianza y botones.
 * Todo lo que muestra es una sugerencia (RNF-01): la decisión es del árbitro.
 */
export function ActionPanel() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { currentAction, sessionStatus } = useSession();

  const isAnalyzing = sessionStatus === 'analyzing';
  const a = currentAction;
  const fc = a ? fencerColor(C, a.fencer) : C.textMuted;

  return (
    <View testID="action-panel" style={s.panel}>
      {/* Sugerencia: dato principal = la acción */}
      <View style={[s.block, s.suggestBlock, { borderTopColor: a ? fc : C.border }]}>
        <Text style={s.label}>Sugerencia del sistema</Text>
        {isAnalyzing ? (
          <View style={s.analyzingRow}>
            <ActivityIndicator size="small" color={C.cyan} />
            <Text testID="action-analyzing" style={[s.main, { color: C.cyan }]}>Analizando clip…</Text>
          </View>
        ) : a ? (
          <>
            <Text testID="action-label" style={s.main}>{a.action}</Text>
            <Text style={s.secondary}>
              <Text style={{ color: fc, fontWeight: '800' }}>{FENCER_LABEL[a.fencer]}</Text>
              {' · '}
              <Text testID="fencer-name">{a.fencerName}</Text>
            </Text>
          </>
        ) : (
          <>
            <Text testID="action-waiting" style={s.mainMuted}>Sin sugerencia todavía</Text>
            <Text style={s.secondary}>Selecciona un clip y pulsa Analizar.</Text>
          </>
        )}
      </View>

      {/* Confianza: dato principal = porcentaje */}
      <View style={[s.block, s.confBlock]}>
        <Text style={s.label}>Confianza</Text>
        <Text testID="confidence-value" style={a ? s.main : s.mainMuted}>{a ? `${a.confidence}%` : '—'}</Text>
        <View style={s.confBarOuter}>
          <View style={[s.confBarInner, { width: `${a?.confidence ?? 0}%` as any }]} />
        </View>
        {a && <Text style={s.secondary}>Latencia {a.latencyMs} ms</Text>}
      </View>

      {/* Botones */}
      <View style={[s.block, s.btnsBlock]}>
        <Button label="✓ Confirmar" shortcut="C" bg={C.confirmBg} border={C.green} color={C.confirmText} />
        <Button label="✕ Anular"    shortcut="A" bg={C.anularBg}  border={C.red}   color={C.anularText} />
        <Button label="✎ Manual"    shortcut="M" bg={C.manualBg}  border={C.blue}  color={C.manualText} />
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  panel: {
    flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  block:        { padding: space(3), justifyContent: 'center', gap: space(1) },
  suggestBlock: { flex: 1, minWidth: 240, borderTopWidth: 3, borderRightWidth: 1, borderRightColor: C.border },
  confBlock:    { minWidth: 200, borderRightWidth: 1, borderRightColor: C.border },
  btnsBlock:    { flexShrink: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(2) },
  label:        { color: C.textMuted, fontSize: FONT.xs, fontWeight: '600' },
  main:         { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  mainMuted:    { color: C.textMuted, fontSize: FONT.md, fontWeight: '600' },
  secondary:    { color: C.textMuted, fontSize: FONT.sm },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  confBarOuter: { height: 6, backgroundColor: C.border, borderRadius: RADIUS.sm, overflow: 'hidden' },
  confBarInner: { height: 6, backgroundColor: C.green, borderRadius: RADIUS.sm },
});
