import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Pattern, Line,
  Circle, G, Path,
} from 'react-native-svg';
import { useC } from '../context/ThemeContext';
import { CAMERAS, SYSTEM, SESSION } from '../../data/mock';
import { useSession } from '../context/SessionContext';
import type { Screen } from '../../../App';

// ─── Arte SVG para cada tile ──────────────────────────────

/** Hero: sables cruzados con punto de toque */
function ArtAnalysis() {
  const C = useC();
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <Pattern id="dA" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Line x1="0" y1="0" x2="0" y2="12" stroke="#ffffff" strokeWidth="0.4" />
        </Pattern>
        <LinearGradient id="gA" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={C.cyan} stopOpacity={0.18} />
          <Stop offset="1" stopColor={C.cyan} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="90" fill="url(#dA)" opacity={0.06} />
      <Rect width="160" height="90" fill="url(#gA)" />

      {/* Sable verde (atacante) — hoja + guarda */}
      <G stroke={C.green} strokeWidth={2} strokeLinecap="round" fill="none">
        <Line x1={12} y1={82} x2={118} y2={14} />
        <Line x1={29} y1={61} x2={37} y2={75} />
      </G>

      {/* Sable rojo (defensor) — hoja + guarda */}
      <G stroke={C.red} strokeWidth={2} strokeLinecap="round" fill="none">
        <Line x1={148} y1={82} x2={42} y2={14} />
        <Line x1={131} y1={61} x2={123} y2={75} />
      </G>

      {/* Punto de toque */}
      <Circle cx={80} cy={38} r={5} fill={C.orange} stroke="#fff" strokeWidth={0.8} />
    </Svg>
  );
}

/** Cámaras: diagrama de posición con señal */
function ArtCameras() {
  const C = useC();
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="gC" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={C.green} stopOpacity={0.15} />
          <Stop offset="1" stopColor={C.green} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="60" fill="url(#gC)" />
      <Rect x={15} y={10} width={70} height={40} fill="none" stroke={C.green} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.4} />
      <Line x1={50} y1={10} x2={50} y2={50} stroke={C.green} strokeWidth={0.4} strokeDasharray="2 4" opacity={0.25} />
      <Circle cx={8}  cy={30} r={4} fill={C.green} opacity={0.9} />
      <Circle cx={92} cy={30} r={4} fill={C.green} opacity={0.9} />
      <Circle cx={50} cy={4}  r={4} fill={C.orange} opacity={0.85} />
      <Circle cx={50} cy={56} r={4} fill="none" stroke={C.textDim} strokeWidth={1} strokeDasharray="2 2" />
      <Path d="M 14 24 A 8 8 0 0 1 14 36" fill="none" stroke={C.green} strokeWidth={0.8} opacity={0.5} />
      <Path d="M 18 20 A 14 14 0 0 1 18 40" fill="none" stroke={C.green} strokeWidth={0.5} opacity={0.3} />
      <Path d="M 86 24 A 8 8 0 0 0 86 36" fill="none" stroke={C.green} strokeWidth={0.8} opacity={0.5} />
    </Svg>
  );
}

/** Configuración: sliders y diales */
function ArtConfig() {
  const C = useC();
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="gConf" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#818cf8" stopOpacity={0.15} />
          <Stop offset="1" stopColor="#818cf8" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="60" fill="url(#gConf)" />
      <Line x1={10} y1={18} x2={90} y2={18} stroke={C.border} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={10} y1={18} x2={62} y2={18} stroke="#818cf8" strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={62} cy={18} r={4} fill="#818cf8" />
      <Line x1={10} y1={30} x2={90} y2={30} stroke={C.border} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={10} y1={30} x2={38} y2={30} stroke="#818cf8" strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={38} cy={30} r={4} fill="#818cf8" />
      <Line x1={10} y1={42} x2={90} y2={42} stroke={C.border} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={10} y1={42} x2={76} y2={42} stroke="#818cf8" strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={76} cy={42} r={4} fill="#818cf8" />
      <Rect x={10} y={52} width={16} height={4} rx={1} fill="#818cf8" opacity={0.4} />
      <Rect x={30} y={52} width={22} height={4} rx={1} fill="#818cf8" opacity={0.25} />
      <Rect x={57} y={52} width={12} height={4} rx={1} fill="#818cf8" opacity={0.15} />
    </Svg>
  );
}

// ─── Tile component ───────────────────────────────────────

interface TileProps {
  index: string;
  title: string;
  subtitle: string;
  accent: string;
  art: React.ReactNode;
  chips?: { label: string; color?: string }[];
  onPress: () => void;
  hero?: boolean;
  bgColor: string;
  testID?: string;
}

function Tile({ index, title, subtitle, accent, art, chips, onPress, hero, bgColor, testID }: TileProps) {
  const C = useC();
  const s = useMemo(() => tileStyles(C), [C]);
  return (
    <TouchableOpacity
      testID={testID}
      style={[s.tile, hero && s.tileHero, { borderColor: accent + '44' }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Art layer */}
      <View style={s.artLayer}>{art}</View>

      {/* Gradient overlay — fade to card bg for text legibility */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={`ov${index}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.3" stopColor={bgColor} stopOpacity={0} />
            <Stop offset="1"   stopColor={bgColor} stopOpacity={0.92} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#ov${index})`} />
      </Svg>

      {/* Top-right: index number */}
      <Text style={[s.tileIndex, { color: accent }]}>{index}</Text>

      {/* Bottom: text content */}
      <View style={s.tileContent}>
        {chips && chips.length > 0 && (
          <View style={s.chipsRow}>
            {chips.map((chip, i) => (
              <View key={i} style={[s.chip, { borderColor: (chip.color ?? accent) + '88' }]}>
                <View style={[s.chipDot, { backgroundColor: chip.color ?? accent }]} />
                <Text style={[s.chipText, { color: chip.color ?? accent }]}>{chip.label}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[s.tileTitle, hero && s.tileTitleHero]}>{title}</Text>
        <Text style={s.tileSub}>{subtitle}</Text>
      </View>

      {/* Accent border glow (bottom) */}
      <View style={[s.accentBar, { backgroundColor: accent }]} />
    </TouchableOpacity>
  );
}

// ─── Dashboard ────────────────────────────────────────────

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function DashboardScreen({ onNavigate }: Props) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { historial } = useSession();
  const onlineCams = CAMERAS.filter(c => c.status === 'online').length;
  const totalCams  = CAMERAS.length + 1;

  return (
    <View style={s.root}>
      {/* Fondo global con textura */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="bgGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <Line x1="40" y1="0" x2="0" y2="0" stroke="#888888" strokeWidth="0.15" />
            <Line x1="0"  y1="0" x2="0" y2="40" stroke="#888888" strokeWidth="0.15" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={C.bg} />
        <Rect width="100%" height="100%" fill="url(#bgGrid)" opacity={0.3} />
      </Svg>

      <View style={s.grid}>
        {/* ── HERO: Análisis en Vivo ── */}
        <Tile
          hero
          testID="tile-live"
          index="01"
          title={'ANÁLISIS\nEN VIVO'}
          subtitle={`Pista ${SESSION.pista}  ·  ${SESSION.tournament}`}
          accent={C.cyan}
          art={<ArtAnalysis />}
          bgColor={C.card}
          chips={[
            { label: 'ACTIVO', color: C.live },
            { label: historial[0] ? `CONFIANZA ${historial[0].confidence}%` : 'SIN DATOS', color: C.green },
          ]}
          onPress={() => onNavigate('live')}
        />

        {/* ── Cámaras + Configuración ── */}
        <View style={s.row}>
          <Tile
            index="02"
            title="CÁMARAS"
            subtitle={`${onlineCams} / ${totalCams} en línea`}
            accent={C.green}
            art={<ArtCameras />}
            bgColor={C.card}
            chips={[{ label: `${onlineCams} EN LÍNEA`, color: C.green }]}
            onPress={() => onNavigate('cameras')}
          />
          <Tile
            index="03"
            title="CONFIGURACIÓN"
            subtitle={`${SYSTEM.modelVersion}  ·  ${SYSTEM.throughputFps} fps`}
            accent="#818cf8"
            art={<ArtConfig />}
            bgColor={C.card}
            chips={[{ label: 'SISTEMA LISTO', color: '#818cf8' }]}
            onPress={() => onNavigate('config')}
          />
        </View>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.footerText}>SABRE.AI  ·  SISTEMA DE VIDEO ARBITRAJE INTELIGENTE</Text>
        <Text style={s.footerText}>
          LATENCIA {SYSTEM.latencyAvgMs} ms  ·  {SYSTEM.framesProcessed.toLocaleString()} FRAMES  ·  {SYSTEM.precisionPct}% PRECISIÓN
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  grid: { flex: 1, flexDirection: 'row', padding: 10, gap: 10 },
  row:  { flex: 1, flexDirection: 'row', gap: 10 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 5,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  footerText: { color: C.textDim, fontSize: 8, letterSpacing: 0.4 },
});

const tileStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  tile: {
    flex: 1, backgroundColor: C.card,
    borderWidth: 1, borderRadius: 6,
    overflow: 'hidden', position: 'relative',
  },
  tileHero: { flex: 1.7 },
  artLayer: { ...StyleSheet.absoluteFill, opacity: 0.7 },
  tileIndex: {
    position: 'absolute', top: 10, right: 12,
    fontSize: 12, fontWeight: '800', letterSpacing: 1, opacity: 0.7,
  },
  tileContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, paddingBottom: 18, gap: 4,
  },
  chipsRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: '#00000044',
  },
  chipDot:  { width: 4, height: 4, borderRadius: 2 },
  chipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  tileTitle: {
    color: C.text, fontSize: 18, fontWeight: '900',
    letterSpacing: 1.5, lineHeight: 22,
  },
  tileTitleHero: { fontSize: 28, lineHeight: 32, letterSpacing: 2 },
  tileSub:  { color: C.textMuted, fontSize: 10, letterSpacing: 0.5 },
  accentBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, opacity: 0.7,
  },
});
