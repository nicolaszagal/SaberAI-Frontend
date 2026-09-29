import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Rect, Pattern, Line,
  Circle, G, Path,
} from 'react-native-svg';
import { useC } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { useCombat } from '../context/CombatContext';
import { getModeloActivo } from '../../infrastructure/api/fogApi';
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

/** Historial: lista de revisiones */
function ArtHistory() {
  const C = useC();
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="gH" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={C.green} stopOpacity={0.15} />
          <Stop offset="1" stopColor={C.green} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="60" fill="url(#gH)" />
      {[12, 26, 40].map((y, i) => (
        <G key={y}>
          <Circle cx={14} cy={y} r={3} fill={i === 0 ? C.orange : C.green} opacity={0.85} />
          <Line x1={24} y1={y} x2={86 - i * 14} y2={y} stroke={C.green} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
        </G>
      ))}
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
  const { combate } = useCombat();
  const [modelo, setModelo] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getModeloActivo().then(m => { if (activo) setModelo(m.nombre); }).catch(() => {});
    return () => { activo = false; };
  }, []);

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
          title={'REVISIÓN\nVAR'}
          subtitle={combate ? `Pista ${combate.pista}  ·  ${combate.aliasA} vs ${combate.aliasB}` : 'Sin combate activo'}
          accent={C.cyan}
          art={<ArtAnalysis />}
          bgColor={C.card}
          chips={historial[0] ? [{ label: `CONFIANZA ${historial[0].confidence}%`, color: C.green }] : undefined}
          onPress={() => onNavigate('live')}
        />

        {/* ── Historial + Configuración del combate ── */}
        <View style={s.row}>
          <Tile
            testID="tile-history"
            index="02"
            title="HISTORIAL"
            subtitle="Revisiones registradas"
            accent={C.green}
            art={<ArtHistory />}
            bgColor={C.card}
            onPress={() => onNavigate('history')}
          />
          <Tile
            testID="tile-config"
            index="03"
            title={'CONFIGURACIÓN\nDEL COMBATE'}
            subtitle={combate ? `Combate activo  ·  ${combate.aliasA} vs ${combate.aliasB}` : 'Registrar tiradores A y B'}
            accent="#818cf8"
            art={<ArtConfig />}
            bgColor={C.card}
            onPress={() => onNavigate('config')}
          />
        </View>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.footerText}>SABRE.AI  ·  SISTEMA DE VIDEO ARBITRAJE INTELIGENTE</Text>
        {modelo && <Text style={s.footerText}>MODELO {modelo}</Text>}
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
