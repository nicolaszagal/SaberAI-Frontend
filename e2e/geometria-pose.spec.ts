import { test, expect } from '@playwright/test';
import {
  ARISTAS_COCO, LARGO_ESTELA, anclaEtiqueta, brazoArmado, estelaDe, indiceTocado, puntoVisible,
  puntosDelFrame, segmentosBrazo, tiempoRelativo, tramosIncompletos,
} from '../src/application/pose/geometriaPose';
import type { PoseTirador, VistaPose } from '../src/domain/entities/Pose';

/** Tirador sintético mínimo para casos que la pose real no cubre (huecos de estela). */
function tirador(n: number, conf: (f: number, kp: number) => number, detectado: (f: number) => boolean): PoseTirador {
  return {
    color: 'ROJ', brazo: 'diestro',
    xy: Array.from({ length: n }, (_, f) => Array.from({ length: 17 }, (_, kp) => [f * 10 + kp, f])),
    conf: Array.from({ length: n }, (_, f) => Array.from({ length: 17 }, (_, kp) => conf(f, kp))),
    detectado: Array.from({ length: n }, (_, f) => detectado(f)),
    anguloCodo: Array.from({ length: n }, () => null),
  };
}

test('el brazo armado sigue WEAPON_KPT de Fog: diestro 6-8-10, zurdo 5-7-9', () => {
  expect(brazoArmado('diestro')).toEqual({ hombro: 6, codo: 8, muneca: 10 });
  expect(brazoArmado('zurdo')).toEqual({ hombro: 5, codo: 7, muneca: 9 });
});

test('las aristas COCO-17 solo usan keypoints válidos y no se repiten', () => {
  expect(ARISTAS_COCO).toHaveLength(19);
  const vistas = new Set(ARISTAS_COCO.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  expect(vistas.size).toBe(19);
  for (const [a, b] of ARISTAS_COCO) { expect(a).toBeGreaterThanOrEqual(0); expect(b).toBeLessThanOrEqual(16); }
});

test('puntoVisible respeta conf_min_keypoint y detectado', () => {
  const t = tirador(3, (f, kp) => (kp === 3 ? 0.29 : 0.3), f => f !== 1);
  expect(puntoVisible(t, 0, 3, 0.3)).toBeNull(); // 0.29 < 0.3
  expect(puntoVisible(t, 0, 4, 0.3)).not.toBeNull(); // 0.3 >= 0.3
  expect(puntoVisible(t, 1, 4, 0.3)).toBeNull(); // no detectado
  expect(puntosDelFrame(t, 1, 0.3).every(p => p === null)).toBe(true);
});

test('segmentosBrazo omite el tramo cuyo extremo no se ve', () => {
  const t = tirador(1, (_, kp) => (kp === 10 ? 0.1 : 0.9), () => true);
  expect(segmentosBrazo(puntosDelFrame(t, 0, 0.3), 'diestro')).toHaveLength(1); // solo hombro-codo
});

test('la estela tiene opacidad creciente hacia el frame actual y no cruza huecos', () => {
  const t = tirador(20, (f, kp) => (kp === 10 && f === 15 ? 0 : 0.9), () => true);
  const e = estelaDe(t, 10, 18, 0.3);
  expect(e.length).toBeLessThanOrEqual(LARGO_ESTELA);
  expect(e.map(x => x.opacidad)).toEqual([...e.map(x => x.opacidad)].sort((a, b) => a - b));
  expect(e.at(-1)!.opacidad).toBe(1);
  // El hueco del frame 15 elimina los tramos 14→15 y 15→16.
  expect(e.every(x => x.a.y !== 15 && x.b.y !== 15)).toBe(true);
  expect(estelaDe(t, 10, 0, 0.3)).toEqual([]);
});

test('indiceTocado resta frame_inicio y se acota al clip', () => {
  expect(indiceTocado({ frameTocado: 20, frameInicio: 8, nFrames: 32 })).toBe(12);
  expect(indiceTocado({ frameTocado: 3, frameInicio: 8, nFrames: 32 })).toBe(0);
  expect(indiceTocado({ frameTocado: 90, frameInicio: 8, nFrames: 32 })).toBe(31);
});

test('tiempoRelativo escribe coma decimal y signo', () => {
  expect(tiempoRelativo(8, 20, 30)).toBe('-0,40 s');
  expect(tiempoRelativo(20, 20, 30)).toBe('0,00 s');
  expect(tiempoRelativo(23, 20, 30)).toBe('+0,10 s');
});

test('tramosIncompletos agrupa frames consecutivos con algún tirador sin detectar', () => {
  const t = (n: number, d: boolean[]) => ({ ...tirador(n, () => 0.9, () => true), detectado: d });
  const v = {
    nFrames: 8, tiradores: {
      A: t(8, [true, true, false, false, true, true, true, true]),
      B: t(8, [true, true, true, true, true, false, true, false]),
    },
  } as unknown as VistaPose;
  expect(tramosIncompletos(v)).toEqual([{ desde: 2, hasta: 3 }, { desde: 5, hasta: 5 }, { desde: 7, hasta: 7 }]);
});

test('anclaEtiqueta usa el punto visible más alto y ninguno si no hay', () => {
  expect(anclaEtiqueta([null, null])).toBeNull();
  expect(anclaEtiqueta([{ x: 10, y: 50 }, { x: 30, y: 20 }])).toEqual({ x: 20, y: 20 });
});
