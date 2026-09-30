import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { useCombat } from '../context/CombatContext';
import { getModeloActivo, getResumenSesion } from '../../infrastructure/api/fogApi';
import type { ResumenSesion, ResumenValidacion } from '../../domain/entities/Combate';
import { FONT, RADIUS, space } from '../theme/tokens';
import type { Screen } from '../../../App';

interface TileProps {
  title: string;
  /** Dato principal del bloque. */
  main: string;
  /** Qué se hace al abrir el bloque. */
  hint: string;
  accent: string;
  onPress: () => void;
  hero?: boolean;
  testID?: string;
}

function Tile({ title, main, hint, accent, onPress, hero, testID }: TileProps) {
  const C = useC();
  const s = useMemo(() => tileStyles(C), [C]);
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      style={[s.tile, hero && s.tileHero, { borderTopColor: accent }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={s.tileTitle}>{title}</Text>
      <Text style={[s.tileMain, hero && s.tileMainHero]}>{main}</Text>
      <Text style={s.tileHint}>{hint}</Text>
    </TouchableOpacity>
  );
}

function formatoLatencia(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** "8 revisiones · κ 0.33 (aceptable) · latencia p95 48 ms": solo con los datos que existen. */
function lineaResumen(v: ResumenValidacion): string {
  const partes = [`${v.nRevisiones} ${v.nRevisiones === 1 ? 'revisión' : 'revisiones'}`];
  if (v.kappa.calculable && v.kappa.kappa != null) {
    partes.push(`κ ${v.kappa.kappa.toFixed(2)}${v.kappa.banda ? ` (${v.kappa.banda})` : ''}`);
  }
  if (v.latencia.p95Ms != null) partes.push(`latencia p95 ${formatoLatencia(v.latencia.p95Ms)}`);
  else if (v.latencia.p95ExcedeUmbral) partes.push('latencia p95 > 60 s');
  return partes.join(' · ');
}

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function DashboardScreen({ onNavigate }: Props) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { combate } = useCombat();
  const [modelo, setModelo] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenSesion | null>(null);
  const eventoId = combate?.eventoId ?? null;

  useEffect(() => {
    let activo = true;
    getModeloActivo().then(m => { if (activo) setModelo(m.nombre); }).catch(() => {});
    return () => { activo = false; };
  }, []);

  // Resumen real de la sesión: si no hay evento o la consulta falla, no se muestra nada.
  useEffect(() => {
    setResumen(null);
    if (!eventoId) return undefined;
    let activo = true;
    getResumenSesion(eventoId).then(r => { if (activo) setResumen(r); }).catch(() => {});
    return () => { activo = false; };
  }, [eventoId]);

  const bloques = resumen
    ? ([['V1', 'Validación 1', resumen.V1], ['V2', 'Validación 2', resumen.V2]] as const)
      .filter(([, , v]) => v.nRevisiones > 0)
    : [];

  return (
    <View style={s.root}>
      <View style={s.grid}>
        <Tile
          hero
          testID="tile-live"
          title="Revisión VAR"
          main={combate ? `Pista ${combate.pista}` : 'Sin combate activo'}
          hint={combate ? `${combate.aliasA} (A · ROJ) vs ${combate.aliasB} (B · VER). Carga un clip para analizar.` : 'Configura un combate para empezar.'}
          accent={C.cyan}
          onPress={() => onNavigate('live')}
        />
        <View style={s.col}>
          <Tile
            testID="tile-history"
            title="Historial"
            main="Revisiones registradas"
            hint="Consulta las revisiones registradas."
            accent={C.green}
            onPress={() => onNavigate('history')}
          />
          <Tile
            testID="tile-config"
            title="Configuración del combate"
            main={combate ? 'Combate activo' : 'Sin combate'}
            hint={combate ? 'Crea uno nuevo si cambian los tiradores.' : 'Registra a los tiradores A y B.'}
            accent={C.blue}
            onPress={() => onNavigate('config')}
          />
        </View>
      </View>

      {bloques.length > 0 && (
        <View testID="resumen-sesion" style={s.resumen}>
          <Text style={s.resumenTitulo}>Resumen de la sesión</Text>
          {bloques.map(([clave, etiqueta, v]) => (
            <Text key={clave} testID={`resumen-${clave}`} style={s.resumenTexto}>
              {etiqueta} · {lineaResumen(v)}
            </Text>
          ))}
        </View>
      )}

      {modelo && (
        <View style={s.footer}>
          <Text style={s.footerText}>Modelo activo: {modelo}</Text>
        </View>
      )}
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  grid: { flex: 1, flexDirection: 'row', padding: space(4), gap: space(4) },
  col:  { flex: 1, minWidth: 280, gap: space(4) },
  footer: {
    paddingHorizontal: space(4), paddingVertical: space(2),
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface,
  },
  resumen: {
    paddingHorizontal: space(4), paddingVertical: space(3), gap: space(1),
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface,
  },
  resumenTitulo: { color: C.textMuted, fontSize: FONT.xs, fontWeight: '700' },
  resumenTexto:  { color: C.text, fontSize: FONT.md, fontWeight: '600' },
  footerText: { color: C.textMuted, fontSize: FONT.xs },
});

const tileStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  tile: {
    flex: 1, minHeight: 120, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 4,
    borderRadius: RADIUS.lg, padding: space(5), justifyContent: 'center', gap: space(2),
  },
  tileHero:     { flex: 1.4, minWidth: 320 },
  tileTitle:    { color: C.textMuted, fontSize: FONT.sm, fontWeight: '600' },
  tileMain:     { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  tileMainHero: { fontSize: FONT.xl },
  tileHint:     { color: C.textMuted, fontSize: FONT.sm },
});
