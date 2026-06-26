/**
 * TournamentScreen — Dashboard de torneo y exportación de reporte
 * Muestra el marcador en vivo, perfiles de esgrimistas, timeline
 * de acciones del bout y genera el reporte PDF.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Rect, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { useC } from '../context/ThemeContext';
import type { FencerProfile } from '../../domain/entities/Fencer';
import type { HistorialEntry } from '../../domain/entities/Action';
import { TOURNAMENT, FENCERS, SESSION, SYSTEM } from '../../data/mock';
import { useSession } from '../context/SessionContext';

// ── Utilidades ────────────────────────────────────────────

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Componentes menores ───────────────────────────────────

function ScoreDisplay() {
  const C = useC();
  const s = useMemo(() => scoreStyles(C), [C]);
  const { ROJ, VER } = FENCERS;
  const T = TOURNAMENT;
  const pct = T.timeElapsedSec / T.timeLimitSec;

  return (
    <View style={s.scoreBox}>
      {/* Esgrimista ROJ */}
      <View style={s.fencerSide}>
        <Text style={s.flag}>{ROJ.flag}</Text>
        <Text style={s.fencerCode}>{ROJ.name}</Text>
        <Text style={s.country}>{ROJ.country}  ·  #{ROJ.ranking}</Text>
      </View>

      {/* Marcador central */}
      <View style={s.scoreMid}>
        <View style={s.scoresRow}>
          <Text style={[s.score, { color: C.red }]}>{ROJ.score}</Text>
          <Text style={s.scoreDash}>—</Text>
          <Text style={[s.score, { color: C.green }]}>{VER.score}</Text>
        </View>
        <Text style={s.periodLabel}>PERÍODO {T.period} / {T.totalPeriods}</Text>
        <View style={s.timerRow}>
          <Text style={s.timer}>{fmtTime(T.timeElapsedSec)}</Text>
          <Text style={s.timerOf}> / {fmtTime(T.timeLimitSec)}</Text>
        </View>
        {/* Barra de tiempo */}
        <View style={s.timeBarBg}>
          <View style={[s.timeBarFill, { width: `${pct * 100}%` as any,
            backgroundColor: pct > 0.85 ? C.red : C.cyan }]} />
        </View>
        <Text style={s.limitNote}>LÍMITE {T.scoreLimit} TOQUES</Text>
      </View>

      {/* Esgrimista VER */}
      <View style={[s.fencerSide, s.fencerSideRight]}>
        <Text style={s.flag}>{VER.flag}</Text>
        <Text style={s.fencerCode}>{VER.name}</Text>
        <Text style={s.country}>{VER.country}  ·  #{VER.ranking}</Text>
      </View>
    </View>
  );
}

function FencerCard({ fencer, historial }: { fencer: FencerProfile; historial: HistorialEntry[] }) {
  const C = useC();
  const s = useMemo(() => cardStyles(C), [C]);
  const isRed = fencer.code === 'ROJ';
  const color = isRed ? C.red : C.green;
  const actions = historial.filter(h => h.fencer === fencer.code);
  const avgConf = actions.length
    ? Math.round(actions.reduce((a, e) => a + e.confidence, 0) / actions.length)
    : 0;

  return (
    <View style={[s.card, { borderTopColor: color }]}>
      {/* Header */}
      <View style={s.cardHeader}>
        <Text style={s.cardFlag}>{fencer.flag}</Text>
        <View style={s.cardTitle}>
          <Text style={[s.cardCode, { color }]}>{fencer.code}</Text>
          <Text style={s.cardName}>{fencer.fullName}</Text>
          <Text style={s.cardCountry}>{fencer.country}  ·  Ranking #{fencer.ranking}</Text>
        </View>
        <Text style={[s.bigScore, { color }]}>{fencer.score}</Text>
      </View>

      <View style={s.divider} />

      {/* Stats */}
      <View style={s.statsGrid}>
        <StatPair label="TOQUES"    value={String(fencer.score)} color={color} />
        <StatPair label="ACCIONES"  value={String(actions.length)} />
        <StatPair label="CONF. PROM" value={`${avgConf}%`} color={avgConf >= 80 ? C.green : C.orange} />
        <StatPair label="T. AMARILL" value={String(fencer.yellowCards)} color={fencer.yellowCards > 0 ? C.orange : C.textMuted} />
      </View>

      <View style={s.divider} />

      {/* Últimas acciones */}
      <Text style={s.histLabel}>ÚLTIMAS ACCIONES</Text>
      {actions.slice(0, 3).map(a => (
        <View key={a.id} style={s.actionRow}>
          <Text style={s.actionId}>#{a.id}</Text>
          <Text style={s.actionName}>{a.action}</Text>
          <Text style={[s.actionConf, { color: a.confidence >= 80 ? C.green : C.orange }]}>
            {a.confidence}%
          </Text>
          <Text style={s.actionTs}>{a.timestamp}</Text>
        </View>
      ))}
      {actions.length === 0 && (
        <Text style={s.noActions}>Sin acciones registradas</Text>
      )}
    </View>
  );
}

function StatPair({ label, value, color }: { label: string; value: string; color?: string }) {
  const C = useC();
  const s = useMemo(() => statStyles(C), [C]);
  return (
    <View style={s.pair}>
      <Text style={[s.pairValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.pairLabel}>{label}</Text>
    </View>
  );
}

function TimelineDot({ color, label, ts }: { color: string; label: string; ts: string }) {
  const C = useC();
  const s = useMemo(() => tlStyles(C), [C]);
  return (
    <View style={s.entry}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <View style={s.line} />
      <Text style={s.entryLabel}>{label}</Text>
      <Text style={s.entryTs}>{ts}</Text>
    </View>
  );
}

function SvgTournamentArt() {
  const C = useC();
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.orange} stopOpacity={0.25} />
          <Stop offset="1" stopColor={C.orange} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="80" height="80" rx="6" fill="url(#tg)" />
      {/* Trofeo */}
      <Path d="M 30 14 L 50 14 L 50 36 C 50 46 40 52 40 52 C 40 52 30 46 30 36 Z"
        fill="none" stroke={C.orange} strokeWidth={2} strokeLinejoin="round" />
      {/* Asas */}
      <Path d="M 30 18 C 20 18 18 28 26 30" fill="none" stroke={C.orange} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M 50 18 C 60 18 62 28 54 30" fill="none" stroke={C.orange} strokeWidth={1.5} strokeLinecap="round" />
      {/* Base */}
      <Line x1={34} y1={52} x2={34} y2={60} stroke={C.orange} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={46} y1={52} x2={46} y2={60} stroke={C.orange} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x={28} y={60} width={24} height={4} rx={2} fill={C.orange} opacity={0.8} />
      {/* Estrella */}
      <Circle cx={40} cy={30} r={5} fill={C.orange} opacity={0.9} />
      {/* PDF badge */}
      <Rect x={52} y={50} width={20} height={22} rx={3} fill={C.cyan} opacity={0.15}
        stroke={C.cyan} strokeWidth={1} />
      <Line x1={56} y1={57} x2={68} y2={57} stroke={C.cyan} strokeWidth={1} opacity={0.7} />
      <Line x1={56} y1={61} x2={68} y2={61} stroke={C.cyan} strokeWidth={1} opacity={0.7} />
      <Line x1={56} y1={65} x2={63} y2={65} stroke={C.cyan} strokeWidth={1} opacity={0.7} />
      {/* Flecha de descarga */}
      <Line x1={62} y1={64} x2={62} y2={70} stroke={C.cyan} strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
      <Line x1={59} y1={67} x2={62} y2={70} stroke={C.cyan} strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
      <Line x1={65} y1={67} x2={62} y2={70} stroke={C.cyan} strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
    </Svg>
  );
}

// ── Pantalla principal ────────────────────────────────────

export function TournamentScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { historial } = useSession();
  const T = TOURNAMENT;

  return (
    <View style={s.root}>
      {/* ── Top: info del torneo ── */}
      <View style={s.topBar}>
        <View style={s.topLeft}>
          <Text style={s.tournName}>{T.name}</Text>
          <Text style={s.tournMeta}>
            {T.weapon}  ·  {T.category}  ·  {T.round}  ·  {T.venue}
          </Text>
        </View>
        <View style={s.topRight}>
          <Text style={s.topLabel}>ÁRBITRO</Text>
          <Text style={s.topValue}>{SESSION.arbitro}</Text>
        </View>
        <View style={s.topRight}>
          <Text style={s.topLabel}>PISTA</Text>
          <Text style={s.topValue}>{SESSION.pista}</Text>
        </View>
        <View style={s.topRight}>
          <Text style={s.topLabel}>FECHA</Text>
          <Text style={s.topValue}>{T.date}</Text>
        </View>
      </View>

      {/* ── Marcador ── */}
      <ScoreDisplay />

      {/* ── Cuerpo principal en 3 columnas ── */}
      <View style={s.body}>
        {/* Col 1: Esgrimista ROJ */}
        <FencerCard fencer={FENCERS.ROJ} historial={historial} />

        {/* Col 2: Timeline del bout */}
        <View style={s.timelineCol}>
          <Text style={s.colTitle}>TIMELINE DEL BOUT</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={s.tlScroll}>
            {historial.length === 0 && (
              <Text style={{ color: C.textDim, fontSize: 10, textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>
                Sin acciones aún
              </Text>
            )}
            {historial.map(h => (
              <TimelineDot
                key={h.id}
                color={h.fencer === 'ROJ' ? C.red : C.green}
                label={`#${h.id}  ${h.fencer}  ${h.action}  (${h.confidence}%)`}
                ts={h.timestamp}
              />
            ))}
          </ScrollView>
        </View>

        {/* Col 3: Esgrimista VER */}
        <FencerCard fencer={FENCERS.VER} historial={historial} />

        {/* Col 4: Exportar reporte */}
        <View style={s.exportCol}>
          <View style={s.exportHeader}>
            <SvgTournamentArt />
            <Text style={s.exportTitle}>REPORTE DEL ENCUENTRO</Text>
            <Text style={s.exportSub}>Genera el PDF oficial del bout con todos los veredictos, estadísticas y capturas de pose.</Text>
          </View>

          <View style={s.exportStats}>
            <ExportStat label="Acciones totales" value={String(historial.length)} />
            <ExportStat label="Precisión sistema" value={`${SYSTEM.precisionPct}%`} color={C.green} />
            <ExportStat label="Frames analizados" value={SYSTEM.framesProcessed.toLocaleString()} />
            <ExportStat label="Falsos positivos" value={String(SYSTEM.falsePositives)} color={C.orange} />
            <ExportStat label="Latencia promedio" value={`${SYSTEM.latencyAvgMs} ms`} />
            <ExportStat label="Modelo" value={SYSTEM.modelVersion} color={C.cyan} />
          </View>

          <View style={s.exportBtns}>
            <TouchableOpacity style={s.btnPrimary}>
              <Text style={s.btnPrimaryText}>⬇  EXPORTAR PDF</Text>
              <Text style={s.btnPrimaryNote}>Reporte oficial del encuentro</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary}>
              <Text style={s.btnSecondaryText}>📋  EXPORTAR CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary}>
              <Text style={s.btnSecondaryText}>🎬  EXPORTAR CLIPS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary}>
              <Text style={s.btnSecondaryText}>📥  DESCARGAR VIDEO DEL DUELO</Text>
            </TouchableOpacity>
          </View>

          <View style={s.exportNote}>
            <Text style={s.exportNoteText}>
              ⚠  La exportación real se habilitará al integrar el backend Cloud.
              Los datos actuales son de sesión mock.
            </Text>
          </View>
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <Text style={s.footerText}>SABRE.AI  ·  SISTEMA DE VIDEO ARBITRAJE INTELIGENTE</Text>
        <Text style={s.footerText}>
          {T.weapon}  ·  {T.name}  ·  {T.round}
        </Text>
      </View>
    </View>
  );
}

function ExportStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const C = useC();
  const s = useMemo(() => exportStatStyles(C), [C]);
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 20,
  },
  topLeft:    { flex: 1, gap: 2 },
  topRight:   { alignItems: 'flex-end', gap: 1 },
  tournName:  { color: C.text,     fontSize: 15, fontWeight: '800', letterSpacing: 0.8 },
  tournMeta:  { color: C.textMuted,fontSize: 10, letterSpacing: 0.3 },
  topLabel:   { color: C.textDim,  fontSize: 8,  letterSpacing: 0.5 },
  topValue:   { color: C.text,     fontSize: 12, fontWeight: '700' },
  body: {
    flex: 1, flexDirection: 'row',
    padding: 10, gap: 10,
  },
  timelineCol: {
    flex: 1.2, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 4,
    padding: 10, gap: 6,
  },
  colTitle: { color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  tlScroll: { flex: 1 },
  exportCol: {
    flex: 1.3, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.cyan + '55', borderRadius: 4,
    padding: 12, gap: 10,
  },
  exportHeader: { alignItems: 'center', gap: 6 },
  exportTitle: { color: C.text,     fontSize: 13, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  exportSub:   { color: C.textMuted,fontSize: 10, textAlign: 'center', lineHeight: 15 },
  exportStats: { gap: 0, borderWidth: 1, borderColor: C.border, borderRadius: 4, overflow: 'hidden' },
  exportBtns:  { gap: 6 },
  btnPrimary: {
    backgroundColor: C.cyan + '22',
    borderWidth: 1, borderColor: C.cyan,
    borderRadius: 6, paddingVertical: 13, paddingHorizontal: 14,
    alignItems: 'center', gap: 3,
  },
  btnPrimaryText: { color: C.cyan, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  btnPrimaryNote: { color: C.textMuted, fontSize: 9 },
  btnSecondary: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 5, paddingVertical: 9, alignItems: 'center',
  },
  btnSecondaryText: { color: C.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  exportNote: {
    borderWidth: 1, borderColor: C.orange + '44',
    backgroundColor: C.orange + '0d',
    borderRadius: 4, padding: 8,
  },
  exportNoteText: { color: C.orange, fontSize: 9, lineHeight: 14 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 5,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  footerText: { color: C.textDim, fontSize: 8, letterSpacing: 0.4 },
});

const scoreStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  scoreBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  fencerSide:      { flex: 1, gap: 2 },
  fencerSideRight: { alignItems: 'flex-end' },
  flag:        { fontSize: 22 },
  fencerCode:  { color: C.text,     fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  country:     { color: C.textMuted,fontSize: 10 },
  scoreMid: {
    flex: 1.4, alignItems: 'center', gap: 3,
  },
  scoresRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  score:     { fontSize: 44, fontWeight: '900', lineHeight: 48 },
  scoreDash: { color: C.textDim, fontSize: 28, fontWeight: '300' },
  periodLabel:{ color: C.textMuted, fontSize: 10, letterSpacing: 0.8 },
  timerRow:  { flexDirection: 'row', alignItems: 'baseline' },
  timer:     { color: C.text,     fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] as any },
  timerOf:   { color: C.textMuted,fontSize: 12 },
  timeBarBg: { width: 140, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  timeBarFill: { height: 4, borderRadius: 2 },
  limitNote: { color: C.textDim, fontSize: 8, letterSpacing: 0.5 },
});

const cardStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  card: {
    flex: 1, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderTopWidth: 3, borderRadius: 4,
    padding: 10, gap: 6,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardFlag:    { fontSize: 24 },
  cardTitle:   { flex: 1, gap: 1 },
  cardCode:    { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  cardName:    { color: C.text,     fontSize: 12, fontWeight: '600' },
  cardCountry: { color: C.textMuted,fontSize: 9 },
  bigScore:    { fontSize: 36, fontWeight: '900', lineHeight: 40 },
  divider:     { height: 1, backgroundColor: C.border },
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  histLabel:   { color: C.textMuted,fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  actionRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3,
                 borderBottomWidth: 1, borderBottomColor: C.border },
  actionId:    { color: C.textDim,  fontSize: 9, width: 36 },
  actionName:  { flex: 1, color: C.text,    fontSize: 10, fontWeight: '500' },
  actionConf:  { fontSize: 10, fontWeight: '700' },
  actionTs:    { color: C.textMuted,fontSize: 9 },
  noActions:   { color: C.textDim,  fontSize: 10, textAlign: 'center', marginTop: 8 },
});

const statStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  pair: {
    minWidth: 60, flex: 1, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 4, padding: 7, alignItems: 'center',
  },
  pairValue: { color: C.text,     fontSize: 16, fontWeight: '800' },
  pairLabel: { color: C.textMuted,fontSize: 8,  letterSpacing: 0.4, marginTop: 1 },
});

const tlStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  entry: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  line:       { display: 'none' },
  entryLabel: { flex: 1, color: C.text, fontSize: 10, fontWeight: '500' },
  entryTs:    { color: C.textMuted, fontSize: 9 },
});

const exportStatStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  label: { color: C.textMuted, fontSize: 10 },
  value: { color: C.text,     fontSize: 11, fontWeight: '700' },
});
