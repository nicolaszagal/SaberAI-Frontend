import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useC } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';

export function ActionPanel() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { currentAction, sessionStatus } = useSession();

  const isAnalyzing = sessionStatus === 'analyzing';
  const a = currentAction;

  const isRed = (a?.fencer ?? 'ROJ') === 'ROJ';
  const fc  = isRed ? C.red   : C.green;
  const fbg = isRed ? C.red + '18' : C.green + '18';
  const fbd = isRed ? C.redDark : C.greenDark;

  return (
    <View testID="action-panel" style={s.panel}>
      {/* Esgrimista + acción */}
      <View style={[s.fencerBlock, { backgroundColor: fbg, borderTopColor: a ? fbd : C.border }]}>
        <Text style={[s.puntoLabel, { color: C.cyan }]}>PUNTO PARA  ●  POSE-ESTIMATION</Text>
        {isAnalyzing ? (
          <View style={s.analyzingRow}>
            <ActivityIndicator size="small" color={C.cyan} />
            <Text style={[s.analyzingText, { color: C.cyan }]}>ANALIZANDO CLIP...</Text>
          </View>
        ) : a ? (
          <>
            <Text style={[s.fencerCode, { color: fc }]}>{a.fencer}</Text>
            <Text testID="fencer-name" style={s.fencerName}>{a.fencerName}</Text>
            <Text testID="action-label" style={s.actionText}>{a.action}</Text>
          </>
        ) : (
          <Text testID="action-waiting" style={s.waitingText}>ESPERANDO CLIP PARA ANALIZAR</Text>
        )}
        <Text style={s.sysLabel}>SABRE.AI · SISTEMA DE VIDEO ARBITRAJE INTELIGENTE</Text>
      </View>

      {/* Confianza */}
      <View style={s.confBlock}>
        <Text style={s.confTitle}>CONFIANZA DEL MODELO</Text>
        <View style={s.confBarOuter}>
          <View style={[s.confBarInner, { width: `${a?.confidence ?? 0}%` as any }]} />
        </View>
        <Text testID="confidence-value" style={s.confPct}>{a ? `${a.confidence}%` : '—'}</Text>
        <Text style={s.modelInfo}>
          {a ? `Modelo ${a.model}  ·  Latencia ${a.latencyMs} ms` : 'Sin veredicto'}
        </Text>
      </View>

      {/* Botones */}
      <View style={s.btnsBlock}>
        <ActionBtn label="✓  CONFIRMAR" shortcut="C" bg={C.confirmBg} border={C.green}  txtColor={C.confirmText} s={s} />
        <ActionBtn label="✕  ANULAR"    shortcut="A" bg={C.anularBg}  border={C.red}    txtColor={C.anularText}  s={s} />
        <ActionBtn label="✎  MANUAL"    shortcut="M" bg={C.manualBg}  border={C.blue}   txtColor={C.manualText}  s={s} />
      </View>

      <View style={s.screenBlock}>
        <Text style={s.screenText}>PANTALLA 01 / 02</Text>
        <Text style={s.screenText}>EN VIVO</Text>
      </View>
    </View>
  );
}

function ActionBtn({ label, shortcut, bg, border, txtColor, s }: {
  label: string; shortcut: string; bg: string; border: string; txtColor: string; s: any;
}) {
  return (
    <TouchableOpacity style={[s.btn, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[s.btnText, { color: txtColor }]}>{label}</Text>
      <View style={s.shortcutBox}>
        <Text style={s.shortcutText}>{shortcut}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  panel: {
    height: 72, backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row',
  },
  fencerBlock: {
    flex: 2, paddingHorizontal: 14, paddingVertical: 6,
    borderTopWidth: 2, borderRightWidth: 1, borderRightColor: C.border,
    justifyContent: 'center', gap: 1,
  },
  puntoLabel:    { fontSize: 9,  letterSpacing: 0.4, color: C.cyan },
  fencerCode:    { fontSize: 22, fontWeight: '900', letterSpacing: 1, lineHeight: 24 },
  fencerName:    { color: C.textMuted, fontSize: 12, fontWeight: '600' },
  actionText:    { color: C.text,      fontSize: 12, fontWeight: '600' },
  sysLabel:      { color: C.textDim,   fontSize: 8,  letterSpacing: 0.3 },
  waitingText:   { color: C.textDim,   fontSize: 11, fontStyle: 'italic' },
  analyzingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyzingText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  confBlock: {
    flex: 1.2, paddingHorizontal: 14, paddingVertical: 8,
    justifyContent: 'center', borderRightWidth: 1, borderRightColor: C.border, gap: 3,
  },
  confTitle:    { color: C.textMuted, fontSize: 9,  letterSpacing: 0.5 },
  confBarOuter: { height: 5, backgroundColor: C.card, borderRadius: 3, overflow: 'hidden' },
  confBarInner: { height: 5, backgroundColor: C.green, borderRadius: 3 },
  confPct:      { color: C.text, fontSize: 22, fontWeight: '800', lineHeight: 24 },
  modelInfo:    { color: C.textMuted, fontSize: 9 },
  btnsBlock: {
    flex: 2.2, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 7, borderRightWidth: 1, borderRightColor: C.border,
  },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 5, borderWidth: 1,
  },
  btnText:      { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  shortcutBox:  { borderWidth: 1, borderColor: '#88888866', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  shortcutText: { color: C.textMuted, fontSize: 9, fontWeight: '600' },
  screenBlock:  { flex: 0.6, justifyContent: 'center', alignItems: 'center', gap: 2 },
  screenText:   { color: C.textMuted, fontSize: 9, letterSpacing: 0.3 },
});
