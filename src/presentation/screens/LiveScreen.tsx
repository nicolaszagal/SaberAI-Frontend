/**
 * LiveScreen — Revisión VAR (CU-05 a CU-07, CU-10)
 * Izquierda (≈70 %): reproductor del clip. Derecha (≈30 %): Paso 1 · Clip,
 * Paso 2 · Sugerencia y Paso 3 · Decisión del árbitro. El sistema solo sugiere (RNF-01).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useC } from '../context/ThemeContext';
import { ClipPlayer } from '../components/ClipPlayer';
import { PasoClip, PasoSugerencia, PasoDecision } from '../components/PanelRevision';
import { StateMessage } from '../components/StateMessage';
import { useSession } from '../context/SessionContext';
import { useCombat } from '../context/CombatContext';
import { useShortcut } from '../hooks/useShortcut';
import { space } from '../theme/tokens';
import type { Screen } from '../../../App';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export function LiveScreen({ onNavigate }: Props) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const { combate, validando, errorValidacion, reintentarValidacion } = useCombat();
  const { submitClip, sessionStatus, resetSession } = useSession();

  const [videoSrc, setVideoSrc]   = useState<string | null>(null);
  const [fileName, setFileName]   = useState<string | null>(null);
  const [clipFile, setClipFile]   = useState<File | null>(null);
  const [tLuzAMs, setTLuzAMs]     = useState<number | null>(null);
  const [tLuzBMs, setTLuzBMs]     = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  // Libera la URL del clip al cambiarlo o al salir de la pantalla.
  useEffect(() => () => { if (videoSrc) URL.revokeObjectURL(videoSrc); }, [videoSrc]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoSrc(URL.createObjectURL(file));
    setFileName(file.name);
    setClipFile(file);
    setTLuzAMs(null);
    setTLuzBMs(null);
    resetSession();
  }

  function openFilePicker() {
    if (Platform.OS !== 'web' || isAnalyzing) return;
    fileInputRef.current?.click();
  }

  /** Toma el instante actual del reproductor como el de una luz (RF-02), en ms desde el inicio. */
  function marcarLuz(poner: (ms: number) => void) {
    const v = videoRef.current;
    if (!v || !clipFile || isAnalyzing) return;
    const maximo = Number.isFinite(v.duration) ? Math.floor(v.duration * 1000) : Infinity;
    poner(Math.min(Math.round(v.currentTime * 1000), maximo));
  }
  const marcarLuzA = () => marcarLuz(setTLuzAMs);
  const marcarLuzB = () => marcarLuz(setTLuzBMs);

  const isAnalyzing = sessionStatus === 'analyzing';
  const faltante =
    !combate ? 'un combate activo'
    : !clipFile ? 'elegir un clip'
    : tLuzAMs === null && tLuzBMs === null ? 'marcar la luz A o la luz B'
    : null;

  async function handleAnalyze() {
    if (faltante !== null || isAnalyzing || !clipFile) return;
    await submitClip({ file: clipFile, tLuzAMs, tLuzBMs });
  }

  useShortcut({ tecla: 's', activo: !isAnalyzing }, openFilePicker);
  useShortcut({ tecla: 'Enter', activo: faltante === null && !isAnalyzing }, handleAnalyze);
  // R (ROJ) y V (VER): no chocan con S, Enter, A (anular), Esc, "," ni ".".
  useShortcut({ tecla: 'r', activo: !!clipFile && !isAnalyzing }, marcarLuzA);
  useShortcut({ tecla: 'v', activo: !!clipFile && !isAnalyzing }, marcarLuzB);

  return (
    <View style={s.root}>
      {/* Selector de archivo oculto, en el DOM para que Playwright pueda usar setInputFiles() */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          data-testid="file-input"
          style={{ display: 'none' } as React.CSSProperties}
          onChange={handleFileChange}
        />
      )}

      <View style={s.contentZone}>
        <View style={s.videoArea}>
          <ClipPlayer src={videoSrc} videoRef={videoRef} />
        </View>

        <ScrollView style={s.panel} contentContainerStyle={s.panelContent}>
          {validando && (
            <View style={s.aviso}>
              <StateMessage testID="validando-combate" tipo="cargando" titulo="Verificando el combate activo…" />
            </View>
          )}
          {errorValidacion && (
            <View style={s.aviso}>
              <StateMessage
                testID="error-combate" tipo="error"
                titulo="No se pudo verificar el combate activo"
                siguiente={`${errorValidacion.replace(/\.?\s*$/, '.')} Comprueba la conexión con el Fog.`}
                accion={{ label: 'Reintentar', onPress: reintentarValidacion }}
              />
            </View>
          )}
          {!combate && !validando && !errorValidacion && (
            <View style={s.aviso}>
              <StateMessage
                testID="sin-combate" tipo="vacio"
                titulo="No hay combate activo"
                siguiente="Registra a los tiradores A y B para poder analizar un clip."
                accion={{ label: 'Configurar combate', onPress: () => onNavigate('config') }}
              />
            </View>
          )}

          <PasoClip
            fileName={fileName}
            onElegirClip={openFilePicker}
            tLuzAMs={tLuzAMs} tLuzBMs={tLuzBMs}
            onMarcarLuzA={marcarLuzA} onMarcarLuzB={marcarLuzB}
            onQuitarLuzA={() => setTLuzAMs(null)} onQuitarLuzB={() => setTLuzBMs(null)}
            onAnalizar={handleAnalyze} faltante={faltante}
          />
          <PasoSugerencia />
          <PasoDecision />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  contentZone: { flex: 1, flexDirection: 'row', minHeight: 320 },
  videoArea: { flex: 7, backgroundColor: '#000', borderRightWidth: 1, borderRightColor: C.border },
  panel: { flex: 3, minWidth: 320, backgroundColor: C.surface },
  panelContent: { paddingBottom: space(4) },
  aviso: { paddingHorizontal: space(3), paddingTop: space(3) },
});
