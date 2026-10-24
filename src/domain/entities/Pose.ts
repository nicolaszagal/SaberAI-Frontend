/** Pose de A y B para los trazos del modal (F-031, CU-08, D-14). Viene de GET /revisiones/{id}/pose. */

export type BrazoPose = 'diestro' | 'zurdo';

/** Pose de un tirador: un elemento por frame de los arreglos. */
export interface PoseTirador {
  color: 'ROJ' | 'VER';
  brazo: BrazoPose;
  /** [frame][keypoint COCO-17] = [x, y] en píxeles del frame del clip. */
  xy: number[][][];
  /** [frame][keypoint] = confianza del keypoint. */
  conf: number[][];
  detectado: boolean[];
  /** Ángulo hombro-codo-muñeca del brazo armado, en grados, calculado por Fog; null = sin dato. */
  anguloCodo: (number | null)[];
}

export interface VistaPose {
  revisionId: string;
  fps: number;
  frameW: number;
  frameH: number;
  /** El índice 0 de los arreglos es este frame del clip (= `lock_frame`). */
  frameInicio: number;
  /** Frame del tocado en el clip; en los arreglos está en `frameTocado - frameInicio`. */
  frameTocado: number;
  nFrames: number;
  /** Confianza mínima para dibujar un keypoint. */
  confMinKeypoint: number;
  /** null con `nFrames` 0 (timeout o pose incompleta). */
  tiradores: { A: PoseTirador; B: PoseTirador } | null;
  motivo: string | null;
}
