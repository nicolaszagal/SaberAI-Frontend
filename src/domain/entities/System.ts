export interface SystemStatus {
  latencyAvgMs: number;
  framesProcessed: number;
  syncRtpMs: number;
  throughputFps: number;
  precisionPct: number;
  modelVersion: string;
  falsePositives: number;
  storageGbFree: number;
}
