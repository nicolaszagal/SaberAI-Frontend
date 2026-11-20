import { test, expect } from '@playwright/test';
import {
  ARISTAS_COCO, LARGO_ESTELA, anclaEtiqueta, brazoArmado, encuadreDeClip, estelaDe, indiceTocado, ladoExterior, puntoVisible,
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

/** Pose sintética de dos tiradores con keypoints en posiciones dadas (todos los keypoints del frame en un punto). */
function poseCon(a: PoseTirador, b: PoseTirador, n: number, over: Partial<VistaPose> = {}): VistaPose {
  return {
    revisionId: 'r', fps: 30, frameW: 1920, frameH: 1080, frameInicio: 0, frameTocado: 0, nFrames: n,
    confMinKeypoint: 0.5, tiradores: { A: a, B: b }, motivo: null, ...over,
  };
}
const enPunto = (n: number, x: (f: number) => number, y: (f: number) => number, detectado: (f: number) => boolean = () => true, conf = 0.9): PoseTirador => ({
  color: 'ROJ', brazo: 'diestro',
  xy: Array.from({ length: n }, (_, f) => Array.from({ length: 17 }, () => [x(f), y(f)])),
  conf: Array.from({ length: n }, () => Array.from({ length: 17 }, () => conf)),
  detectado: Array.from({ length: n }, (_, f) => detectado(f)), anguloCodo: Array.from({ length: n }, () => null),
});

test('encuadreDeClip: caja de los dos tiradores en todos los frames más 8 % por lado', () => {
  // A recorre x 100→200, y 300; B recorre x 500→700, y 400→600.
  const p = poseCon(enPunto(3, f => 100 + f * 50, () => 300), enPunto(3, f => 500 + f * 100, f => 400 + f * 100), 3);
  const e = encuadreDeClip(p);
  const [x0, x1, y0, y1] = [100, 700, 300, 600];
  expect(e.x).toBeCloseTo(x0 - 0.08 * (x1 - x0));
  expect(e.y).toBeCloseTo(y0 - 0.08 * (y1 - y0));
  expect(e.w).toBeCloseTo(1.16 * (x1 - x0));
  expect(e.h).toBeCloseTo(1.16 * (y1 - y0));
});

test('encuadreDeClip: ignora frames no detectados y keypoints bajo conf_min (no se dibujan)', () => {
  const lejos = enPunto(3, f => (f === 2 ? 5000 : 100), () => 100, f => f !== 2);
  const bajo = enPunto(3, f => (f === 1 ? 9000 : 300), () => 300, () => true, 0.1);
  const p = poseCon(lejos, { ...bajo, color: 'VER' }, 3);
  // B tiene conf 0.1 en todo: nada válido. A solo vale en los frames 0 y 1, siempre en (100, 100).
  const e = encuadreDeClip(p);
  expect(e.x + e.w).toBeLessThan(1000);
  expect(e.w).toBeCloseTo(1.16); // caja degenerada: ancho mínimo de 1 px
});

test('encuadreDeClip: sin tiradores o sin puntos válidos devuelve el frame completo', () => {
  const completo = { x: 0, y: 0, w: 1920, h: 1080 };
  expect(encuadreDeClip({ ...poseCon(enPunto(1, () => 0, () => 0), enPunto(1, () => 0, () => 0), 1), tiradores: null })).toEqual(completo);
  const nada = enPunto(2, () => 10, () => 10, () => false);
  expect(encuadreDeClip(poseCon(nada, nada, 2))).toEqual(completo);
});

test('encuadreDeClip: es el mismo para cualquier frame (depende solo del clip)', () => {
  const p = poseCon(enPunto(4, f => f * 10, () => 200), enPunto(4, f => 800 - f * 10, () => 500), 4);
  expect(encuadreDeClip(p)).toEqual(encuadreDeClip({ ...p }));
});

test('ladoExterior: el codo a la derecha del torso da 1, a la izquierda -1', () => {
  const pts = (codoX: number) => {
    const v: (null | { x: number; y: number })[] = Array.from({ length: 17 }, () => null);
    for (const i of [5, 6, 11, 12]) v[i] = { x: 100, y: 100 };
    v[8] = { x: codoX, y: 120 };
    return v;
  };
  expect(ladoExterior(pts(160), 8)).toBe(1);
  expect(ladoExterior(pts(40), 8)).toBe(-1);
  expect(ladoExterior(Array.from({ length: 17 }, () => null), 8)).toBe(1); // sin codo visible: valor por defecto
});
