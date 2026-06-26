/**
 * ConfigScreen — Configuración del sistema
 * Placeholder: aquí irán los parámetros del modelo YOLO/LSTM,
 * umbrales de confianza, ajuste de FOV por cámara, etc.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet } from 'react-native';
import { useC } from '../context/ThemeContext';
import { SYSTEM, CAMERAS } from '../../data/mock';

function SectionTitle({ label }: { label: string }) {
  const C = useC();
  const s = useMemo(() => sectionStyles(C), [C]);
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{label}</Text>
    </View>
  );
}

function RowToggle({ label, sub, value, onToggle }: {
  label: string; sub?: string; value: boolean; onToggle: () => void;
}) {
  const C = useC();
  const s = useMemo(() => rowStyles(C), [C]);
  return (
    <View style={s.row}>
      <View style={s.rowInfo}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: C.border, true: C.cyan + '88' }}
        thumbColor={value ? C.cyan : C.textMuted}
      />
    </View>
  );
}

function RowValue({ label, sub, value, unit }: {
  label: string; sub?: string; value: string | number; unit?: string;
}) {
  const C = useC();
  const s = useMemo(() => rowStyles(C), [C]);
  return (
    <View style={s.row}>
      <View style={s.rowInfo}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      <View style={s.valueChip}>
        <Text style={s.valueText}>{value}</Text>
        {unit && <Text style={s.valueUnit}> {unit}</Text>}
      </View>
    </View>
  );
}

export function ConfigScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const [poseML, setPoseML]           = useState(true);
  const [autoVerdict, setAutoVerdict] = useState(false);
  const [rtpSync, setRtpSync]         = useState(true);
  const [cloudUpload, setCloudUpload] = useState(true);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>

      {/* Modelo */}
      <SectionTitle label="MODELO DE INFERENCIA" />
      <View style={s.card}>
        <RowValue  label="Modelo activo"     sub="Versión en producción"       value={SYSTEM.modelVersion} />
        <RowValue  label="Throughput"        sub="Frames procesados por segundo" value={SYSTEM.throughputFps} unit="fps" />
        <RowValue  label="Latencia promedio" sub="Edge → Fog → veredicto"      value={SYSTEM.latencyAvgMs} unit="ms" />
        <RowValue  label="Precisión sesión"  sub="Acciones correctamente clasificadas" value={`${SYSTEM.precisionPct}%`} />
        <RowToggle label="Pose ML activo"    sub="Activar estimación de pose en todas las cámaras" value={poseML} onToggle={() => setPoseML(v => !v)} />
        <RowToggle label="Veredicto automático" sub="El sistema confirma sin intervención del árbitro (experimental)" value={autoVerdict} onToggle={() => setAutoVerdict(v => !v)} />
      </View>

      {/* Red */}
      <SectionTitle label="RED Y SINCRONIZACIÓN" />
      <View style={s.card}>
        <RowToggle label="Sync RTP" sub={`Sincronización por protocolo RTP ±${SYSTEM.syncRtpMs} ms`} value={rtpSync} onToggle={() => setRtpSync(v => !v)} />
        <RowToggle label="Subida a Cloud" sub="Enviar clips y logs a almacenamiento S3/R2 automáticamente" value={cloudUpload} onToggle={() => setCloudUpload(v => !v)} />
        <RowValue  label="Almacenamiento libre" sub="Nodo de grabación local" value={`${SYSTEM.storageGbFree} GB`} />
      </View>

      {/* Cámaras */}
      <SectionTitle label="ESTADO DE CÁMARAS" />
      <View style={s.card}>
        {CAMERAS.map(cam => (
          <RowValue
            key={cam.id}
            label={`${cam.label} — ${cam.role}`}
            sub={`${cam.ip}  ·  ${cam.resolution}  ·  ${cam.fps} fps`}
            value={`${cam.latencyMs} ms`}
          />
        ))}
      </View>

      {/* Nota */}
      <View style={s.note}>
        <Text style={s.noteText}>
          ⚠  Esta pantalla es un placeholder. La configuración completa del sistema —
          umbrales de confianza, parámetros de calibración, ajuste de FOV y gestión del
          pipeline GStreamer — se integrará al conectar la capa Edge.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 8, maxWidth: 720, alignSelf: 'center', width: '100%' },
  card: {
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 6, overflow: 'hidden',
  },
  note: {
    borderWidth: 1, borderColor: C.orange + '55',
    backgroundColor: C.orange + '11',
    borderRadius: 6, padding: 12, marginTop: 8,
  },
  noteText: { color: C.orange, fontSize: 10, lineHeight: 15 },
});

const sectionStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  sectionHeader: {
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border,
    marginTop: 8, marginBottom: 4,
  },
  sectionTitle: { color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
});

const rowStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowInfo:  { flex: 1, gap: 2 },
  rowLabel: { color: C.text,     fontSize: 12, fontWeight: '600' },
  rowSub:   { color: C.textMuted,fontSize: 9 },
  valueChip: {
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4,
  },
  valueText: { color: C.cyan,    fontSize: 13, fontWeight: '700' },
  valueUnit: { color: C.textMuted,fontSize: 9 },
});
