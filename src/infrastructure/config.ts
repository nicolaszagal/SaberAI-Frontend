export const FOG_BASE_URL =
  (process.env.EXPO_PUBLIC_FOG_URL as string | undefined) ?? 'http://localhost:8001';

export const WS_FRONT_CAMERA_URL =
  (process.env.EXPO_PUBLIC_WS_FRONT_URL as string | undefined) ?? 'ws://localhost:8001/ws/camera/front';

export const WS_TOP_CAMERA_URL =
  (process.env.EXPO_PUBLIC_WS_TOP_URL as string | undefined) ?? 'ws://localhost:8001/ws/camera/top';
