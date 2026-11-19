import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useC } from '../context/ThemeContext';
import { Button } from './Button';
import { useShortcut } from '../hooks/useShortcut';
import { useFpsEstimado } from '../hooks/useFpsEstimado';
import { FONT, space } from '../theme/tokens';

/** Velocidades de reproducción del clip (RF-15: normal y cámara lenta). */
const VELOCIDADES = [1, 0.5, 0.25] as const;

interface Props {
  /** URL del clip elegido, o null si no hay. */
  src: string | null;
  /** Referencia al `<video>`, para leer el instante actual al marcar el tocado. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Reproductor del clip con velocidad 1×, 0.5× y 0.25× y avance/retroceso de un
 * cuadro. Cambiar la velocidad solo modifica `playbackRate`: no toca la clasificación.
 */
export function ClipPlayer({ src, videoRef }: Props) {
  const C = useC();
  const s = useMemo(() => styles(), []);
  const [velocidad, setVelocidad] = useState<number>(1);
  const [reproduciendo, setReproduciendo] = useState(false);
  const fps = useFpsEstimado(src);

  // Un clip nuevo vuelve a velocidad normal.
  useEffect(() => { setVelocidad(1); setReproduciendo(false); }, [src]);

  function alternar() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }

  function fijarVelocidad(x: number) {
    if (videoRef.current) videoRef.current.playbackRate = x;
    setVelocidad(x);
  }

  /** Avanza (+1) o retrocede (-1) un cuadro, con el clip en pausa. */
  function pasoDeCuadro(direccion: 1 | -1) {
    const v = videoRef.current;
    if (!v || !fps) return;
    v.pause();
    const cuadro = Math.round(v.currentTime * fps) + direccion;
    // +0.001 s para caer dentro del cuadro y no en el borde con el anterior.
    v.currentTime = Math.min(Math.max(cuadro / fps + 0.001, 0), v.duration || 0);
  }

  const hayClip = src !== null;
  const conCuadros = hayClip && fps !== null;
  useShortcut({ tecla: ',', activo: conCuadros }, () => pasoDeCuadro(-1));
  useShortcut({ tecla: '.', activo: conCuadros }, () => pasoDeCuadro(1));

  if (Platform.OS !== 'web') {
    return (
      <View style={s.vacio}>
        <Text style={s.vacioTexto}>Video disponible solo en web</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.video}>
        {src ? (
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            data-testid="video-player"
            src={src}
            controls
            playsInline
            onPlay={() => setReproduciendo(true)}
            onPause={() => setReproduciendo(false)}
            onRateChange={e => setVelocidad((e.target as HTMLVideoElement).playbackRate)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' } as React.CSSProperties}
          />
        ) : (
          <View style={s.vacio}>
            <Text style={s.vacioTitulo}>Sin clip cargado</Text>
            <Text style={s.vacioTexto}>Elige un MP4 o MOV en el Paso 1 (tecla S).</Text>
          </View>
        )}
      </View>

      <View style={[s.controles, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        <Button testID="frame-prev" label="◀ Cuadro" shortcut="," onPress={() => pasoDeCuadro(-1)} disabled={!conCuadros} />
        <Button testID="play-toggle" label={reproduciendo ? 'Pausa' : 'Reproducir'} onPress={alternar} disabled={!hayClip} />
        <Button testID="frame-next" label="Cuadro ▶" shortcut="." onPress={() => pasoDeCuadro(1)} disabled={!conCuadros} />
        <View style={s.velocidades} accessibilityRole="radiogroup">
          {VELOCIDADES.map(x => (
            <Button
              key={x}
              testID={`speed-${x}`}
              label={`${x}×`}
              variant={velocidad === x ? 'primary' : 'neutral'}
              onPress={() => fijarVelocidad(x)}
              disabled={!hayClip}
            />
          ))}
        </View>
        {hayClip && !conCuadros && (
          <Text testID="cuadros-no-disponible" style={[s.nota, { color: C.textMuted }]}>
            Avance por cuadro no disponible: no se pudo medir los fps del clip.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = () => StyleSheet.create({
  root:        { flex: 1 },
  video:       { flex: 1, backgroundColor: '#000', minHeight: 200 },
  vacio:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space(2), padding: space(4) },
  vacioTitulo: { color: '#ffffff', fontSize: FONT.lg, fontWeight: '700' },
  vacioTexto:  { color: '#d1d5db', fontSize: FONT.sm, textAlign: 'center' },
  controles:   { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space(2), padding: space(2), borderTopWidth: 1 },
  velocidades: { flexDirection: 'row', gap: space(1), marginLeft: 'auto' },
  nota:        { fontSize: FONT.xs, flexBasis: '100%' },
});
