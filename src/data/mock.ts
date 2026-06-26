import type { FencerColor, FencerProfile } from '../domain/entities/Fencer';
import type { HistorialEntry, CurrentActionData } from '../domain/entities/Action';
import type { CameraInfo } from '../domain/entities/Camera';
import type { TournamentInfo } from '../domain/entities/Match';
import type { SystemStatus } from '../domain/entities/System';

export type { FencerColor, FencerProfile, HistorialEntry, CurrentActionData, CameraInfo, TournamentInfo, SystemStatus };

// ── Session ──────────────────────────────────────────────
export const SESSION = {
  tournament: 'Madrid Open 2026',
  pista: '04',
  arbitro: 'J. Ortega',
  totalFrames: 142,
  currentFrame: 31,
  matchEnded: false,
};

// ── Historial (más reciente primero) ─────────────────────
export const HISTORIAL: HistorialEntry[] = [
  {
    id: 'P126',
    fencer: 'ROJ',
    action: 'PARADA-RESPUESTA',
    confidence: 94,
    timestamp: '01:01:847',
    durationMs: 1140,
  },
  {
    id: 'P125',
    fencer: 'VER',
    action: 'ATAQUE AL PECHO',
    confidence: 91,
    timestamp: '02:00:210',
    durationMs: 900,
  },
  {
    id: 'P124',
    fencer: 'ROJ',
    action: 'CONTRAATAQUE EN TIEMPO',
    confidence: 78,
    timestamp: '02:24:002',
    durationMs: 690,
  },
];

// ── Acción actual (mock) ──────────────────────────────────
export const CURRENT_ACTION: CurrentActionData = {
  fencer: 'ROJ' as FencerColor,
  fencerName: 'K. TANAKA',
  action: 'Parada-respuesta ZONA · Pecho',
  confidence: 94,
  model: 'sabre-pose-v2.4',
  latencyMs: 31,
};

// ── Cámaras ──────────────────────────────────────────────
export const CAMERAS: CameraInfo[] = [
  {
    id: 'cam01',
    label: 'CAM 01',
    role: 'Frontal',
    status: 'online',
    resolution: '1920×1080',
    fps: 60,
    exposure: '1/500',
    ip: '10.0.4.21',
    latencyMs: 28,
    poseML: true,
  },
  {
    id: 'cam02',
    label: 'CAM 02',
    role: 'Cenital',
    status: 'calibrating',
    resolution: '1920×1080',
    fps: 120,
    exposure: '1/500',
    ip: '10.0.4.22',
    latencyMs: 31,
    poseML: true,
  },
];

// ── Torneo y esgrimistas ─────────────────────────────────
export const FENCERS: { ROJ: FencerProfile; VER: FencerProfile } = {
  ROJ: {
    code: 'ROJ',
    name: 'K. TANAKA',
    fullName: 'Kenji Tanaka',
    country: 'JPN',
    flag: '🇯🇵',
    ranking: 12,
    score: 5,
    yellowCards: 1,
    redCards: 0,
  },
  VER: {
    code: 'VER',
    name: 'A. MORENO',
    fullName: 'Alejandro Moreno',
    country: 'ESP',
    flag: '🇪🇸',
    ranking: 7,
    score: 3,
    yellowCards: 0,
    redCards: 0,
  },
};

export const TOURNAMENT: TournamentInfo = {
  name: 'Madrid Open 2026',
  category: 'Élite Masculino',
  weapon: 'SABLE',
  round: 'Cuartos de Final',
  period: 2,
  totalPeriods: 3,
  timeElapsedSec: 156,
  timeLimitSec: 180,
  scoreLimit: 15,
  venue: 'Palacio de los Deportes, Madrid',
  date: '2026-06-05',
};

// ── Estado del sistema ────────────────────────────────────
export const SYSTEM: SystemStatus = {
  latencyAvgMs: 35,
  framesProcessed: 128482,
  syncRtpMs: 2,
  throughputFps: 120,
  precisionPct: 91.3,
  modelVersion: 'v2.4-sabre',
  falsePositives: 3,
  storageGbFree: 412,
};
