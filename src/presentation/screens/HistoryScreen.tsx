/**
 * HistoryScreen — Historial completo del encuentro
 * Muestra todas las acciones del partido con filtros por esgrimista,
 * tipo de acción y rango de confianza.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { useC } from '../context/ThemeContext';
import type { HistorialEntry } from '../../domain/entities/Action';
import type { FencerColor } from '../../domain/entities/Fencer';
import { SYSTEM, SESSION } from '../../data/mock';
import { useSession } from '../context/SessionContext';


type FilterFencer = 'ALL' | FencerColor;

function MiniStick({ fencer }: { fencer: FencerColor }) {
  const C = useC();
  const gc = C.green; const rc = C.red;
  return (
    <Svg width={32} height={28} viewBox="0 0 32 28">
      <Circle cx={6}  cy={5}  r={2.5} fill="none" stroke={gc} strokeWidth={1.2} />
      <Line x1={6}  y1={7}  x2={6}  y2={16} stroke={gc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={3}  y1={10} x2={9}  y2={10} stroke={gc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={9}  y1={10} x2={14} y2={10} stroke={gc} strokeWidth={0.8} strokeLinecap="round" />
      <Line x1={6}  y1={16} x2={4}  y2={24} stroke={gc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={6}  y1={16} x2={8}  y2={24} stroke={gc} strokeWidth={1.2} strokeLinecap="round" />
      <Circle cx={26} cy={5}  r={2.5} fill="none" stroke={rc} strokeWidth={1.2} />
      <Line x1={26} y1={7}  x2={26} y2={16} stroke={rc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={23} y1={10} x2={29} y2={10} stroke={rc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={26} y1={16} x2={24} y2={24} stroke={rc} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={26} y1={16} x2={28} y2={24} stroke={rc} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function EntryRow({ entry, index }: { entry: HistorialEntry; index: number }) {
  const C = useC();
  const s = useMemo(() => rowStyles(C), [C]);
  const isRed  = entry.fencer === 'ROJ';
  const color  = isRed ? C.red : C.green;
  const confOk = entry.confidence >= 80;

  return (
    <View style={[s.entryRow, index % 2 === 0 && s.entryRowAlt]}>
      <Text style={s.entryNum}>{entry.id}</Text>
      <View style={[s.fencerBadge, { borderColor: color + '66', backgroundColor: color + '11' }]}>
        <Text style={[s.fencerCode, { color }]}>{entry.fencer}</Text>
      </View>
      <MiniStick fencer={entry.fencer} />
      <Text style={s.actionName}>{entry.action}</Text>
      <View style={s.confCol}>
        <View style={s.confBarBg}>
          <View style={[s.confBarFill, {
            width: `${entry.confidence}%` as any,
            backgroundColor: confOk ? C.green : C.orange,
          }]} />
        </View>
        <Text style={[s.confPct, { color: confOk ? C.green : C.orange }]}>
          {entry.confidence}%
        </Text>
      </View>
      <Text style={s.timestamp}>{entry.timestamp}</Text>
      <Text style={s.duration}>{entry.durationMs} ms</Text>
      <View style={[s.statusBadge, { borderColor: C.green + '55' }]}>
        <Text style={s.statusText}>CONFIRMADO</Text>
      </View>
      <View style={s.actionsCol}>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <Text style={s.iconBtnText}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.iconBtn, { borderColor: C.cyan + '66' }]} activeOpacity={0.7}>
          <Text style={[s.iconBtnText, { color: C.cyan }]}>⬇</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  const C = useC();
  const s = useMemo(() => chipStyles(C), [C]);
  return (
    <View style={s.statChip}>
      <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export function HistoryScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { historial } = useSession();
  const [filter, setFilter] = useState<FilterFencer>('ALL');
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  const handleVideoPress = () => {
    if (!SESSION.matchEnded) {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      setShowTooltip(true);
      tooltipTimer.current = setTimeout(() => setShowTooltip(false), 2500);
    }
  };

  const filtered = filter === 'ALL'
    ? historial
    : historial.filter(e => e.fencer === filter);

  const rojCount = historial.filter(e => e.fencer === 'ROJ').length;
  const verCount = historial.filter(e => e.fencer === 'VER').length;
  const avgConf  = historial.length
    ? Math.round(historial.reduce((a, e) => a + e.confidence, 0) / historial.length)
    : 0;

  return (
    <View style={s.root}>
      {/* Stats bar */}
      <View style={s.statsBar}>
        <StatChip label="ACCIONES TOTALES"  value={String(historial.length)} />
        <StatChip label="ROJ"               value={String(rojCount)} color={C.red} />
        <StatChip label="VER"               value={String(verCount)} color={C.green} />
        <StatChip label="CONFIANZA PROM."   value={`${avgConf}%`} color={C.cyan} />
        <StatChip label="FALSOS POSITIVOS"  value={String(SYSTEM.falsePositives)} color={C.orange} />
        <StatChip label="FRAMES ANALIZADOS" value={SYSTEM.framesProcessed.toLocaleString()} />
      </View>

      {/* Filtros */}
      <View style={s.filterBar}>
        <Text style={s.filterLabel}>FILTRAR POR ESGRIMISTA:</Text>
        {(['ALL', 'ROJ', 'VER'] as FilterFencer[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'ALL' ? 'TODOS' : f}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={s.filterCount}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Barra de video completo */}
      <View style={s.videoBar}>
        <TouchableOpacity
          style={[s.videoBtn, !SESSION.matchEnded && s.videoBtnDisabled]}
          onPress={handleVideoPress}
          activeOpacity={SESSION.matchEnded ? 0.75 : 1}
        >
          <Text style={[s.videoBtnText, !SESSION.matchEnded && s.videoBtnTextDisabled]}>
            ▶  VER VIDEO COMPLETO DEL ENCUENTRO
          </Text>
          {!SESSION.matchEnded && <Text style={s.lockText}>🔒</Text>}
        </TouchableOpacity>
        {showTooltip && (
          <View style={s.tooltip}>
            <Text style={s.tooltipText}>El video podrá reproducirse una vez el combate termine.</Text>
          </View>
        )}
      </View>

      {/* Tabla */}
      <View style={s.tableHeader}>
        {['ID', 'ESGR.', '', 'ACCIÓN', 'CONFIANZA', 'TIEMPO', 'DURACIÓN', 'ESTADO', 'CLIPS'].map(h => (
          <Text key={h} style={s.colHead}>{h}</Text>
        ))}
      </View>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {filtered.map((entry, i) => (
          <EntryRow key={entry.id} entry={entry} index={i} />
        ))}
        {filtered.length === 0 && (
          <Text style={s.empty}>Sin acciones para este filtro.</Text>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={s.bottomBar}>
        <Text style={s.bottomText}>
          ENCUENTRO: {SESSION.tournament}  ·  PISTA {SESSION.pista}  ·  ÁRBITRO {SESSION.arbitro}
        </Text>
        <TouchableOpacity style={s.exportBtn}>
          <Text style={s.exportText}>⬇  EXPORTAR PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  statsBar: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingHorizontal: 14, paddingVertical: 8, gap: 20,
  },

  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  filterLabel:     { color: C.textMuted, fontSize: 9, letterSpacing: 0.5, marginRight: 4 },
  filterBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 3,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  filterBtnActive: { backgroundColor: C.cyan + '18', borderColor: C.cyan },
  filterText:      { color: C.textMuted, fontSize: 10, fontWeight: '600' },
  filterTextActive:{ color: C.cyan },
  filterCount:     { color: C.textDim, fontSize: 9, marginLeft: 'auto' },

  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 10,
  },
  colHead: { flex: 1, color: C.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },

  list: { flex: 1 },
  empty: { color: C.textMuted, textAlign: 'center', marginTop: 40, fontSize: 12 },

  videoBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  videoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 5, borderWidth: 1, borderColor: C.cyan,
    backgroundColor: C.cyan + '18',
  },
  videoBtnDisabled: {
    borderColor: C.border,
    backgroundColor: C.card,
    opacity: 0.55,
  },
  videoBtnText: { color: C.cyan, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  videoBtnTextDisabled: { color: C.textMuted },
  lockText: { fontSize: 11 },
  tooltip: {
    flexShrink: 1,
    borderWidth: 1, borderColor: C.orange + '88',
    backgroundColor: C.orange + '18',
    borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5,
  },
  tooltipText: { color: C.orange, fontSize: 10, fontWeight: '500' },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  bottomText: { color: C.textMuted, fontSize: 9, letterSpacing: 0.3 },
  exportBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: C.cyan,
    borderRadius: 4, backgroundColor: C.cyan + '18',
  },
  exportText: { color: C.cyan, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});

const rowStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  entryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9,
    gap: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  entryRowAlt: { backgroundColor: C.card },
  entryNum: { flex: 1, color: C.textMuted, fontSize: 10 },
  fencerBadge: {
    flex: 1, borderWidth: 1, borderRadius: 3,
    paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center',
  },
  fencerCode: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  actionName: { flex: 3, color: C.text, fontSize: 11, fontWeight: '500' },
  confCol:    { flex: 2, gap: 3 },
  confBarBg:  { height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  confBarFill:{ height: 3, borderRadius: 2 },
  confPct:    { fontSize: 9, fontWeight: '700' },
  timestamp:  { flex: 1.2, color: C.textMuted, fontSize: 10 },
  duration:   { flex: 1,   color: C.textMuted, fontSize: 10 },
  statusBadge: {
    flex: 1.2, borderWidth: 1, borderRadius: 3,
    paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center',
  },
  statusText: { color: C.green, fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  actionsCol: { flex: 1.2, flexDirection: 'row', gap: 5, justifyContent: 'flex-end' },
  iconBtn: {
    width: 26, height: 26, borderRadius: 4,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card,
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnText: { color: C.textMuted, fontSize: 11 },
});

const chipStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  statChip:  { alignItems: 'center', gap: 1 },
  statValue: { color: C.text, fontSize: 16, fontWeight: '800', lineHeight: 18 },
  statLabel: { color: C.textMuted, fontSize: 8, letterSpacing: 0.5 },
});
