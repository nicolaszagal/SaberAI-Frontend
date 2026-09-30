import { Platform } from 'react-native';

/** Indica si la plataforma puede descargar archivos (solo web). */
export const puedeDescargar = Platform.OS === 'web';

/**
 * Descarga un texto como archivo desde el navegador.
 *
 * Args:
 *   nombre: nombre del archivo.
 *   contenido: texto del archivo.
 *   mime: tipo de contenido (por defecto JSON).
 *
 * Raises:
 *   Error: si la plataforma no es web.
 */
export function descargarTexto(nombre: string, contenido: string, mime = 'application/json'): void {
  if (!puedeDescargar) throw new Error('La descarga solo está disponible en la versión web');
  const url = URL.createObjectURL(new Blob([contenido], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
