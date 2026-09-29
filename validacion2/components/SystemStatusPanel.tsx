import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { SYSTEM } from '../../data/mock';

function StatCell({
  label, value, valueColor, sub,
}: { label: string; value: string; valueColor?: string; sub?: string }) {
  const C = useC();
  const s = useMemo(() => cellStyles(C), [C]);
  return (
    <View style={s.cell}>
      <Text style={[s.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

export function SystemStatusPanel() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>ESTADO DEL SISTEMA</Text>
        <Text style={s.meta}>sabre-pose-v2.4  ·  GPU RTX 4090  ·  11.4 GB / 24 GB</Text>
      </View>
      <View style={s.grid}>
        <StatCell label="LATENCIA PROMEDIO"  value={`${SYSTEM.latencyAvgMs} ms`} />
        <StatCell label="FRAMES PROCESADOS"  value={SYSTEM.framesProcessed.toLocaleString()} />
        <StatCell label="PRECISIÓN SESIÓN"   value={`${SYSTEM.precisionPct}%`} valueColor={SYSTEM.precisionPct >= 95 ? C.green : C.orange} sub=">95% óptimo" />
        <StatCell label="FALSOS POSITIVOS"   value={String(SYSTEM.falsePositives)} />
        <StatCell label="SYNC RTP"           value={`±${SYSTEM.syncRtpMs} ms`} />
        <StatCell label="THROUGHPUT"         value={`${SYSTEM.throughputFps} fps`} sub="máx 120 fps" />
        <StatCell label="MODELO CARGADO"     value={SYSTEM.modelVersion} />
        <StatCell label="ALMACENAMIENTO"     value={`${SYSTEM.storageGbFree} GB libres`} />
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  container: {
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 4, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  title: { color: C.text,     fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  meta:  { color: C.textMuted,fontSize: 9 },
  grid:  { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
});

const cellStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  cell: {
    minWidth: 120, flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 4, padding: 10,
  },
  value: { color: C.text,     fontSize: 22, fontWeight: '700', lineHeight: 26 },
  sub:   { color: C.green,    fontSize: 9,  marginBottom: 2 },
  label: { color: C.textMuted,fontSize: 9,  letterSpacing: 0.3, marginTop: 3 },
});
