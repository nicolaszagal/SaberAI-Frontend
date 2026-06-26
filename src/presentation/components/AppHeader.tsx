import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useC, useTheme } from '../context/ThemeContext';
import { SESSION } from '../../data/mock';
import type { Screen } from '../../../App';

const SCREEN_LABELS: Record<Screen, string> = {
  dashboard:  '',
  live:       'ANÁLISIS EN VIVO',
  cameras:    'ESTADO DE CÁMARAS',
  config:     'CONFIGURACIÓN',
  history:    'HISTORIAL DEL ENCUENTRO',
  tournament: 'TORNEO & EXPORTAR PDF',
};

interface Props {
  screen: Screen;
  onBack: () => void;
}

export function AppHeader({ screen, onBack }: Props) {
  const C = useC();
  const { theme, toggleTheme } = useTheme();
  const isDashboard = screen === 'dashboard';
  const s = useMemo(() => styles(C), [C]);

  return (
    <View style={s.bar}>
      {/* ── Izquierda: logo + back ── */}
      <View style={s.left}>
        {!isDashboard && Platform.OS !== 'web' && (
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Text style={s.backArrow}>← VOLVER</Text>
          </TouchableOpacity>
        )}
        <Text style={s.logoDot}>● </Text>
        <Text style={s.logoName}>SABRE.AI</Text>
        <Text style={s.logoSep}> / </Text>
        <Text style={s.logoSub}>
          {isDashboard ? 'video arbitraje' : SCREEN_LABELS[screen]}
        </Text>
      </View>

      {/* ── Centro: live badge ── */}
      {!isDashboard && (
        <View style={s.liveChip}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>En directo</Text>
        </View>
      )}

      {/* ── Derecha: sesión + toggle tema ── */}
      <View style={s.right}>
        <Text style={s.meta}>TORNEO {SESSION.tournament}</Text>
        <Text style={s.sep}>·</Text>
        <Text style={s.meta}>PISTA {SESSION.pista}</Text>
        <Text style={s.sep}>·</Text>
        <Text style={s.meta}>ÁRBITRO {SESSION.arbitro}</Text>

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
  backBtn: {
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  backArrow: { color: C.text, fontSize: 13, fontWeight: '600' },
  logoDot:  { color: C.cyan, fontSize: 16 },
  logoName: { color: C.text, fontSize: 16, fontWeight: '800', letterSpacing: 1.5 },
  logoSep:  { color: C.textMuted, fontSize: 15 },
  logoSub:  { color: C.textMuted, fontSize: 13, letterSpacing: 0.6, fontWeight: '500' },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.live,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 6,
    backgroundColor: C.live + '18',
  },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.live },
  liveText: { color: C.liveText, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
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
