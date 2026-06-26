export type ThemeColors = {
  bg: string; surface: string; card: string;
  border: string; borderBright: string;
  text: string; textMuted: string; textDim: string;
  green: string; greenDark: string;
  red: string; redDark: string;
  cyan: string; orange: string;
  blue: string; blueDark: string;
  live: string; liveText: string;
  confirmBg: string; confirmText: string;
  anularBg: string; anularText: string;
  manualBg: string; manualText: string;
};

export const DARK_THEME: ThemeColors = {
  bg: '#0a0a0a',        surface: '#111111',     card: '#161616',
  border: '#222222',    borderBright: '#333333',
  text: '#ffffff',      textMuted: '#888888',    textDim: '#3a3a3a',
  green: '#4ade80',     greenDark: '#166534',
  red: '#f87171',       redDark: '#991b1b',
  cyan: '#22d3ee',      orange: '#f59e0b',
  blue: '#3b82f6',      blueDark: '#1e3a5f',
  live: '#dc2626',      liveText: '#fca5a5',
  confirmBg: '#14532d', confirmText: '#4ade80',
  anularBg: '#7f1d1d',  anularText: '#f87171',
  manualBg: '#1e3a5f',  manualText: '#93c5fd',
};

export const LIGHT_THEME: ThemeColors = {
  bg: '#f0f2f5',        surface: '#ffffff',      card: '#f8f9fa',
  border: '#dde1e8',    borderBright: '#b8bec9',
  text: '#111827',      textMuted: '#6b7280',    textDim: '#b0b7c3',
  green: '#16a34a',     greenDark: '#14532d',
  red: '#dc2626',       redDark: '#7f1d1d',
  cyan: '#0891b2',      orange: '#d97706',
  blue: '#2563eb',      blueDark: '#1e3a5f',
  live: '#dc2626',      liveText: '#991b1b',
  confirmBg: '#f0fdf4', confirmText: '#16a34a',
  anularBg: '#fef2f2',  anularText: '#dc2626',
  manualBg: '#eff6ff',  manualText: '#2563eb',
};

// Legacy default export (dark) — kept for any stray imports
export const C = DARK_THEME;
