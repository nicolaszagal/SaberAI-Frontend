import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useC } from '../context/ThemeContext';
import type { CameraInfo } from '../../domain/entities/Camera';

function PositionDiagram({ role }: { role: string }) {
  const C = useC();
  const isLeft    = role.toLowerCase().includes('izquierda');
  const isCenital = role.toLowerCase().includes('cenital');
  const camX = isLeft ? 10 : isCenital ? 39 : 68;
  const camY = isCenital ? 5 : 24;

  return (
    <Svg width={78} height={50} viewBox="0 0 78 50">
      {[[5,5],[73,5],[5,45],[73,45],[39,5],[39,45]].map(([cx,cy],i) => (
        <Circle key={i} cx={cx} cy={cy} r={i<4?3:2}
          fill="none" stroke={C.cyan} strokeWidth={i<4?1:0.6} opacity={i<4?0.7:0.35} />
      ))}
      <Line x1={5}  y1={5}  x2={73} y2={5}  stroke={C.cyan} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.35} />
      <Line x1={5}  y1={45} x2={73} y2={45} stroke={C.cyan} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.35} />
      <Line x1={5}  y1={5}  x2={5}  y2={45} stroke={C.cyan} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.35} />
      <Line x1={73} y1={5}  x2={73} y2={45} stroke={C.cyan} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.35} />
      <Line x1={camX} y1={camY} x2={39} y2={25}
        stroke={C.cyan} strokeWidth={0.5} strokeDasharray="2 3" opacity={0.25} />
      <Circle cx={camX} cy={camY} r={4} fill={C.cyan} opacity={0.9} />
    </Svg>
  );
}

function Field({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const C = useC();
  const s = useMemo(() => fieldStyles(C), [C]);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

interface Props {
  camera: CameraInfo;
  onCalibrate?: () => void;
}

export function CameraCard({ camera, onCalibrate }: Props) {
  const C = useC();
  const s = useMemo(() => cardStyles(C), [C]);
  const online      = camera.status === 'online';
  const calibrating = camera.status === 'calibrating';
  const statusColor = online ? C.green : calibrating ? C.orange : C.textMuted;
  const statusLabel = online ? 'EN LÍNEA' : calibrating ? 'CALIBRAR' : 'OFFLINE';

  return (
    <View style={[s.card, calibrating && s.cardCalib]}>
      <View style={s.diagram}><PositionDiagram role={camera.role} /></View>
      <View style={s.statusRow}>
        <View style={[s.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[s.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      <View style={s.divider} />
      <Field label="ROL"        value={camera.role} />
      <Field label="RESOLUCIÓN" value={camera.resolution} />
      <Field label="FPS"        value={String(camera.fps)} />
      <Field label="EXPOSICIÓN" value={camera.exposure} />
      <Field label="IP"         value={camera.ip} />
      <Field label="LATENCIA"   value={`${camera.latencyMs} ms`}
        valueColor={camera.latencyMs > 40 ? C.orange : C.cyan} />
      <Field label="POSE ML"    value={camera.poseML ? 'Activo' : 'Inactivo'}
        valueColor={camera.poseML ? C.green : C.textMuted} />
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.btnSec, calibrating && s.btnSecActive]}
          onPress={onCalibrate}
        >
          <Text style={[s.btnSecText, calibrating && s.btnSecTextActive]}>
            {calibrating ? '⬤ CALIBRAR' : '● CALIBRAR'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnPri}>
          <Text style={s.btnPriText}>▶ TEST POSE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  card: {
    flex: 1, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 10, gap: 6,
  },
  cardCalib:   { borderColor: C.orange },
  diagram:     { alignItems: 'center', paddingVertical: 4 },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  divider:     { height: 1, backgroundColor: C.border, marginVertical: 2 },
  actions:     { flexDirection: 'row', gap: 6, marginTop: 4 },
  btnSec: {
    flex: 1, paddingVertical: 8, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, borderRadius: 4, alignItems: 'center',
  },
  btnSecActive:     { borderColor: C.orange, backgroundColor: C.orange + '18' },
  btnSecText:       { color: C.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  btnSecTextActive: { color: C.orange },
  btnPri: {
    flex: 1, paddingVertical: 8, backgroundColor: C.cyan + '22',
    borderWidth: 1, borderColor: C.cyan, borderRadius: 4, alignItems: 'center',
  },
  btnPriText: { color: C.cyan, fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
});

const fieldStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  field: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: C.textMuted, fontSize: 10, letterSpacing: 0.3 },
  value: { color: C.text,      fontSize: 10, fontWeight: '600' },
});
