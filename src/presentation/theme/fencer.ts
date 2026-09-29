import type { FencerColor } from '../../domain/entities/Fencer';
import type { ThemeColors } from './colors';

/**
 * Rótulo del tirador. El color nunca es el único indicador: el lado (A/B) y el
 * nombre del color siempre van escritos. A = ROJ, B = VER (docs_claude/contexto_sabre.md).
 */
export const FENCER_LABEL: Record<FencerColor, string> = {
  ROJ: 'A · ROJ',
  VER: 'B · VER',
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
