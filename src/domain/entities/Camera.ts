export interface CameraInfo {
  id: string;
  label: string;
  role: string;
  status: 'online' | 'calibrating' | 'offline';
  resolution: string;
  fps: number;
  exposure: string;
  ip: string;
  latencyMs: number;
  poseML: boolean;
}
