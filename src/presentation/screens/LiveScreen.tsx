/**
 * LiveScreen — Revisión VAR (CU-05 a CU-07, CU-10)
 * Izquierda (≈70 %): visor en bucle del último tocado capturado (o de cualquiera de la lista).
 * Derecha (≈30 %): "Últimos tocados" (con "Solicitar VAR" y decisión en pista), Paso 2 · Sugerencia
 * y Paso 3 · Decisión del árbitro. La carga manual de un archivo (V1) queda como respaldo (RNF-09).
 * El sistema solo sugiere (RNF-01).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useC } from '../context/ThemeContext';
import { ClipPlayer } from '../components/ClipPlayer';
import { PasoClip, PasoSugerencia, PasoDecision, EstadoAnalisis } from '../components/PanelRevision';
import { StateMessage } from '../components/StateMessage';
import { PanelTocados } from '../components/PanelTocados';
import { SenalPrueba } from '../components/SenalPrueba';
import { Button } from '../components/Button';
import { useTocados, useEstadoEdge } from '../hooks/useTocados';
import { useClipTocado } from '../hooks/useClipTocado';
import { registrarDecisionPista } from '../../infrastructure/api/tocadosApi';
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
  const { submitClip, abrirRevisionDeTocado, sessionStatus, resetSession } = useSession();
  const { tocados, error: errorTocados, refrescar } = useTocados(combate?.matchId ?? null);
  const { estado: edge } = useEstadoEdge();
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  const [videoSrc, setVideoSrc]   = useState<string | null>(null);
  const [fileName, setFileName]   = useState<string | null>(null);
  const [clipFile, setClipFile]   = useState<File | null>(null);
  const [tLuzAMs, setTLuzAMs]     = useState<number | null>(null);
  const [tLuzBMs, setTLuzBMs]     = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  // Llega un tocado nuevo: el visor pasa a su bucle (reemplaza al anterior).
  const ultimoId = tocados[0]?.tocadoId ?? null;
  useEffect(() => { setSeleccionId(null); }, [ultimoId]);
  const mostrado = tocados.find(t => t.tocadoId === seleccionId) ?? tocados[0] ?? null;
  const clipTocadoUrl = useClipTocado(mostrado?.tocadoId ?? null, mostrado?.tieneClip ?? false);
  const urlVisor = manual && videoSrc ? videoSrc : clipTocadoUrl;
  const insignia = !(manual && videoSrc) && mostrado?.estado === 'procesando' ? 'Procesando…'
    : !(manual && videoSrc) && mostrado?.estado === 'error' ? 'Error al procesar' : null;

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
    setManual(true);
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

  const pedibleId = tocados[0]?.admiteVar ? tocados[0].tocadoId : null;
  const ultimoVar = useRef<string | null>(null);
  async function handleSolicitarVar(id: string) {
    if (isAnalyzing) return;
    ultimoVar.current = id;
    setManual(false);
    await abrirRevisionDeTocado(id);
    refrescar();
  }
  async function handleDecision(id: string, clase: string | null) {
    try {
      await registrarDecisionPista(id, clase, combate?.arbitroId);
    } finally {
      refrescar();
    }
  }

  useShortcut({ tecla: 's', activo: manual && !isAnalyzing }, openFilePicker);
  useShortcut({ tecla: 'Enter', activo: manual ? faltante === null && !isAnalyzing : !!pedibleId && !isAnalyzing },
    () => { if (manual) void handleAnalyze(); else if (pedibleId) void handleSolicitarVar(pedibleId); });
  // R (ROJ) y V (VER): no chocan con S, Enter, A (anular), Esc, "," ni "."; 1, 2 y 3 son la señal de prueba.
  useShortcut({ tecla: 'r', activo: manual && !!clipFile && !isAnalyzing }, marcarLuzA);
  useShortcut({ tecla: 'v', activo: manual && !!clipFile && !isAnalyzing }, marcarLuzB);

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
          <ClipPlayer src={urlVisor} videoRef={videoRef} bucle={!(manual && videoSrc)} insignia={insignia} />
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

          {edge?.senal.fuente === 'favero' && edge.senal.sin_senal_favero && (
            <View style={s.aviso}>
              <StateMessage
                testID="sin-senal-favero" tipo="error" titulo="Sin señal Favero"
                siguiente="No llegan tramas del aparato. La revisión sigue como repetición convencional."
              />
            </View>
          )}
          <SenalPrueba activo={!!edge?.modo_prueba && !!combate} />
          <PanelTocados
            tocados={tocados} seleccionadoId={mostrado?.tocadoId ?? null}
            onSeleccionar={id => { setManual(false); setSeleccionId(id); }}
            onSolicitarVar={id => { void handleSolicitarVar(id); }}
            onDecision={(id, clase) => { void handleDecision(id, clase); }}
            ocupado={isAnalyzing} error={errorTocados}
          />
          <View style={s.aviso}>
            <Button
              testID="cargar-manual-btn" label={manual ? 'Ocultar la carga manual' : 'Cargar un archivo manualmente (respaldo)'}
              onPress={() => setManual(m => !m)} disabled={isAnalyzing}
            />
          </View>
          {!manual && (
            <EstadoAnalisis
              titulo="Error: no se pudo abrir la revisión" siguiente="Vuelve a pulsar Solicitar VAR."
              onReintentar={() => { if (ultimoVar.current) void handleSolicitarVar(ultimoVar.current); }}
            />
          )}
          {manual && (
            <PasoClip
              fileName={fileName}
              onElegirClip={openFilePicker}
              tLuzAMs={tLuzAMs} tLuzBMs={tLuzBMs}
              onMarcarLuzA={marcarLuzA} onMarcarLuzB={marcarLuzB}
              onQuitarLuzA={() => setTLuzAMs(null)} onQuitarLuzB={() => setTLuzBMs(null)}
              onAnalizar={handleAnalyze} faltante={faltante}
            />
          )}
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
