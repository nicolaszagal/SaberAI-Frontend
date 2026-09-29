import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useC } from '../context/ThemeContext';
import { HistorialPanel } from '../components/HistorialPanel';
import { ActionPanel } from '../components/ActionPanel';
import { Button } from '../components/Button';
import { StateMessage } from '../components/StateMessage';
import { useSession } from '../context/SessionContext';
import { useCombat } from '../context/CombatContext';
import { useShortcut } from '../hooks/useShortcut';
import { FENCER_LABEL } from '../theme/fencer';
import { CONTROL_HEIGHT, FONT, RADIUS, space } from '../theme/tokens';
import type { Screen } from '../../../App';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function LiveScreen({ onNavigate }: Props) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { combate } = useCombat();
  const { submitClip, sessionStatus, errorMessage, resetSession } = useSession();

  const [hasLuzA, setHasLuzA]   = useState(false);
  const [hasLuzB, setHasLuzB]   = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [clipFile, setClipFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(URL.createObjectURL(file));
    setFileName(file.name);
    setClipFile(file);
    resetSession();
  }

  function openFilePicker() {
    if (Platform.OS !== 'web' || isAnalyzing) return;
    fileInputRef.current?.click();
  }

  async function handleAnalyze() {
    if (!clipFile || !combate || sessionStatus === 'analyzing') return;
    await submitClip(clipFile, hasLuzA, hasLuzB, combate);
  }

  const isAnalyzing = sessionStatus === 'analyzing';
  const isDone      = sessionStatus === 'done';
  const isError     = sessionStatus === 'error';
  const isAnalyzeDisabled = !clipFile || !combate || isAnalyzing;

  useShortcut({ tecla: 's', activo: !isAnalyzing }, openFilePicker);
  useShortcut({ tecla: 'Enter', activo: !isAnalyzeDisabled }, handleAnalyze);

  const luzHint = hasLuzA && hasLuzB ? 'Ambas luces' : hasLuzA ? 'Luz A' : hasLuzB ? 'Luz B' : 'Sin luz';

  return (
    <View style={s.root}>
      {/* Hidden file input — attached to DOM so Playwright can setInputFiles() */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          data-testid="file-input"
          style={{ display: 'none' } as React.CSSProperties}
          onChange={handleFileChange}
        />
      )}

      {/* ── Luz Favero (señal simulada, D-12) ── */}
      <View style={s.luzBar}>
        <Text style={s.luzLabel}>Luz Favero (simulada)</Text>

        <TouchableOpacity
          testID="luz-a-btn"
          accessibilityRole="button"
          accessibilityState={{ selected: hasLuzA }}
          style={[s.luzBtn, hasLuzA && { backgroundColor: C.red + '22', borderColor: C.red }]}
          onPress={() => setHasLuzA(v => !v)}
        >
          <Text style={[s.luzBtnText, { color: hasLuzA ? C.red : C.textMuted }]}>
            {hasLuzA ? '● ' : '○ '}{FENCER_LABEL.ROJ}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="luz-b-btn"
          accessibilityRole="button"
          accessibilityState={{ selected: hasLuzB }}
          style={[s.luzBtn, hasLuzB && { backgroundColor: C.green + '22', borderColor: C.green }]}
          onPress={() => setHasLuzB(v => !v)}
        >
          <Text style={[s.luzBtnText, { color: hasLuzB ? C.green : C.textMuted }]}>
            {hasLuzB ? '● ' : '○ '}{FENCER_LABEL.VER}
          </Text>
        </TouchableOpacity>

        <Text testID="luz-hint" style={s.luzHint}>{luzHint}</Text>
      </View>

      {/* ── Zona principal: video + historial ── */}
      <View style={s.contentZone}>
        <View style={s.videoArea}>
          {Platform.OS === 'web' ? (
            videoSrc ? (
              <video
                src={videoSrc}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' } as any}
              />
            ) : (
              <View style={s.videoPlaceholder}>
                <Text style={s.videoPlaceholderTitle}>Sin clip cargado</Text>
                <Text style={s.videoPlaceholderText}>Pulsa «Seleccionar clip» (tecla S) para elegir un MP4 o MOV.</Text>
              </View>
            )
          ) : (
            <View style={s.videoPlaceholder}>
              <Text style={s.videoPlaceholderText}>Video disponible solo en web</Text>
            </View>
          )}
        </View>

        <View style={s.historialArea}>
          <HistorialPanel />
        </View>
      </View>

      {/* ── Avisos: sin combate, error o resultado ── */}
      {!combate && (
        <View style={s.notice}>
          <StateMessage
            testID="sin-combate" tipo="vacio"
            titulo="No hay combate activo"
            siguiente="Registra a los tiradores A y B para poder analizar un clip."
            accion={{ label: 'Configurar combate', onPress: () => onNavigate('config') }}
          />
        </View>
      )}
      {isAnalyzing && (
        <View style={s.notice}>
          <StateMessage testID="status-analyzing" tipo="cargando" titulo="Analizando el clip…" siguiente="La sugerencia llega en menos de 60 s." />
        </View>
      )}
      {isError && errorMessage && (
        <View style={s.notice}>
          <StateMessage
            testID="status-error" tipo="error"
            titulo="No se pudo analizar el clip"
            siguiente={`${errorMessage.replace(/\.?\s*$/, '.')} Revisa el clip y vuelve a intentarlo.`}
            accion={{ label: 'Reintentar', shortcut: 'Intro', onPress: handleAnalyze }}
          />
        </View>
      )}

      {/* ── Barra de control ── */}
      <View style={s.controlBar}>
        <Button testID="select-clip-btn" label="Seleccionar clip" shortcut="S" onPress={openFilePicker} disabled={isAnalyzing} />

        <Text testID="filename-display" style={s.fileNameText} numberOfLines={1}>
          {fileName ?? 'Ningún archivo seleccionado'}
        </Text>

        {isDone && (
          <Text testID="status-done" style={[s.statusText, { color: C.green }]}>✓ Sugerencia recibida</Text>
        )}

        <Button
          testID="analizar-btn"
          variant="primary"
          label={isAnalyzing ? 'Analizando…' : 'Analizar'}
          shortcut="Intro"
          onPress={handleAnalyze}
          disabled={isAnalyzeDisabled}
        />
      </View>

      {/* ── Panel de sugerencia y decisión ── */}
      <ActionPanel />
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  luzBar: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    paddingHorizontal: space(4), paddingVertical: space(2), gap: space(3),
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  luzLabel: { color: C.textMuted, fontSize: FONT.sm, fontWeight: '600' },
  luzBtn: {
    minHeight: CONTROL_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: space(4), borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderBright,
    backgroundColor: C.card,
  },
  luzBtnText: { fontSize: FONT.sm, fontWeight: '800' },
  luzHint:    { color: C.text, fontSize: FONT.sm, fontWeight: '600' },

  contentZone: { flex: 1, flexDirection: 'row', minHeight: 200 },

  videoArea: { flex: 3, backgroundColor: '#000', borderRightWidth: 1, borderRightColor: C.border },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space(2), padding: space(4) },
  videoPlaceholderTitle: { color: '#ffffff', fontSize: FONT.lg, fontWeight: '700' },
  videoPlaceholderText:  { color: '#d1d5db', fontSize: FONT.sm, textAlign: 'center' },

  historialArea: { flex: 1.1, minWidth: 240 },

  notice: { paddingHorizontal: space(4), paddingTop: space(3) },

  controlBar: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    paddingHorizontal: space(4), paddingVertical: space(2), gap: space(3),
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  fileNameText: { flex: 1, minWidth: 120, color: C.textMuted, fontSize: FONT.sm },
  statusText:   { fontSize: FONT.sm, fontWeight: '700' },
});
