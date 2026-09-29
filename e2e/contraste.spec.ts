import { test, expect } from '@playwright/test';
import { DARK_THEME, LIGHT_THEME, type ThemeColors } from '../src/presentation/theme/colors';

/** Luminancia relativa WCAG 2.x de un color #rrggbb. */
function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

/** Relación de contraste WCAG entre dos colores #rrggbb. */
function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Textos que la interfaz dibuja sobre los fondos de página, panel y tarjeta.
const TEXTOS: (keyof ThemeColors)[] = ['text', 'textMuted', 'green', 'red', 'cyan', 'orange', 'blue'];
const FONDOS: (keyof ThemeColors)[] = ['bg', 'surface', 'card'];

// Texto sobre el relleno de su propio botón o aviso.
const PARES: [keyof ThemeColors, keyof ThemeColors][] = [
  ['confirmText', 'confirmBg'],
  ['anularText', 'anularBg'],
  ['manualText', 'manualBg'],
  ['onPrimary', 'primary'],
];

const AA_TEXTO_NORMAL = 4.5;

for (const [nombre, C] of [['claro', LIGHT_THEME], ['oscuro', DARK_THEME]] as const) {
  test.describe(`contraste AA · tema ${nombre}`, () => {
    for (const t of TEXTOS) {
      for (const f of FONDOS) {
        test(`${t} sobre ${f}`, () => {
          expect(contraste(C[t], C[f])).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
        });
      }
    }
    for (const [t, f] of PARES) {
      test(`${t} sobre ${f}`, () => {
        expect(contraste(C[t], C[f])).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
      });
    }
  });
}
