/**
 * Reproductor de trazos de pose (F-031, CU-08, D-14): esqueletos de A y B sobre fondo negro, sin video,
 * con reproducción propia (normal, cámara lenta y cuadro a cuadro) independiente del clip. Vive dentro
 * de `VistaInterpretacion`, junto al razonamiento. Moverlo no toca la elección del árbitro (RNF-01, P-008).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useC } from '../context/ThemeContext';
import { Button } from './Button';
import { EsqueletoSvg } from './EsqueletoSvg';
import { StateMessage } from './StateMessage';
import { useShortcut } from '../hooks/useShortcut';
import type { EstadoPose } from '../hooks/usePose';
import type { FrameSeleccionado } from '../hooks/useInterpretacion';
import { indiceTocado, tiempoRelativo, tramosIncompletos } from '../../application/pose/geometriaPose';
import { marcasDeBarra } from '../../application/razonamiento/marcasDeBarra';
import { motivoLegible } from '../../application/mappers/actionMapper';
import type { VistaPose } from '../../domain/entities/Pose';
import type { VistaRazonamiento } from '../../domain/entities/Razonamiento';
import { FENCER_LABEL, FONDO_TRAZOS } from '../theme/fencer';
import { FONT, RADIUS, space } from '../theme/tokens';

/** Velocidades de los trazos: normal y cámara lenta (CU-08). */
const VELOCIDADES = [1, 0.25] as const;

/** Ancho táctil de una marca de evento en la barra (px): más ancho que su línea de 3 px. */
const ANCHO_MARCA = 24;

/** Aviso de la pose cuando no hay trazos que dibujar: cargando, error (409 incluidos) o sin pose. */
export function AvisoPose({ estado, reintentar }: { estado: EstadoPose; reintentar: () => void }) {
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

/** Texto de la etiqueta de un evento en la barra: ROJ o VER; el acercamiento (sin tirador) va con ↔. */
function textoEvento(rotulo: 'A' | 'B' | 'acercamiento'): string {
  return rotulo === 'A' ? FENCER_LABEL.ROJ : rotulo === 'B' ? FENCER_LABEL.VER : '↔';
}

/** Color de la marca de un evento: rojo (ROJ), verde (VER) o cian (acercamiento). */
function colorEvento(C: ReturnType<typeof useC>, rotulo: 'A' | 'B' | 'acercamiento'): string {
  return rotulo === 'A' ? C.red : rotulo === 'B' ? C.green : C.cyan;
}

interface PropsReproductor {
  pose: VistaPose;
  /** Razonamiento ya cargado: la barra marca sus eventos y la ventana de atención. */
  razonamiento: VistaRazonamiento | null;
  /** Evento elegido en la lista o en la barra: lleva el cursor a su frame y lo resalta. */
  seleccion: FrameSeleccionado | null;
  /** El árbitro pulsó una marca de la barra. Sin esto las marcas no se pueden pulsar. */
  onSeleccionarEvento?: (indiceEvento: number) => void;
  /** El árbitro movió el cursor a mano (barra, cuadro a cuadro o reproducir). */
  onMoverManual: () => void;
}

/** Reproductor de trazos con su barra de tiempo, marcas de eventos, ventana de atención y tramos incompletos. */
export function Reproductor({ pose, razonamiento, seleccion, onSeleccionarEvento, onMoverManual }: PropsReproductor) {
  const C = useC();
  const s = useMemo(() => styles(C), [C]);
  const tocado = indiceTocado(pose);
  const ultimo = pose.nFrames - 1;
  const [frame, setFrame] = useState(tocado);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidad, setVelocidad] = useState<number>(1);
  const [ancho, setAncho] = useState(0);
  const tramos = useMemo(() => tramosIncompletos(pose), [pose]);
  const marcas = useMemo(() => (razonamiento ? marcasDeBarra(razonamiento, pose) : null), [razonamiento, pose]);

  useEffect(() => { setFrame(tocado); setReproduciendo(false); }, [pose, tocado]);

  // Un evento elegido lleva el cursor a su frame (al primero si empezó antes del clip), en el lugar.
  useEffect(() => {
    if (!seleccion) return;
    const { destino } = seleccion;
    setFrame(destino.tipo === 'primero' ? 0 : Math.min(Math.max(destino.frameIdx - pose.frameInicio, 0), ultimo));
    setReproduciendo(false);
  }, [seleccion, pose.frameInicio, ultimo]);

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
    onMoverManual();
    setReproduciendo(false);
    setFrame(f => Math.min(Math.max(f + d, 0), ultimo));
  }
  function alternar() {
    onMoverManual();
    if (!reproduciendo && frame >= ultimo) setFrame(0);
    setReproduciendo(r => !r);
  }
  useShortcut({ tecla: ',', enModal: true }, () => paso(-1));
  useShortcut({ tecla: '.', enModal: true }, () => paso(1));

  const pct = (i: number) => (ultimo > 0 ? (i / ultimo) * 100 : 0);
  const incompleto = tramos.some(t => frame >= t.desde && frame <= t.hasta);

  return (
    <View style={s.raiz}>
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
            if (ancho > 0) { onMoverManual(); setReproduciendo(false); setFrame(Math.round((e.nativeEvent.locationX / ancho) * ultimo)); }
          }}
          style={s.barra}
        >
          {tramos.map(t => (
            <View
              key={t.desde} testID="tramo-incompleto" accessibilityLabel="Detección incompleta"
              style={[s.tramo, s.sinToque, { left: `${pct(t.desde)}%`, width: `${Math.max(pct(t.hasta) - pct(t.desde), 1)}%` }]}
            />
          ))}
          {marcas?.ventana && (
            <View
              testID="ventana-atencion" accessibilityLabel="Ventana de atención del modelo"
              style={[s.ventana, s.sinToque, { left: `${pct(marcas.ventana.desde)}%`, width: `${Math.max(pct(marcas.ventana.hasta) - pct(marcas.ventana.desde), 1)}%` }]}
            />
          )}
          <View
            testID="marcador-tocado" accessibilityLabel={`Tocado, frame ${tocado}`}
            style={[s.marcador, s.sinToque, { left: `${pct(tocado)}%` }]}
          />
          {marcas?.eventos.map(m => {
            const elegida = seleccion?.evento === m.evento;
            const color = colorEvento(C, m.rotulo);
            return (
              <Pressable
                key={`${m.rotulo}-${m.indice}`} testID="marca-evento"
                accessibilityRole="button" aria-pressed={elegida}
                accessibilityLabel={`Evento ${m.rotulo === 'acercamiento' ? 'acercamiento' : textoEvento(m.rotulo)}, frame ${m.indice}`}
                disabled={!onSeleccionarEvento}
                onPress={() => onSeleccionarEvento?.(m.evento)}
                style={[s.zonaMarca, { left: `${pct(m.indice)}%` }]}
              >
                <View style={{ width: elegida ? 7 : 3, flex: 1, backgroundColor: color, marginVertical: elegida ? 0 : 4 }} />
              </Pressable>
            );
          })}
          <View testID="cursor-trazos" style={[s.cursor, s.sinToque, { left: `${pct(frame)}%` }]} />
        </Pressable>
        {marcas && marcas.eventos.length > 0 && (
          <View style={s.etiquetasEventos}>
            {marcas.eventos.map(m => (
              <Text
                key={`${m.rotulo}-${m.indice}`} testID="etiqueta-evento"
                style={[s.etiquetaEvento, { left: `${pct(m.indice)}%`, color: colorEvento(C, m.rotulo) },
                  seleccion?.evento === m.evento && s.etiquetaElegida]}
              >
                {textoEvento(m.rotulo)}
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
            <Text style={s.leyenda}>
              <Text style={{ color: C.red, fontWeight: '800' }}>{FENCER_LABEL.ROJ}</Text>{' '}
              <Text style={{ color: C.green, fontWeight: '800' }}>{FENCER_LABEL.VER}</Text>{' '}
              inicio de extensión del brazo · ↔ inicio del acercamiento
            </Text>
          )}
          {marcas?.ventana && (
            <Text testID="leyenda-ventana" style={s.leyenda}><Text style={{ color: C.cyan }}>▬</Text> Ventana de atención del modelo</Text>
          )}
          <Text style={s.leyenda}>
            <Text style={{ color: C.red, fontWeight: '800' }}>{FENCER_LABEL.ROJ}</Text> · <Text style={{ color: C.green, fontWeight: '800' }}>{FENCER_LABEL.VER}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  raiz:      { flex: 1 },
  lienzo:    { flex: 1, backgroundColor: FONDO_TRAZOS, minHeight: 200 },
  controles: { gap: space(2), padding: space(3), backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border },
  fila:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(2) },
  lectura:   { marginLeft: 'auto', alignItems: 'flex-end' },
  tiempo:    { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  barra:     { height: 28, justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.borderBright, borderRadius: RADIUS.sm, overflow: 'hidden' },
  tramo:     { position: 'absolute', top: 0, bottom: 0, backgroundColor: C.red, opacity: 0.55 },
  marcador:  { position: 'absolute', top: 0, bottom: 0, width: 4, marginLeft: -2, backgroundColor: C.orange },
  ventana:   { position: 'absolute', top: 0, bottom: 0, backgroundColor: C.cyan, opacity: 0.3 },
  zonaMarca: { position: 'absolute', top: 0, bottom: 0, width: ANCHO_MARCA, marginLeft: -ANCHO_MARCA / 2, alignItems: 'center' },
  sinToque:  { pointerEvents: 'none' },
  etiquetasEventos: { height: 20 },
  etiquetaEvento: { position: 'absolute', top: 0, marginLeft: -12, fontSize: FONT.xs, fontWeight: '800' },
  etiquetaElegida: { fontSize: FONT.md, textDecorationLine: 'underline' },
  cursor:    { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: C.text },
  leyenda:   { color: C.textMuted, fontSize: FONT.xs },
});
