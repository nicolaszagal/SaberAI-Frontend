import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { CameraCard } from '../components/CameraCard';
import { SystemStatusPanel } from '../components/SystemStatusPanel';
import { CalibrationModal } from '../components/CalibrationModal';
import type { CameraInfo } from '../../domain/entities/Camera';
import { CAMERAS } from '../../data/mock';

export function CamerasScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const onlineCount = CAMERAS.filter((c) => c.status === 'online').length;
  const [calibratingCamera, setCalibratingCamera] = useState<CameraInfo | null>(null);

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Cámaras conectadas */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>CÁMARAS CONECTADAS</Text>
          <Text style={s.sectionMeta}>
            {onlineCount} / {CAMERAS.length + 1} dispositivos  ·  sync RTP ±2 ms  ·  Toca CALIBRAR para iniciar calibración guiada por QR
          </Text>
        </View>
        <View style={s.cardsRow}>
          {CAMERAS.map((cam) => (
            <CameraCard
              key={cam.id}
              camera={cam}
              onCalibrate={() => setCalibratingCamera(cam)}
            />
          ))}
          {/* Slot vacío */}
          <View style={s.emptySlot}>
            <Text style={s.emptyText}>+ CONECTAR</Text>
          </View>
        </View>

        {/* Estado del sistema */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>ESTADO DEL SISTEMA</Text>
        </View>
        <SystemStatusPanel />

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>SABRE.AI · SISTEMA DE VIDEO ARBITRAJE INTELIGENTE</Text>
          <Text style={s.footerText}>PANTALLA 03 / 03 · CÁMARAS</Text>
          <Text style={s.footerText}>TEST · SABLE</Text>
        </View>
      </ScrollView>

      {/* Modal de calibración guiada */}
      <CalibrationModal
        camera={calibratingCamera}
        onClose={() => setCalibratingCamera(null)}
      />
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 14, gap: 12 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4,
  },
  sectionTitle: { color: C.text,     fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sectionMeta:  { color: C.textMuted,fontSize: 9,  letterSpacing: 0.3, flex: 1, textAlign: 'right' },
  cardsRow:     { flexDirection: 'row', gap: 12 },
  emptySlot: {
    flex: 1, borderWidth: 1, borderColor: C.border,
    borderStyle: 'dashed', borderRadius: 4,
    justifyContent: 'center', alignItems: 'center', minHeight: 180,
  },
  emptyText:  { color: C.textDim, fontSize: 10, letterSpacing: 1 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, marginTop: 4,
  },
  footerText: { color: C.textDim, fontSize: 8, letterSpacing: 0.3 },
});
