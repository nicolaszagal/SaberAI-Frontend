/**
 * Colores de la interfaz por tema. Todo color de texto de este archivo cumple
 * contraste AA (4.5:1) sobre `bg`, `surface` y `card`; lo verifica
 * `e2e/contraste.spec.ts`.
 *
 * `textDim` es solo para elementos no textuales (bordes de reposo, iconos
 * inactivos). Nunca se usa como color de texto.
 */
export type ThemeColors = {
  bg: string; surface: string; card: string;
  border: string; borderBright: string;
  text: string; textMuted: string; textDim: string;
  green: string; greenDark: string;
  red: string; redDark: string;
  cyan: string; orange: string;
  blue: string; blueDark: string;
  primary: string; onPrimary: string;
  live: string; liveText: string;
  confirmBg: string; confirmText: string;
  anularBg: string; anularText: string;
  manualBg: string; manualText: string;
};

export const DARK_THEME: ThemeColors = {
  bg: '#0a0a0a',        surface: '#111111',     card: '#161616',
  border: '#2a2a2a',    borderBright: '#444444',
  text: '#ffffff',      textMuted: '#a3a3a3',    textDim: '#4a4a4a',
  green: '#4ade80',     greenDark: '#166534',
  red: '#f87171',       redDark: '#991b1b',
  cyan: '#22d3ee',      orange: '#f59e0b',
  blue: '#60a5fa',      blueDark: '#1e3a5f',
  primary: '#22d3ee',   onPrimary: '#001b22',
  live: '#dc2626',      liveText: '#fca5a5',
  confirmBg: '#14532d', confirmText: '#bbf7d0',
  anularBg: '#7f1d1d',  anularText: '#fecaca',
  manualBg: '#1e3a5f',  manualText: '#bfdbfe',
};

export const LIGHT_THEME: ThemeColors = {
  bg: '#f0f2f5',        surface: '#ffffff',      card: '#f8f9fa',
  border: '#c9cfd8',    borderBright: '#8b93a1',
  text: '#111827',      textMuted: '#4b5563',    textDim: '#b0b7c3',
  green: '#166534',     greenDark: '#14532d',
  red: '#b91c1c',       redDark: '#7f1d1d',
  cyan: '#0e7490',      orange: '#9a4a08',
  blue: '#1d4ed8',      blueDark: '#1e3a5f',
  primary: '#0e7490',   onPrimary: '#ffffff',
  live: '#dc2626',      liveText: '#991b1b',
  confirmBg: '#dcfce7', confirmText: '#14532d',
  anularBg: '#fee2e2',  anularText: '#7f1d1d',
  manualBg: '#dbeafe',  manualText: '#1e3a8a',
};
