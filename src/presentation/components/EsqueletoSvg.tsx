import React from 'react';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { VistaPose } from '../../domain/entities/Pose';
import {
  ARISTAS_COCO, TOBILLOS, anclaEtiqueta, brazoArmado, estelaDe, puntosDelFrame, segmentosBrazo,
  segmentosDelFrame,
} from '../../application/pose/geometriaPose';
import { FONDO_TRAZOS, FENCER_LABEL, colorTrazo } from '../theme/fencer';

/** Tipografía de las etiquetas del lienzo (la del resto de la interfaz, no la serif por defecto del SVG). */
const FUENTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface Props {
  pose: VistaPose;
  /** Índice del frame en los arreglos de la pose. */
  frame: number;
}

/**
 * Esqueletos COCO-17 de A y B sobre fondo negro (F-031, CU-08, D-14). El SVG usa el tamaño del
 * frame como `viewBox`, así que la escena no se deforma. Solo se dibujan los keypoints con
 * `conf >= conf_min_keypoint` en frames con `detectado=true`; no se rellena ni se inventa nada.
 * El brazo armado va más grueso, con el ángulo de codo que envía Fog. Sin línea del arma (D-18).
 */
export function EsqueletoSvg({ pose, frame }: Props) {
  const { frameW, frameH, confMinKeypoint: confMin, tiradores } = pose;
  // Grosores y tipografía en unidades del frame, proporcionales a su alto.
  const k = frameH / 720;
  return (
    <Svg
      testID="trazos-lienzo"
      width="100%" height="100%"
      viewBox={`0 0 ${frameW} ${frameH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Rect x={0} y={0} width={frameW} height={frameH} fill={FONDO_TRAZOS} />
      {tiradores && (['A', 'B'] as const).map(lado => {
        const t = tiradores[lado];
        const color = colorTrazo(t.color);
        const puntos = puntosDelFrame(t, frame, confMin);
        const ancla = anclaEtiqueta(puntos);
        if (!ancla) return null;
        const { codo, muneca } = brazoArmado(t.brazo);
        const angulo = t.anguloCodo[frame];
        const posCodo = puntos[codo];
        const estelas: [string, number][] = [[`muneca`, muneca], ...TOBILLOS.map((kp): [string, number] => [`tobillo-${kp}`, kp])];
        return (
          <G key={lado} testID={`esqueleto-${lado}`}>
            {estelas.map(([nombre, kp]) => estelaDe(t, kp, frame, confMin).map((tr, i) => (
              <Line
                key={`${nombre}-${i}`} x1={tr.a.x} y1={tr.a.y} x2={tr.b.x} y2={tr.b.y}
                stroke={color} strokeOpacity={tr.opacidad * 0.7} strokeWidth={3 * k} strokeLinecap="round"
              />
            )))}
            {segmentosDelFrame(puntos, ARISTAS_COCO).map((sg, i) => (
              <Line key={`e${i}`} x1={sg.a.x} y1={sg.a.y} x2={sg.b.x} y2={sg.b.y}
                stroke={color} strokeWidth={3 * k} strokeLinecap="round" />
            ))}
            {segmentosBrazo(puntos, t.brazo).map((sg, i) => (
              <Line key={`b${i}`} testID={`brazo-${lado}`} x1={sg.a.x} y1={sg.a.y} x2={sg.b.x} y2={sg.b.y}
                stroke={color} strokeWidth={8 * k} strokeLinecap="round" />
            ))}
            {puntos.map((p, kp) => p && (
              <Circle key={`p${kp}`} testID={`kp-${lado}-${kp}`} cx={p.x} cy={p.y} r={4 * k} fill={color} />
            ))}
            {angulo != null && posCodo && (
              <SvgText
                testID={`angulo-${lado}`} x={posCodo.x + 14 * k} y={posCodo.y - 14 * k}
                fill={color} fontSize={26 * k} fontWeight="700" fontFamily={FUENTE}
              >
                {`${angulo.toFixed(1).replace('.', ',')}°`}
              </SvgText>
            )}
            <SvgText
              testID={`etiqueta-${lado}`} x={ancla.x} y={Math.max(ancla.y - 24 * k, 30 * k)} textAnchor="middle"
              fill={color} fontSize={30 * k} fontWeight="700" fontFamily={FUENTE}
            >
              {FENCER_LABEL[t.color]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
