import type { FencerColor } from '../../domain/entities/Fencer';
import { DARK_THEME, type ThemeColors } from './colors';

/**
 * Rótulo del tirador: solo el nombre del color (EXP03-b). El color nunca es el único indicador, así que
 * el nombre siempre va escrito. A y B (ROJ y VER) quedan como identificadores internos (API, `tirador`).
 */
export const FENCER_LABEL: Record<FencerColor, string> = {
  ROJ: 'ROJ',
  VER: 'VER',
};

/**
 * Color del tirador en el tema activo.
 *
 * Args:
 *   C: colores del tema activo.
 *   fencer: código del tirador (`ROJ` = A, `VER` = B).
 *
 * Returns:
 *   El rojo del tema para A y el verde para B.
 */
export function fencerColor(C: ThemeColors, fencer: FencerColor): string {
  return fencer === 'ROJ' ? C.red : C.green;
}

/** Fondo del lienzo de los trazos (D-14): negro puro, sin video. */
export const FONDO_TRAZOS = '#000000';

/**
 * Color del tirador sobre el fondo negro del modal de trazos. Usa siempre el tema oscuro
 * (`fencerColor`), porque el lienzo es negro con cualquier tema y el rojo y el verde del tema
 * claro no alcanzan contraste AA sobre negro.
 *
 * Args:
 *   fencer: código del tirador (`ROJ` = A, `VER` = B).
 */
export function colorTrazo(fencer: FencerColor): string {
  return fencerColor(DARK_THEME, fencer);
}
