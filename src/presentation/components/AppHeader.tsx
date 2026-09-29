import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useC, useTheme } from '../context/ThemeContext';
import { useCombat } from '../context/CombatContext';
import { useHealth, type Conexion } from '../hooks/useHealth';
import { CONTROL_HEIGHT, FONT, RADIUS, space } from '../theme/tokens';
import type { Screen } from '../../../App';

/** Navegación de la Validación 1. */
const NAV: { screen: Screen; label: string }[] = [
  { screen: 'dashboard', label: 'Inicio' },
  { screen: 'live',      label: 'Revisión VAR' },
  { screen: 'history',   label: 'Historial' },
  { screen: 'config',    label: 'Combate' },
];

const CONEXION_LABEL: Record<Conexion, string> = {
  verificando:  'Verificando',
  ok:           'Conectado',
  degradado:    'Degradado',
  sin_conexion: 'Sin conexión',
};

interface Props {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function AppHeader({ screen, onNavigate }: Props) {
  const C = useC();
  const { theme, toggleTheme } = useTheme();
  const { combate, finalizarCombate } = useCombat();
  const conexion = useHealth();
  const s = useMemo(() => styles(C), [C]);
  const conexionColor =
    conexion === 'ok' ? C.green : conexion === 'verificando' ? C.textMuted : conexion === 'degradado' ? C.orange : C.red;

  return (
    <View style={s.bar}>
      {/* ── Izquierda: nombre + navegación ── */}
      <View style={s.left}>
        <Text style={s.logoName}>SABRE.AI</Text>
        <View style={s.nav}>
          {NAV.map(n => (
            <TouchableOpacity
              key={n.screen}
              testID={`nav-${n.screen}`}
              accessibilityRole="button"
              style={[s.navBtn, screen === n.screen && s.navBtnActive]}
              onPress={() => onNavigate(n.screen)}
            >
              <Text style={[s.navText, screen === n.screen && s.navTextActive]}>{n.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Derecha: combate activo, conexión y tema ── */}
      <View style={s.right}>
        {combate && (
          <>
            <Text testID="header-pista" style={s.meta}>Pista {combate.pista}</Text>
            <Text testID="header-arbitro" style={s.meta}>Árbitro: {combate.arbitro}</Text>
            <TouchableOpacity
              testID="finalizar-combate-btn"
              accessibilityRole="button"
              style={s.themeBtn}
              onPress={() => { finalizarCombate(); onNavigate('config'); }}
            >
              <Text style={s.themeLabel}>Finalizar combate</Text>
            </TouchableOpacity>
          </>
        )}
        <View testID="health-indicator" style={s.healthChip}>
          <View style={[s.healthDot, { backgroundColor: conexionColor }]} />
          <Text style={[s.healthText, { color: conexionColor }]}>{CONEXION_LABEL[conexion]}</Text>
        </View>

        <TouchableOpacity testID="theme-toggle" accessibilityRole="button" style={s.themeBtn} onPress={toggleTheme}>
          <Text style={s.themeLabel}>{theme === 'light' ? '☀ Tema claro' : '☾ Tema oscuro'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  bar: {
    minHeight: space(16),
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    columnGap: space(4),
    rowGap: space(2),
  },
  left:     { flexDirection: 'row', alignItems: 'center', gap: space(4) },
  logoName: { color: C.text, fontSize: FONT.md, fontWeight: '800' },
  nav:      { flexDirection: 'row', gap: space(1) },
  navBtn: {
    minHeight: CONTROL_HEIGHT, justifyContent: 'center',
    paddingHorizontal: space(3), borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'transparent',
  },
  navBtnActive:  { borderColor: C.cyan, backgroundColor: C.cyan + '18' },
  navText:       { color: C.textMuted, fontSize: FONT.sm, fontWeight: '600' },
  navTextActive: { color: C.text, fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center', gap: space(3), flexWrap: 'wrap' },
  meta:  { color: C.textMuted, fontSize: FONT.sm },
  healthChip: {
    flexDirection: 'row', alignItems: 'center', gap: space(1.5),
    paddingHorizontal: space(2), paddingVertical: space(1), borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.border,
  },
  healthDot:  { width: 8, height: 8, borderRadius: 4 },
  healthText: { fontSize: FONT.xs, fontWeight: '700' },
  themeBtn: {
    minHeight: CONTROL_HEIGHT, justifyContent: 'center',
    paddingHorizontal: space(3), borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: C.borderBright, backgroundColor: C.card,
  },
  themeLabel: { color: C.text, fontSize: FONT.sm, fontWeight: '600' },
});
