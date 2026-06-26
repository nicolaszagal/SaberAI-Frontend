import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { useC } from '../context/ThemeContext';
import type { HistorialEntry } from '../../domain/entities/Action';
import { useSession } from '../context/SessionContext';

function MiniStick({ fencer }: { fencer: 'ROJ' | 'VER' }) {
  const C = useC();
  const gc = C.green; const rc = C.red;
  return (
    <Svg width={36} height={30} viewBox="0 0 36 30">
      <Circle cx={6}  cy={5}  r={2.5} fill="none" stroke={gc} strokeWidth={1.2} />
      <Line x1={6}  y1={7}  x2={6}  y2={16} stroke={gc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={3}  y1={10} x2={9}  y2={10} stroke={gc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={9}  y1={10} x2={14} y2={10} stroke={gc} strokeWidth={0.8} strokeLinecap="round" />
      <Line x1={14} y1={10} x2={20} y2={10} stroke={gc} strokeWidth={0.5} strokeLinecap="round" />
      <Line x1={6}  y1={16} x2={4}  y2={24} stroke={gc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={6}  y1={16} x2={8}  y2={24} stroke={gc} strokeWidth={1.2} strokeLinecap="round" />
      <Circle cx={30} cy={5}  r={2.5} fill="none" stroke={rc} strokeWidth={1.2} />
      <Line x1={30} y1={7}  x2={30} y2={16} stroke={rc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={27} y1={10} x2={33} y2={10} stroke={rc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={30} y1={16} x2={28} y2={24} stroke={rc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={30} y1={16} x2={32} y2={24} stroke={rc} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function EntryCard({ entry }: { entry: HistorialEntry }) {
  const C = useC();
  const s = useMemo(() => cardStyles(C), [C]);
  const color = entry.fencer === 'ROJ' ? C.red : C.green;
  return (
    <View style={[s.card, { borderLeftColor: color }]}>
      <View style={s.row}>
        <MiniStick fencer={entry.fencer} />
        <View style={s.info}>
          <View style={s.topRow}>
            <Text style={[s.fencerTag, { color }]}>{entry.fencer}</Text>
            <Text style={s.entryId}>#{entry.id}</Text>
            <Text style={s.ts}>{entry.timestamp}</Text>
          </View>
          <Text style={s.action}>{entry.action}</Text>
          <View style={s.confRow}>
            <Text style={s.confLabel}>CONF</Text>
            <View style={s.bar}>
              <View style={[s.barFill, { width: `${entry.confidence}%` as any }]} />
            </View>
            <Text style={s.confPct}>{entry.confidence}%</Text>
          </View>
        </View>
        <Text style={s.dur}>{entry.durationMs} ms</Text>
      </View>
    </View>
  );
}

export function HistorialPanel() {
  const C = useC();
  const s = useMemo(() => panelStyles(C), [C]);
  const { historial } = useSession();
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>HISTORIAL</Text>
        <Text style={s.subtitle}>{historial.length} · más reciente arriba</Text>
      </View>
      <ScrollView testID="historial-list" showsVerticalScrollIndicator={false}>
        {historial.length === 0 && (
          <Text testID="historial-empty" style={s.empty}>Sin acciones en esta sesión</Text>
        )}
        {historial.map(e => <EntryCard key={e.id} entry={e} />)}
      </ScrollView>
    </View>
  );
}

const panelStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  header: {
    height: 32, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title:    { color: C.text,     fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  subtitle: { color: C.textMuted,fontSize: 10 },
  empty:    { color: C.textDim, fontSize: 10, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
});

const cardStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  card: {
    borderLeftWidth: 3, marginHorizontal: 6, marginTop: 6,
    backgroundColor: C.card, borderRadius: 4, padding: 8,
  },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  info:      { flex: 1 },
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  fencerTag: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  entryId:   { color: C.textMuted, fontSize: 10 },
  ts:        { color: C.textMuted, fontSize: 10, marginLeft: 'auto' },
  action:    { color: C.textMuted, fontSize: 11, letterSpacing: 0.3, marginBottom: 4 },
  confRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  confLabel: { color: C.textDim,  fontSize: 9,  letterSpacing: 0.5 },
  bar:       { flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  barFill:   { height: 3, backgroundColor: C.green, borderRadius: 2 },
  confPct:   { color: C.green, fontSize: 10, fontWeight: '700' },
  dur:       { color: C.textDim, fontSize: 9, alignSelf: 'flex-start' },
});
