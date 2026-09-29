/**
 * CalibrationModal — Calibración guiada por QR
 * 4 pasos: Preparar patrón → Posicionar → Detectar → Resultado
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, StyleSheet,
} from 'react-native';
import Svg, {
  Rect, Circle, Line, Defs, LinearGradient, Stop, Path, G,
} from 'react-native-svg';
import { useC } from '../context/ThemeContext';
import type { CameraInfo } from '../../domain/entities/Camera';

// ── QR algorítmico (21 × 21 módulos) ─────────────────────

const MODULE = 5;
const QZ     = 10;   // quiet zone
const N      = 21;
const QR_SIZE = N * MODULE + QZ * 2;

function isDark(r: number, c: number, seed: number): boolean {
  // Finder TL
  if (r < 7 && c < 7) {
    if (r === 0 || r === 6 || c === 0 || c === 6) return true;
    if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
    return false;
  }
  // Finder TR
  if (r < 7 && c >= 14) {
    const cc = c - 14;
    if (r === 0 || r === 6 || cc === 0 || cc === 6) return true;
    if (r >= 2 && r <= 4 && cc >= 2 && cc <= 4) return true;
    return false;
  }
  // Finder BL
  if (r >= 14 && c < 7) {
    const rr = r - 14;
    if (rr === 0 || rr === 6 || c === 0 || c === 6) return true;
    if (rr >= 2 && rr <= 4 && c >= 2 && c <= 4) return true;
    return false;
  }
  // Alignment pattern (V2: row 16-18, col 16-18)
  if (r >= 16 && r <= 18 && c >= 16 && c <= 18) {
    if (r === 16 || r === 18 || c === 16 || c === 18) return true;
    if (r === 17 && c === 17) return true;
    return false;
  }
  // Separators
  if (r === 7 || c === 7) return false;
  // Timing strips
  if (r === 6 && c >= 8 && c <= 12) return c % 2 === 0;
  if (c === 6 && r >= 8 && r <= 12) return r % 2 === 0;
  // Format info band
  if (r === 8 && c <= 8) return false;
  if (c === 8 && r <= 8) return false;
  // Data modules: deterministic pseudo-random
  const h = ((r * 137 + c * 71 + seed) * 1031) & 0xffff;
  return (h % 100) < 47;
}

function QRCode({ camId }: { camId: string }) {
  const seed = camId.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isDark(r, c, seed)) cells.push({ r, c });
    }
  }
  return (
    <Svg width={QR_SIZE} height={QR_SIZE}>
      <Rect width={QR_SIZE} height={QR_SIZE} fill="#ffffff" />
      {cells.map(({ r, c }) => (
        <Rect
          key={`${r}-${c}`}
          x={QZ + c * MODULE} y={QZ + r * MODULE}
          width={MODULE} height={MODULE}
          fill="#000000"
        />
      ))}
    </Svg>
  );
}

// ── Diagrama FOV (paso 2) ─────────────────────────────────

function FOVDiagram() {
  const C = useC();
  return (
    <Svg width={160} height={130} viewBox="0 0 160 130">
      <Defs>
        <LinearGradient id="fovGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.cyan} stopOpacity={0.08} />
          <Stop offset="1" stopColor={C.cyan} stopOpacity={0.22} />
        </LinearGradient>
      </Defs>
      {/* Campo visual */}
      <Path d="M 80 18 L 15 110 L 145 110 Z" fill="url(#fovGrad)" stroke={C.cyan} strokeWidth={1} strokeDasharray="5 3" opacity={0.6} />
      {/* Cámara */}
      <Rect x={68} y={4} width={24} height={14} rx={3} fill={C.surface} stroke={C.cyan} strokeWidth={1.5} />
      <Circle cx={80} cy={11} r={3} fill={C.cyan} opacity={0.8} />
      {/* Patrón QR en el centro del FOV */}
      <Rect x={58} y={70} width={44} height={38} rx={2} fill="#ffffff" stroke={C.orange} strokeWidth={1.5} />
      {/* Mini QR dentro */}
      {[0,1,2].map(r => [0,1,2].map(c => (
        <Rect key={`${r}-${c}`}
          x={62 + c * 5} y={74 + r * 5}
          width={4} height={4}
          fill={(r === 0 || r === 2 || c === 0 || c === 2 || (r === 1 && c === 1)) ? '#000' : '#fff'} />
      )))}
      {/* Flechas de centrado */}
      <Line x1={80} y1={60} x2={80} y2={68} stroke={C.orange} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={77} y1={65} x2={80} y2={68} stroke={C.orange} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={83} y1={65} x2={80} y2={68} stroke={C.orange} strokeWidth={1.2} strokeLinecap="round" />
      {/* Etiqueta distancia */}
      <Rect x={106} y={80} width={46} height={16} rx={3} fill={C.card} stroke={C.border} strokeWidth={1} />
      <G>
        <Line x1={102} y1={89} x2={107} y2={89} stroke={C.textMuted} strokeWidth={0.8} />
      </G>
    </Svg>
  );
}

// ── Constantes de detección ───────────────────────────────

const DETECT_STEPS = [
  { pct: 10,  msg: 'Iniciando captura de imagen...' },
  { pct: 28,  msg: 'Escaneando frame en busca del patrón...' },
  { pct: 46,  msg: 'Patrón QR encontrado en el cuadro ✓' },
  { pct: 62,  msg: 'Extrayendo 4 esquinas de referencia...' },
  { pct: 76,  msg: 'Calculando homografía de la cámara...' },
  { pct: 88,  msg: 'Estimando parámetros intrínsecos...' },
  { pct: 100, msg: 'Calibración completada exitosamente ✓' },
];

const DETECT_DELAYS = [300, 700, 1150, 1650, 2150, 2700, 3300];

// ── Parámetros de calibración mock ───────────────────────

function calibParams(cam: CameraInfo) {
  // Deterministic mock values seeded by camera ID
  const seed = cam.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const base = 1840 + (seed % 20);
  return [
    { label: 'Error de reproyección', value: `${(0.38 + (seed % 15) * 0.01).toFixed(2)} px`, note: 'Excelente  < 0.5 px', ok: true },
    { label: 'Focal length  fx',      value: `${base + 5}.${seed % 9} px`,   note: 'Nominal',    ok: true },
    { label: 'Focal length  fy',      value: `${base + 8}.${(seed+3) % 9} px`, note: 'Nominal', ok: true },
    { label: 'Centro óptico  cx',     value: `${960 + (seed % 8)}.${seed % 9} px`, note: '',   ok: true },
    { label: 'Centro óptico  cy',     value: `${539 + (seed % 6)}.${(seed+5) % 9} px`, note: '', ok: true },
    { label: 'Distorsión  k1',        value: `-0.0${20 + seed % 5}`,          note: 'Baja', ok: true },
    { label: 'Distorsión  k2',        value: `0.00${7 + seed % 3}`,           note: 'Baja', ok: true },
  ];
}

// ── Componente principal ──────────────────────────────────

interface Props { camera: CameraInfo | null; onClose: () => void }

export function CalibrationModal({ camera, onClose }: Props) {
  const C  = useC();
  const s  = useMemo(() => styles(C), [C]);
  const [step, setStep]           = useState(1);
  const [detecting, setDetecting] = useState(false);
  const [done, setDone]           = useState(false);
  const [detectPct, setDetectPct] = useState(0);
  const [detectMsg, setDetectMsg] = useState('');
  const [detectedSteps, setDetected] = useState<number[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (camera) {
      setStep(1); setDetecting(false); setDone(false);
      setDetectPct(0); setDetectMsg(''); setDetected([]);
    } else {
      timers.current.forEach(clearTimeout);
    }
  }, [camera]);

  const startDetection = useCallback(() => {
    setDetecting(true);
    setDetectPct(0); setDetected([]);
    DETECT_STEPS.forEach(({ pct, msg }, i) => {
      const t = setTimeout(() => {
        setDetectPct(pct);
        setDetectMsg(msg);
        setDetected(prev => [...prev, i]);
        if (pct === 100) {
          setDetecting(false);
          setDone(true);
          const t2 = setTimeout(() => setStep(4), 700);
          timers.current.push(t2);
        }
      }, DETECT_DELAYS[i]);
      timers.current.push(t);
    });
  }, []);

  if (!camera) return null;

  const calParams = calibParams(camera);
  const calId = `CAL-${camera.id.toUpperCase()}`;

  // ── Header ──────────────────────────────────────────────
  const header = (
    <View style={s.header}>
      <View style={s.headerL}>
        <Text style={s.headerTitle}>CALIBRACIÓN GUIADA POR QR</Text>
        <Text style={s.headerSub}>{camera.label}  ·  {camera.role}  ·  {camera.ip}</Text>
      </View>
      <StepPills step={step} total={4} C={C} />
      <TouchableOpacity style={s.closeBtn} onPress={onClose}>
        <Text style={s.closeTxt}>✕ CERRAR</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Nav buttons ──────────────────────────────────────────
  const nav = (
    <View style={s.nav}>
      {step > 1 && !detecting && (
        <TouchableOpacity style={s.navBack} onPress={() => setStep(p => p - 1)}>
          <Text style={s.navBackTxt}>← ANTERIOR</Text>
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }} />
      {step < 4 && step !== 3 && (
        <TouchableOpacity style={s.navNext} onPress={() => setStep(p => p + 1)}>
          <Text style={s.navNextTxt}>SIGUIENTE  →</Text>
        </TouchableOpacity>
      )}
      {step === 4 && (
        <TouchableOpacity style={s.navSave} onPress={onClose}>
          <Text style={s.navSaveTxt}>✓  GUARDAR Y APLICAR CALIBRACIÓN</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal transparent animationType="fade" visible={!!camera} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.box}>
          {header}
          <View style={s.body}>
            {step === 1 && <Step1 C={C} calId={calId} camera={camera} />}
            {step === 2 && <Step2 C={C} camera={camera} />}
            {step === 3 && (
              <Step3
                C={C}
                detecting={detecting}
                done={done}
                detectPct={detectPct}
                detectMsg={detectMsg}
                detectedSteps={detectedSteps}
                onStart={startDetection}
              />
            )}
            {step === 4 && <Step4 C={C} params={calParams} camera={camera} />}
          </View>
          {nav}
        </View>
      </View>
    </Modal>
  );
}

// ── Step Pill indicator ───────────────────────────────────

function StepPills({ step, total, C }: { step: number; total: number; C: any }) {
  const labels = ['PREPARAR', 'POSICIONAR', 'DETECTAR', 'RESULTADO'];
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const active  = n === step;
        const done    = n < step;
        return (
          <React.Fragment key={n}>
            {i > 0 && <View style={{ width: 14, height: 1, backgroundColor: done ? C.cyan : C.border }} />}
            <View style={{
              paddingHorizontal: 9, paddingVertical: 4, borderRadius: 3,
              borderWidth: 1,
              borderColor: active ? C.cyan : done ? C.cyan + '66' : C.border,
              backgroundColor: active ? C.cyan + '22' : 'transparent',
            }}>
              <Text style={{
                fontSize: 9, fontWeight: '700', letterSpacing: 0.5,
                color: active ? C.cyan : done ? C.cyan + 'aa' : C.textMuted,
              }}>
                {n}  {labels[i]}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Step 1: Preparar ─────────────────────────────────────

function Step1({ C, calId, camera }: { C: any; calId: string; camera: CameraInfo }) {
  const s = useMemo(() => stepStyles(C), [C]);
  return (
    <View style={s.twoCol}>
      <View style={s.visual}>
        <QRCode camId={camera.id} />
        <Text style={[s.calId, { color: C.text }]}>{calId}</Text>
        <Text style={[s.calNote, { color: C.textMuted }]}>Tamaño rec. ≥ 20 × 20 cm</Text>
      </View>
      <View style={s.instructions}>
        <Text style={s.stepTitle}>PREPARAR EL PATRÓN DE CALIBRACIÓN</Text>
        <Text style={s.body}>
          Imprime este código QR o muéstralo en una pantalla secundaria{' '}
          <Text style={{ color: C.orange }}>sin reflejos</Text>.
          El patrón contiene la información de calibración exclusiva para{' '}
          <Text style={{ color: C.cyan }}>{camera.label}</Text>.
        </Text>
        <View style={s.checkList}>
          <CheckItem C={C} text="Tamaño mínimo recomendado: 20 × 20 cm" />
          <CheckItem C={C} text="Usa papel mate o pantalla con brillo reducido" />
          <CheckItem C={C} text="El patrón debe estar completo, sin recortar" />
          <CheckItem C={C} text="Evita arrugas, dobleces o distorsiones" />
        </View>
        <TouchableOpacity style={s.btnSec}>
          <Text style={[s.btnSecTxt, { color: C.textMuted }]}>⬇  Descargar PDF del patrón</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Step 2: Posicionar ────────────────────────────────────

function Step2({ C, camera }: { C: any; camera: CameraInfo }) {
  const s = useMemo(() => stepStyles(C), [C]);
  return (
    <View style={s.twoCol}>
      <View style={s.visual}>
        <FOVDiagram />
        <Text style={[s.calNote, { color: C.textMuted, marginTop: 6, textAlign: 'center' }]}>
          Campo visual de {camera.label}
        </Text>
      </View>
      <View style={s.instructions}>
        <Text style={s.stepTitle}>POSICIONAR EL PATRÓN EN EL CAMPO VISUAL</Text>
        <Text style={s.body}>
          Coloca el patrón QR <Text style={{ color: C.cyan }}>centrado</Text> en el campo visual
          de <Text style={{ color: C.cyan }}>{camera.label}</Text> ({camera.role}).
          Asegúrate de que sea claramente visible desde el ángulo de la cámara.
        </Text>
        <View style={s.checkList}>
          <CheckItem C={C} text="Patrón centrado en el encuadre de la cámara" />
          <CheckItem C={C} text="Superficie plana y estable (no sostenido en mano)" />
          <CheckItem C={C} text="Iluminación uniforme, sin sombras sobre el patrón" />
          <CheckItem C={C} text="Sin reflejos ni brillos sobre la superficie" />
          <CheckItem C={C} text="Cámara quieta durante toda la detección" />
        </View>
        <View style={[s.infoBox, { borderColor: C.cyan + '55', backgroundColor: C.cyan + '0d' }]}>
          <Text style={[s.infoTxt, { color: C.cyan }]}>
            ℹ  La cámara debe estar a entre 0.5 m y 3 m del patrón, dependiendo de su resolución ({camera.resolution}).
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Step 3: Detectar ─────────────────────────────────────

function Step3({
  C, detecting, done, detectPct, detectMsg, detectedSteps, onStart,
}: {
  C: any; detecting: boolean; done: boolean; detectPct: number;
  detectMsg: string; detectedSteps: number[]; onStart: () => void;
}) {
  const s = useMemo(() => stepStyles(C), [C]);
  const canStart = !detecting && !done;

  return (
    <View style={s.centerCol}>
      <Text style={s.stepTitle}>DETECCIÓN DEL PATRÓN</Text>
      <Text style={[s.body, { textAlign: 'center', maxWidth: 480 }]}>
        El sistema capturará frames de {' '}
        <Text style={{ color: C.cyan }}>30 imágenes</Text> y calculará los parámetros
        de calibración usando el patrón QR detectado.
      </Text>

      {canStart && (
        <TouchableOpacity style={[s.btnPri, { marginTop: 16 }]} onPress={onStart}>
          <Text style={[s.btnPriTxt, { color: C.bg }]}>▶  INICIAR DETECCIÓN</Text>
        </TouchableOpacity>
      )}

      {(detecting || done) && (
        <View style={s.detectArea}>
          {/* Barra de progreso */}
          <View style={s.progressBg}>
            <View style={[s.progressFill, {
              width: `${detectPct}%` as any,
              backgroundColor: done ? C.green : C.cyan,
            }]} />
          </View>
          <Text style={[s.progressPct, { color: done ? C.green : C.cyan }]}>
            {detectPct}%
          </Text>

          {/* Log de pasos */}
          <View style={s.detectLog}>
            {DETECT_STEPS.map((ds, i) => {
              const active  = detectedSteps.includes(i);
              const current = active && i === detectedSteps.length - 1 && !done;
              return (
                <View key={i} style={s.detectLogRow}>
                  <Text style={{ color: active ? C.green : C.textDim, fontSize: 11, marginRight: 6 }}>
                    {active ? '✓' : '○'}
                  </Text>
                  <Text style={[s.detectLogTxt, {
                    color: current ? C.text : active ? C.green : C.textDim,
                    fontWeight: current ? '700' : '400',
                  }]}>
                    {ds.msg}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Step 4: Resultado ─────────────────────────────────────

function Step4({ C, params, camera }: { C: any; params: ReturnType<typeof calibParams>; camera: CameraInfo }) {
  const s = useMemo(() => stepStyles(C), [C]);
  return (
    <View style={s.centerCol}>
      <View style={[s.successBadge, { borderColor: C.green + '66', backgroundColor: C.green + '11' }]}>
        <Text style={{ fontSize: 28 }}>✓</Text>
        <View>
          <Text style={[s.stepTitle, { color: C.green }]}>CALIBRACIÓN COMPLETADA</Text>
          <Text style={[s.calNote, { color: C.textMuted }]}>{camera.label}  ·  {camera.role}</Text>
        </View>
      </View>

      <View style={s.paramsTable}>
        <View style={[s.paramRow, s.paramHeader]}>
          <Text style={[s.paramLabel, { color: C.textMuted, fontWeight: '700' }]}>PARÁMETRO</Text>
          <Text style={[s.paramValue, { color: C.textMuted, fontWeight: '700' }]}>VALOR</Text>
          <Text style={[s.paramNote,  { color: C.textMuted, fontWeight: '700' }]}>ESTADO</Text>
        </View>
        {params.map((p, i) => (
          <View key={i} style={[s.paramRow, i % 2 === 0 && { backgroundColor: C.surface + '80' }]}>
            <Text style={s.paramLabel}>{p.label}</Text>
            <Text style={[s.paramValue, { color: C.cyan }]}>{p.value}</Text>
            <Text style={[s.paramNote,  { color: p.ok ? C.green : C.orange }]}>{p.note || '—'}</Text>
          </View>
        ))}
      </View>

      <View style={[s.infoBox, { borderColor: C.orange + '44', backgroundColor: C.orange + '0d' }]}>
        <Text style={[s.infoTxt, { color: C.orange }]}>
          ⚠  La calibración real requiere conexión activa al pipeline GStreamer de la cámara. Los valores mostrados son simulados para este prototipo.
        </Text>
      </View>
    </View>
  );
}

// ── Util: checkmark item ──────────────────────────────────

function CheckItem({ C, text }: { C: any; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginBottom: 5 }}>
      <Text style={{ color: C.green, fontSize: 11, lineHeight: 17 }}>✓</Text>
      <Text style={{ color: C.text, fontSize: 11, flex: 1, lineHeight: 17 }}>{text}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────

const styles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: '#000000cc',
    justifyContent: 'center', alignItems: 'center',
  },
  box: {
    width: '88%', maxWidth: 860,
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 8, overflow: 'hidden',
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerL:    { flex: 1 },
  headerTitle:{ color: C.text,     fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  headerSub:  { color: C.textMuted,fontSize: 10, marginTop: 2 },
  closeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 4, backgroundColor: C.card,
  },
  closeTxt: { color: C.textMuted, fontSize: 11, fontWeight: '600' },
  body: { padding: 20, minHeight: 280 },
  nav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  navBack: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 5, backgroundColor: C.card,
  },
  navBackTxt: { color: C.textMuted, fontSize: 12, fontWeight: '600' },
  navNext: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderWidth: 1, borderColor: C.cyan,
    borderRadius: 5, backgroundColor: C.cyan + '22',
  },
  navNextTxt: { color: C.cyan, fontSize: 12, fontWeight: '700' },
  navSave: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: C.green,
    borderRadius: 5, backgroundColor: C.green + '22',
  },
  navSaveTxt: { color: C.green, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});

const stepStyles = (C: ReturnType<typeof useC>) => StyleSheet.create({
  twoCol: { flexDirection: 'row', gap: 24, flex: 1 },
  visual: { alignItems: 'center', justifyContent: 'center', width: 145, gap: 6 },
  instructions: { flex: 1, gap: 10 },
  stepTitle: { color: C.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  body: { color: C.textMuted, fontSize: 11, lineHeight: 17 },
  calId:   { color: C.text,     fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  calNote: { color: C.textMuted,fontSize: 9 },
  checkList: { gap: 0, marginTop: 4 },
  btnSec: {
    marginTop: 8, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 5,
    backgroundColor: C.card,
  },
  btnSecTxt: { fontSize: 11, fontWeight: '600' },
  btnPri: {
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 6, backgroundColor: C.cyan,
  },
  btnPriTxt: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  infoBox: { borderWidth: 1, borderRadius: 5, padding: 10, marginTop: 6 },
  infoTxt: { fontSize: 10, lineHeight: 15 },

  centerCol: { alignItems: 'center', gap: 14, flex: 1 },
  detectArea: { width: '100%', maxWidth: 520, gap: 10 },
  progressBg: {
    height: 8, backgroundColor: C.card,
    borderRadius: 4, overflow: 'hidden', width: '100%',
  },
  progressFill: { height: 8, borderRadius: 4 },
  progressPct: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  detectLog: { gap: 2, marginTop: 6 },
  detectLogRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  detectLogTxt: { fontSize: 11, flex: 1 },

  successBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  paramsTable: {
    width: '100%', borderWidth: 1, borderColor: C.border,
    borderRadius: 6, overflow: 'hidden',
  },
  paramHeader: { backgroundColor: C.surface },
  paramRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  paramLabel: { flex: 2, color: C.text,     fontSize: 10 },
  paramValue: { flex: 1.5, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  paramNote:  { flex: 1,   fontSize: 9,  textAlign: 'right' },
});
