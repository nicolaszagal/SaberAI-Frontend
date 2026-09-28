import { useEffect, useRef, useState } from 'react';

const STALE_FRAME_MS = 2000;
const WATCHDOG_INTERVAL_MS = 500;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 8000;

interface CameraStreamState {
  frameUri: string | null;
  connected: boolean;
  latencyMs: number | null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Conecta a un WebSocket de frames JPEG binarios y expone el frame más reciente. */
export function useCameraStream(url: string): CameraStreamState {
  const [frameUri, setFrameUri] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const lastFrameAtRef = useRef<number | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let watchdogTimer: ReturnType<typeof setInterval> | null = null;
    let backoffMs = INITIAL_BACKOFF_MS;
    let stopped = false;

    function scheduleReconnect() {
      if (stopped) return;
      reconnectTimer = setTimeout(() => {
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
        connect();
      }, backoffMs);
    }

    function connect() {
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        backoffMs = INITIAL_BACKOFF_MS;
      };

      socket.onmessage = (event: MessageEvent) => {
        const data: unknown = event.data;
        if (!(data instanceof ArrayBuffer)) return;

        const now = Date.now();
        const previous = lastFrameAtRef.current;
        lastFrameAtRef.current = now;

        setLatencyMs(previous !== null ? now - previous : null);
        setFrameUri(`data:image/jpeg;base64,${arrayBufferToBase64(data)}`);
        setConnected(true);
      };

      socket.onclose = () => {
        if (stopped) return;
        setConnected(false);
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    watchdogTimer = setInterval(() => {
      const lastFrameAt = lastFrameAtRef.current;
      if (lastFrameAt === null || Date.now() - lastFrameAt > STALE_FRAME_MS) {
        setConnected(false);
      }
    }, WATCHDOG_INTERVAL_MS);

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (watchdogTimer) clearInterval(watchdogTimer);
      socket?.close();
    };
  }, [url]);

  return { frameUri, connected, latencyMs };
}
