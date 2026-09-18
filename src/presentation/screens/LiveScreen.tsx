import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useC } from '../context/ThemeContext';
import { HistorialPanel } from '../components/HistorialPanel';
import { ActionPanel } from '../components/ActionPanel';

export function LiveScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);

  return (
    <View style={s.root}>
      {/* ── Zona principal: video + historial ── */}
      <View style={s.contentZone}>
        {/* Video player */}
        <View style={s.videoArea}>
          <View style={s.videoPlaceholder}>
            <Text style={s.videoPlaceholderIcon}>▶</Text>
            <Text style={s.videoPlaceholderText}>
              {Platform.OS === 'web' ? 'Sin clip cargado' : 'Video disponible solo en web'}
            </Text>
          </View>
        </View>

        {/* Historial lateral */}
        <View style={s.historialArea}>
          <HistorialPanel />
        </View>
      </View>

      {/* ── Panel de acción (veredicto) ── */}
      <ActionPanel />
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  contentZone: { flex: 1, flexDirection: 'row' },

  videoArea: {
    flex: 3,
    backgroundColor: '#000',
    borderRightWidth: 1, borderRightColor: C.border,
  },
  videoPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  videoPlaceholderIcon: { color: C.textDim, fontSize: 40 },
  videoPlaceholderText: { color: C.textDim, fontSize: 13, letterSpacing: 0.3 },

  historialArea: { flex: 1.1 },
});
