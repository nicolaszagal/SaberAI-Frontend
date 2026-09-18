import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useC } from '../context/ThemeContext';
import { HistorialPanel } from '../components/HistorialPanel';
import { ActionPanel } from '../components/ActionPanel';
import { useSession } from '../context/SessionContext';

export function LiveScreen() {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
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
    if (Platform.OS !== 'web') return;
    fileInputRef.current?.click();
  }

  async function handleAnalyze() {
    if (!clipFile || sessionStatus === 'analyzing') return;
    await submitClip(clipFile, hasLuzA, hasLuzB);
  }

  const isAnalyzing = sessionStatus === 'analyzing';
  const isDone      = sessionStatus === 'done';
  const isError     = sessionStatus === 'error';
  const isAnalyzeDisabled = !clipFile || isAnalyzing;

  const luzHint = hasLuzA && hasLuzB ? 'AMBAS LUCES' : hasLuzA ? 'LUZ A' : hasLuzB ? 'LUZ B' : 'SIN LUZ';

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

      {/* ── Barra de Luz Favero ── */}
      <View style={s.luzBar}>
        <Text style={s.luzLabel}>LUZ FAVERO</Text>

        <TouchableOpacity
          testID="luz-a-btn"
          style={[s.luzBtn, hasLuzA && { backgroundColor: C.red + '30', borderColor: C.red }]}
          onPress={() => setHasLuzA(v => !v)}
        >
          <View style={[s.luzDot, { backgroundColor: hasLuzA ? C.red : C.border }]} />
          <Text style={[s.luzBtnText, { color: hasLuzA ? C.red : C.textMuted }]}>ROJ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="luz-b-btn"
          style={[s.luzBtn, hasLuzB && { backgroundColor: C.green + '30', borderColor: C.green }]}
          onPress={() => setHasLuzB(v => !v)}
        >
          <View style={[s.luzDot, { backgroundColor: hasLuzB ? C.green : C.border }]} />
          <Text style={[s.luzBtnText, { color: hasLuzB ? C.green : C.textMuted }]}>VER</Text>
        </TouchableOpacity>

        <Text testID="luz-hint" style={s.luzHint}>{luzHint}</Text>
      </View>

      {/* ── Zona principal: video + historial ── */}
      <View style={s.contentZone}>
        {/* Video player */}
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
                <Text style={s.videoPlaceholderIcon}>▶</Text>
                <Text style={s.videoPlaceholderText}>Seleccioná un clip para analizar</Text>
              </View>
            )
          ) : (
            <View style={s.videoPlaceholder}>
              <Text style={s.videoPlaceholderText}>Video disponible solo en web</Text>
            </View>
          )}
        </View>

        {/* Historial lateral */}
        <View style={s.historialArea}>
          <HistorialPanel />
        </View>
      </View>

      {/* ── Barra de control ── */}
      <View style={s.controlBar}>
        <TouchableOpacity
          testID="select-clip-btn"
          style={s.fileBtn}
          onPress={openFilePicker}
          disabled={isAnalyzing}
        >
          <Text style={s.fileBtnText}>📁  SELECCIONAR CLIP</Text>
        </TouchableOpacity>

        <Text testID="filename-display" style={s.fileNameText} numberOfLines={1}>
          {fileName ?? 'Ningún archivo seleccionado'}
        </Text>

        {isError && errorMessage && (
          <Text testID="status-error" style={[s.statusText, { color: C.red }]} numberOfLines={1}>
            {errorMessage}
          </Text>
        )}
        {isDone && (
          <Text testID="status-done" style={[s.statusText, { color: C.green }]}>
            ✓ Veredicto recibido
          </Text>
        )}

        <TouchableOpacity
          testID="analizar-btn"
          style={[s.analyzeBtn, isAnalyzeDisabled && s.analyzeBtnDisabled]}
          onPress={handleAnalyze}
          disabled={isAnalyzeDisabled}
        >
          <Text style={[s.analyzeBtnText, isAnalyzeDisabled && { color: C.textMuted }]}>
            {isAnalyzing ? '⏳  ANALIZANDO...' : '▶  ANALIZAR'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Panel de acción (veredicto) ── */}
      <ActionPanel />
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  luzBar: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 10,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  luzLabel: { color: C.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  luzBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 4, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card,
  },
  luzDot:     { width: 8, height: 8, borderRadius: 4 },
  luzBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  luzHint:    { color: C.textDim, fontSize: 9, marginLeft: 4 },

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

  controlBar: {
    height: 52, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 10,
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  fileBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 4, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card,
  },
  fileBtnText: { color: C.text, fontSize: 11, fontWeight: '600' },
  fileNameText: {
    flex: 1, color: C.textMuted, fontSize: 10,
  },
  statusText: { fontSize: 10, fontWeight: '600' },
  analyzeBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 4, borderWidth: 1, borderColor: C.cyan,
    backgroundColor: C.cyan + '20',
  },
  analyzeBtnDisabled: {
    borderColor: C.border,
    backgroundColor: C.card,
  },
  analyzeBtnText: { color: C.cyan, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
