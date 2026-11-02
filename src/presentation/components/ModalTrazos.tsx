/**
 * Modal de trazos de pose (F-031, CU-08, D-14): esqueletos de A y B sobre fondo negro, sin video,
 * con reproducción propia (normal, cámara lenta y frame a frame) independiente del clip. Se abre
 * bajo demanda; abrirlo o cerrarlo no toca la elección del árbitro (RNF-01, P-008).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useC } from '../context/ThemeContext';
import { Button } from './Button';
import { EsqueletoSvg } from './EsqueletoSvg';
import { StateMessage } from './StateMessage';
import { ModalRevision } from './ModalRevision';
import { useShortcut } from '../hooks/useShortcut';
import { usePose, type EstadoPose } from '../hooks/usePose';
import { indiceTocado, tiempoRelativo, tramosIncompletos } from '../../application/pose/geometriaPose';
import { marcasDeBarra } from '../../application/razonamiento/marcasDeBarra';
import { motivoLegible } from '../../application/mappers/actionMapper';
import type { VistaPose } from '../../domain/entities/Pose';
import type { VistaRazonamiento } from '../../domain/entities/Razonamiento';
import { FENCER_LABEL, FONDO_TRAZOS } from '../theme/fencer';
import { FONT, RADIUS, space } from '../theme/tokens';

/** Velocidades de los trazos: normal y cámara lenta (CU-08). */
const VELOCIDADES = [1, 0.25] as const;

/** Dónde abre el modal: un frame del clip (el de un evento) o el primero; sin esto, en el tocado. */
export type AperturaTrazos = { tipo: 'frame'; frameIdx: number } | { tipo: 'primero' };

interface Props {
  visible: boolean;
  /** Revisión cuyos trazos se muestran; null = ninguna. */
  revisionId: string | null;
  onClose: () => void;
  /** Frame en que abre el modal (por ejemplo, el de un evento del razonamiento). */
  abrirEn?: AperturaTrazos | null;
  /** Razonamiento de la revisión si ya está en caché: la barra de tiempo marca sus eventos y la ventana de atención. */
  razonamiento?: VistaRazonamiento | null;
}

export function ModalTrazos({ visible, revisionId, onClose, abrirEn = null, razonamiento = null }: Props) {
  const { estado, reintentar } = usePose(revisionId, visible);
  return (
    <ModalRevision
      visible={visible} onClose={onClose} testID="modal-trazos" cerrarTestID="trazos-cerrar"
      titulo="Trazos de pose" nota="Apoyo visual a la sugerencia: la decisión es del árbitro."
      fondo={FONDO_TRAZOS}
    >
      {estado.tipo === 'listo' && estado.dato.nFrames > 0 && estado.dato.tiradores
        ? <Reproductor pose={estado.dato} abrirEn={abrirEn} razonamiento={razonamiento} />
        : <View style={{ flex: 1, padding: space(4), backgroundColor: FONDO_TRAZOS }}><Aviso estado={estado} reintentar={reintentar} /></View>}
    </ModalRevision>
  );
}

function Aviso({ estado, reintentar }: { estado: EstadoPose; reintentar: () => void }) {
  if (estado.tipo === 'listo') {
    return (
      <StateMessage
        testID="trazos-sin-pose" tipo="vacio"
        titulo="No hay trazos: la pose no se extrajo"
        siguiente={estado.dato.motivo ? motivoLegible(estado.dato.motivo) : 'El clip no tiene frames con ambos tiradores detectados.'}
      />
    );
  }
  if (estado.tipo === 'error') {
    if (estado.status === 409 && estado.codigo === 'sin_clasificacion') {
      return (
        <StateMessage
          testID="trazos-409" tipo="error"
          titulo="Esta revisión aún no tiene una clasificación registrada"
          siguiente="Los trazos salen de la clasificación: sin ella no hay nada que dibujar."
        />
      );
    }
    if (estado.status === 409 && estado.codigo === 'keypoints_alterados') {
      return (
        <StateMessage
          testID="trazos-409" tipo="error"
          titulo="Los keypoints de esta revisión no pasan la verificación de integridad"
          siguiente="No se muestran trazos para no dibujar datos alterados. Continúe con el procedimiento VAR habitual."
        />
      );
    }
    return (
      <StateMessage
        testID="trazos-error" tipo="error"
        titulo="No se pudieron cargar los trazos"
        siguiente={`${estado.mensaje.replace(/\.?\s*$/, '.')} Comprueba la conexión con el Fog.`}
        accion={{ label: 'Reintentar', onPress: reintentar }}
      />
    );
  }
  return <StateMessage testID="trazos-cargando" tipo="cargando" titulo="Cargando los trazos…" />;
}

function Reproductor({ pose, abrirEn, razonamiento }: { pose: VistaPose; abrirEn: AperturaTrazos | null; razonamiento: VistaRazonamiento | null }) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const tocado = indiceTocado(pose);
  const ultimo = pose.nFrames - 1;
  // El modal abre en el frame pedido (un evento del razonamiento) o, sin pedido, en el del tocado.
  const inicial = abrirEn === null ? tocado
    : abrirEn.tipo === 'primero' ? 0
    : Math.min(Math.max(abrirEn.frameIdx - pose.frameInicio, 0), ultimo);
  const [frame, setFrame] = useState(inicial);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidad, setVelocidad] = useState<number>(1);
  const [ancho, setAncho] = useState(0);
  const tramos = useMemo(() => tramosIncompletos(pose), [pose]);
  const marcas = useMemo(() => (razonamiento ? marcasDeBarra(razonamiento, pose) : null), [razonamiento, pose]);

  useEffect(() => { setFrame(inicial); setReproduciendo(false); }, [pose, inicial]);

  useEffect(() => {
    if (!reproduciendo) return undefined;
    const id = setInterval(() => {
      setFrame(f => {
        if (f >= ultimo) { setReproduciendo(false); return f; }
        return f + 1;
      });
    }, 1000 / (pose.fps * velocidad));
    return () => clearInterval(id);
  }, [reproduciendo, velocidad, pose.fps, ultimo]);

  function paso(d: 1 | -1) {
    setReproduciendo(false);
    setFrame(f => Math.min(Math.max(f + d, 0), ultimo));
  }
  function alternar() {
    if (!reproduciendo && frame >= ultimo) setFrame(0);
    setReproduciendo(r => !r);
  }
  useShortcut({ tecla: ',', enModal: true }, () => paso(-1));
  useShortcut({ tecla: '.', enModal: true }, () => paso(1));

  const pct = (i: number) => (ultimo > 0 ? (i / ultimo) * 100 : 0);
  const incompleto = tramos.some(t => frame >= t.desde && frame <= t.hasta);

  return (
    <>
      <View style={s.lienzo}>
        <EsqueletoSvg pose={pose} frame={frame} />
      </View>
      <View style={s.controles}>
        <View style={s.fila}>
          <Button testID="trazos-prev" label="◀ Cuadro" shortcut="," onPress={() => paso(-1)} disabled={frame <= 0} />
          <Button testID="trazos-play" label={reproduciendo ? 'Pausa' : 'Reproducir'} onPress={alternar} />
          <Button testID="trazos-next" label="Cuadro ▶" shortcut="." onPress={() => paso(1)} disabled={frame >= ultimo} />
          <View style={s.fila} accessibilityRole="radiogroup">
            {VELOCIDADES.map(x => (
              <Button
                key={x} testID={`trazos-vel-${x}`} label={`${String(x).replace('.', ',')}×`}
                variant={velocidad === x ? 'primary' : 'neutral'} selected={velocidad === x}
                onPress={() => setVelocidad(x)}
              />
            ))}
          </View>
          <View style={s.lectura}>
            <Text testID="trazos-tiempo" style={s.tiempo}>{tiempoRelativo(frame, tocado, pose.fps)}</Text>
            <Text testID="trazos-frame" style={s.leyenda}>
              Frame {frame} de {ultimo} · cuadro {pose.frameInicio + frame} del clip
            </Text>
          </View>
        </View>

        <Pressable
          testID="trazos-barra" accessibilityRole="adjustable"
          accessibilityLabel="Barra de tiempo de los trazos"
          accessibilityValue={{ min: 0, max: ultimo, now: frame }}
          onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
          onPress={e => {
            if (ancho > 0) { setReproduciendo(false); setFrame(Math.round((e.nativeEvent.locationX / ancho) * ultimo)); }
          }}
          style={s.barra}
        >
          {tramos.map(t => (
            <View
              key={t.desde} testID="tramo-incompleto" accessibilityLabel="Detección incompleta"
              style={[s.tramo, { left: `${pct(t.desde)}%`, width: `${Math.max(pct(t.hasta) - pct(t.desde), 1)}%` }]}
            />
          ))}
          {marcas?.ventana && (
            <View
              testID="ventana-atencion" accessibilityLabel="Ventana de atención del modelo"
              style={[s.ventana, { left: `${pct(marcas.ventana.desde)}%`, width: `${Math.max(pct(marcas.ventana.hasta) - pct(marcas.ventana.desde), 1)}%` }]}
            />
          )}
          <View
            testID="marcador-tocado" accessibilityLabel={`Tocado, frame ${tocado}`}
            style={[s.marcador, { left: `${pct(tocado)}%` }]}
          />
          {marcas?.eventos.map(m => (
            <View
              key={`${m.rotulo}-${m.indice}`} testID="marca-evento"
              accessibilityLabel={`Evento ${m.rotulo}, frame ${m.indice}`}
              style={[s.marcaEvento, { left: `${pct(m.indice)}%`, backgroundColor: m.rotulo === 'A' ? C.red : m.rotulo === 'B' ? C.green : C.cyan }]}
            />
          ))}
          <View testID="cursor-trazos" style={[s.cursor, { left: `${pct(frame)}%` }]} />
        </Pressable>
        {marcas && marcas.eventos.length > 0 && (
          <View style={s.etiquetasEventos}>
            {marcas.eventos.map(m => (
              <Text
                key={`${m.rotulo}-${m.indice}`} testID="etiqueta-evento"
                style={[s.etiquetaEvento, { left: `${pct(m.indice)}%`, color: m.rotulo === 'A' ? C.red : m.rotulo === 'B' ? C.green : C.cyan }]}
              >
                {m.rotulo === 'acercamiento' ? '↔' : m.rotulo}
              </Text>
            ))}
          </View>
        )}
        <View style={s.fila}>
          <Text style={s.leyenda}><Text style={{ color: C.orange }}>▌</Text> Tocado</Text>
          {tramos.length > 0 && (
            <Text style={s.leyenda}><Text style={{ color: C.red }}>▬</Text> Detección incompleta</Text>
          )}
          {incompleto && (
            <Text testID="trazos-incompleto" style={[s.leyenda, { color: C.orange }]}>
              En este frame falta un tirador: no se dibuja.
            </Text>
          )}
          {marcas && marcas.eventos.length > 0 && (
            <Text style={s.leyenda}>A/B inicio de extensión del brazo · ↔ inicio del acercamiento</Text>
          )}
          {marcas?.ventana && (
            <Text testID="leyenda-ventana" style={s.leyenda}><Text style={{ color: C.cyan }}>▬</Text> Ventana de atención del modelo</Text>
          )}
          <Text style={s.leyenda}>{FENCER_LABEL.ROJ} · {FENCER_LABEL.VER}</Text>
        </View>
      </View>
    </>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  lienzo:    { flex: 1, backgroundColor: FONDO_TRAZOS },
  controles: { gap: space(2), padding: space(3), backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  fila:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(2) },
  lectura:   { marginLeft: 'auto', alignItems: 'flex-end' },
  tiempo:    { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  barra:     { height: 28, justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.borderBright, borderRadius: RADIUS.sm, overflow: 'hidden' },
  tramo:     { position: 'absolute', top: 0, bottom: 0, backgroundColor: C.red, opacity: 0.55 },
  marcador:  { position: 'absolute', top: 0, bottom: 0, width: 4, marginLeft: -2, backgroundColor: C.orange },
  ventana:   { position: 'absolute', top: 0, bottom: 0, backgroundColor: C.cyan, opacity: 0.3 },
  marcaEvento: { position: 'absolute', top: 4, bottom: 4, width: 3, marginLeft: -1 },
  etiquetasEventos: { height: 16 },
  etiquetaEvento: { position: 'absolute', top: 0, marginLeft: -4, fontSize: FONT.xs, fontWeight: '800' },
  cursor:    { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: C.text },
  leyenda:   { color: C.textMuted, fontSize: FONT.xs },
});
