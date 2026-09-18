import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { HistorialPanel } from '../components/HistorialPanel';
import { ActionPanel } from '../components/ActionPanel';
import { LiveCameraView } from '../components/LiveCameraView';
import { WS_FRONT_CAMERA_URL, WS_TOP_CAMERA_URL } from '../../infrastructure/config';

export function LiveScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);

  return (
    <View style={s.root}>
      {/* ── Zona principal: cámaras + historial ── */}
      <View style={s.contentZone}>
        {/* Vista frontal */}
        <View style={s.videoFrontalArea}>
          <LiveCameraView url={WS_FRONT_CAMERA_URL} label="FRONTAL" />
        </View>

        {/* Vista cenital */}
        <View style={s.videoTopArea}>
          <LiveCameraView url={WS_TOP_CAMERA_URL} label="CENITAL" compact style={s.videoTopInner} />
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

  videoFrontalArea: { flex: 3, backgroundColor: '#000' },

  videoTopArea: {
    flex: 1,
    backgroundColor: '#000',
    borderLeftWidth: 1, borderLeftColor: C.border,
    borderRightWidth: 1, borderRightColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  videoTopInner: { height: '100%', aspectRatio: 9 / 16 },

  historialArea: { flex: 1.1 },
});
