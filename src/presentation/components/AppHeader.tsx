import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useC, useTheme } from '../context/ThemeContext';
import { useCombat } from '../context/CombatContext';
import { useHealth, type Conexion } from '../hooks/useHealth';
import type { Screen } from '../../../App';

/** Navegación de la Validación 1. */
const NAV: { screen: Screen; label: string }[] = [
  { screen: 'dashboard', label: 'INICIO' },
  { screen: 'live',      label: 'REVISIÓN VAR' },
  { screen: 'history',   label: 'HISTORIAL' },
  { screen: 'config',    label: 'COMBATE' },
];

const CONEXION_LABEL: Record<Conexion, string> = {
  verificando:  'VERIFICANDO',
  ok:           'CONECTADO',
  degradado:    'DEGRADADO',
  sin_conexion: 'SIN CONEXIÓN',
};

interface Props {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function AppHeader({ screen, onNavigate }: Props) {
  const C = useC();
  const { theme, toggleTheme } = useTheme();
  const { combate } = useCombat();
  const conexion = useHealth();
  const s = useMemo(() => styles(C), [C]);
  const conexionColor =
    conexion === 'ok' ? C.green : conexion === 'verificando' ? C.textMuted : conexion === 'degradado' ? C.orange : C.red;

  return (
    <View style={s.bar}>
      {/* ── Izquierda: logo + navegación ── */}
      <View style={s.left}>
        <Text style={s.logoDot}>● </Text>
        <Text style={s.logoName}>SABRE.AI</Text>
        <View style={s.nav}>
          {NAV.map(n => (
            <TouchableOpacity
              key={n.screen}
              testID={`nav-${n.screen}`}
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
            <Text testID="header-pista" style={s.meta}>PISTA {combate.pista}</Text>
            <Text style={s.sep}>·</Text>
            <Text testID="header-arbitro" style={s.meta}>ÁRBITRO {combate.arbitro}</Text>
          </>
        )}
        <View testID="health-indicator" style={s.healthChip}>
          <View style={[s.healthDot, { backgroundColor: conexionColor }]} />
          <Text style={[s.healthText, { color: conexionColor }]}>{CONEXION_LABEL[conexion]}</Text>
        </View>

        <TouchableOpacity style={s.themeBtn} onPress={toggleTheme}>
          <Text style={s.themeIcon}>{theme === 'light' ? '☀' : '☾'}</Text>
          <Text style={s.themeLabel}>{theme === 'light' ? 'CLARO' : 'OSCURO'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  bar: {
    height: 52,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 14,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  logoDot:  { color: C.cyan, fontSize: 16 },
  logoName: { color: C.text, fontSize: 16, fontWeight: '800', letterSpacing: 1.5 },
  logoSep:  { color: C.textMuted, fontSize: 15 },
  logoSub:  { color: C.textMuted, fontSize: 13, letterSpacing: 0.6, fontWeight: '500' },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.live },
  nav: { flexDirection: 'row', gap: 4, marginLeft: 16 },
  navBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: 'transparent' },
  navBtnActive: { borderColor: C.cyan, backgroundColor: C.cyan + '18' },
  navText: { color: C.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  navTextActive: { color: C.text },
  healthChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 6,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: C.border,
  },
  healthDot: { width: 7, height: 7, borderRadius: 4 },
  healthText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meta: { color: C.textMuted, fontSize: 11, letterSpacing: 0.3 },
  sep:  { color: C.textDim,   fontSize: 11 },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.borderBright,
    backgroundColor: C.card,
  },
  themeIcon:  { fontSize: 14 },
  themeLabel: { color: C.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
