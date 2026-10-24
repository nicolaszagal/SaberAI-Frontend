/**
 * Geometría de los trazos (F-031, CU-08): funciones puras sin React ni SVG.
 * No inventa datos: lo que no pasa el umbral de confianza o no fue detectado no se devuelve.
 */
import type { BrazoPose, PoseTirador, VistaPose } from '../../domain/entities/Pose';

export type Arista = readonly [number, number];

/**
 * Aristas del esqueleto COCO-17 (índices base 0 de los keypoints de YOLOv8-pose).
 * Fuente: lista `skeleton` de la categoría `person` de COCO (cocodataset.org, anotaciones de
 * keypoints), que está en base 1; aquí se pasó a base 0. Orden de keypoints: 0 nariz, 1-2 ojos,
 * 3-4 orejas, 5-6 hombros, 7-8 codos, 9-10 muñecas, 11-12 caderas, 13-14 rodillas, 15-16 tobillos
 * (izquierdo, derecho).
 */
export const ARISTAS_COCO: readonly Arista[] = [
  [15, 13], [13, 11], [16, 14], [14, 12], [11, 12], [5, 11], [6, 12], [5, 6], [5, 7], [6, 8],
  [7, 9], [8, 10], [1, 2], [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
];

/** Tobillos (izquierdo y derecho) de los que se dibuja la estela. */
export const TOBILLOS: readonly number[] = [15, 16];

/** Largo de la estela en frames (U8 de docs: prompts/EXPLICACION/00_README_EXPLICACION.md). */
export const LARGO_ESTELA = 10;

export interface BrazoArmado { hombro: number; codo: number; muneca: number }

/**
 * Keypoints COCO del brazo armado. El diestro usa el lado derecho (6, 8, 10) y el zurdo el
 * izquierdo (5, 7, 9), igual que `WEAPON_KPT` de `shared/feature_extractor.py`.
 *
 * Args:
 *   brazo: brazo armado declarado en el combate.
 *
 * Returns:
 *   Los índices de hombro, codo y muñeca.
 */
export function brazoArmado(brazo: BrazoPose): BrazoArmado {
  return brazo === 'diestro' ? { hombro: 6, codo: 8, muneca: 10 } : { hombro: 5, codo: 7, muneca: 9 };
}

export interface Punto { x: number; y: number }

/**
 * Posición de un keypoint si se puede dibujar.
 *
 * Args:
 *   t: pose del tirador.
 *   frame: índice del frame en los arreglos.
 *   kp: índice del keypoint COCO.
 *   confMin: confianza mínima (`conf_min_keypoint` de la respuesta).
 *
 * Returns:
 *   El punto, o null si el tirador no fue detectado en el frame o `conf < confMin`.
 */
export function puntoVisible(t: PoseTirador, frame: number, kp: number, confMin: number): Punto | null {
  if (!t.detectado[frame]) return null;
  const c = t.conf[frame]?.[kp];
  const xy = t.xy[frame]?.[kp];
  if (c === undefined || xy === undefined || c < confMin) return null;
  return { x: xy[0], y: xy[1] };
}

/** Los 17 keypoints de un frame; null donde no se dibujan. */
export function puntosDelFrame(t: PoseTirador, frame: number, confMin: number): (Punto | null)[] {
  return Array.from({ length: 17 }, (_, kp) => puntoVisible(t, frame, kp, confMin));
}

export interface Segmento { a: Punto; b: Punto }

/** Aristas del esqueleto con sus dos extremos visibles. */
export function segmentosDelFrame(puntos: (Punto | null)[], aristas: readonly Arista[] = ARISTAS_COCO): Segmento[] {
  const salida: Segmento[] = [];
  for (const [i, j] of aristas) {
    const a = puntos[i]; const b = puntos[j];
    if (a && b) salida.push({ a, b });
  }
  return salida;
}

/** Segmentos hombro-codo y codo-muñeca del brazo armado que se pueden dibujar. */
export function segmentosBrazo(puntos: (Punto | null)[], brazo: BrazoPose): Segmento[] {
  const { hombro, codo, muneca } = brazoArmado(brazo);
  return segmentosDelFrame(puntos, [[hombro, codo], [codo, muneca]]);
}

export interface TramoEstela { a: Punto; b: Punto; opacidad: number }

/**
 * Estela de un keypoint en los últimos `largo` frames, con opacidad decreciente hacia atrás.
 * Un tramo solo existe si sus dos frames tienen el keypoint visible: no se une a través de huecos.
 *
 * Args:
 *   t: pose del tirador.
 *   kp: keypoint COCO (muñeca armada o tobillo).
 *   frame: frame actual (extremo más reciente de la estela).
 *   confMin: confianza mínima.
 *   largo: cantidad de frames de la estela.
 *
 * Returns:
 *   Tramos del más antiguo al más reciente; opacidad en (0, 1].
 */
export function estelaDe(
  t: PoseTirador, kp: number, frame: number, confMin: number, largo: number = LARGO_ESTELA,
): TramoEstela[] {
  const tramos: TramoEstela[] = [];
  for (let k = largo; k >= 1; k--) {
    const f = frame - k;
    if (f < 0) continue;
    const a = puntoVisible(t, f, kp, confMin);
    const b = puntoVisible(t, f + 1, kp, confMin);
    if (a && b) tramos.push({ a, b, opacidad: (largo - k + 1) / largo });
  }
  return tramos;
}

/** Índice del frame del tocado en los arreglos (`frame_tocado - frame_inicio`), acotado al clip. */
export function indiceTocado(v: Pick<VistaPose, 'frameTocado' | 'frameInicio' | 'nFrames'>): number {
  return Math.min(Math.max(v.frameTocado - v.frameInicio, 0), Math.max(v.nFrames - 1, 0));
}

export interface Tramo { desde: number; hasta: number }

/**
 * Tramos consecutivos de frames donde algún tirador tiene `detectado=false`.
 *
 * Returns:
 *   Rangos [desde, hasta] inclusivos, en índices de los arreglos.
 */
export function tramosIncompletos(v: VistaPose): Tramo[] {
  if (!v.tiradores) return [];
  const tramos: Tramo[] = [];
  let inicio: number | null = null;
  for (let i = 0; i < v.nFrames; i++) {
    const falta = !v.tiradores.A.detectado[i] || !v.tiradores.B.detectado[i];
    if (falta && inicio === null) inicio = i;
    if (!falta && inicio !== null) { tramos.push({ desde: inicio, hasta: i - 1 }); inicio = null; }
  }
  if (inicio !== null) tramos.push({ desde: inicio, hasta: v.nFrames - 1 });
  return tramos;
}

/**
 * Tiempo del frame respecto al tocado, con coma decimal: "-0,40 s", "0,00 s", "+0,10 s".
 *
 * Args:
 *   frame: índice del frame en los arreglos.
 *   tocado: índice del tocado en los arreglos.
 *   fps: cuadros por segundo del clip.
 */
export function tiempoRelativo(frame: number, tocado: number, fps: number): string {
  const s = (frame - tocado) / fps;
  const texto = Math.abs(s).toFixed(2).replace('.', ',');
  if (Math.abs(s) < 0.005) return '0,00 s';
  return `${s < 0 ? '-' : '+'}${texto} s`;
}

/** Posición de un tirador para escribir su etiqueta: sobre el punto visible más alto. */
export function anclaEtiqueta(puntos: (Punto | null)[]): Punto | null {
  const visibles = puntos.filter((p): p is Punto => p !== null);
  if (visibles.length === 0) return null;
  const x = visibles.reduce((s, p) => s + p.x, 0) / visibles.length;
  return { x, y: Math.min(...visibles.map(p => p.y)) };
}
