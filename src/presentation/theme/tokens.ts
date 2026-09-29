/**
 * Tokens de diseño no cromáticos: tipografía, espaciado y radios.
 * Los colores están en `colors.ts`.
 */

/** Escala tipográfica (px). Ninguna etiqueta baja de `xs`. */
export const FONT = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28 } as const;

/** Unidad base de espaciado (px). */
export const SPACE_UNIT = 4;

/**
 * Espaciado como múltiplo de la unidad base.
 *
 * Args:
 *   n: cantidad de unidades de 4 px.
 *
 * Returns:
 *   El espaciado en px (`space(3)` = 12).
 */
export const space = (n: number): number => n * SPACE_UNIT;

/** Radios de borde (px). */
export const RADIUS = { sm: 4, md: 8, lg: 12 } as const;

/** Alto mínimo de un botón o campo interactivo (px). */
export const CONTROL_HEIGHT = 44;
