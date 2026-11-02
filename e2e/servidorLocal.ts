/**
 * Guardia de las pruebas E2E: comprueba que la página servida en la URL base es el Expo local
 * (servidor de desarrollo) y no el despliegue remoto, que puede estar alcanzable por un túnel SSH
 * en el mismo puerto. Sin esta guardia, las pruebas correrían contra el despliegue sin avisar.
 */

/** Marca del servidor de desarrollo de Expo: su HTML carga el bundle con `dev=true`. */
const MARCA_EXPO_LOCAL = /\.bundle\?[^"']*dev=true/;

/**
 * Verifica que `baseUrl` sirva el Expo local.
 *
 * Args:
 *   baseUrl: URL base de las pruebas, p. ej. `http://localhost:8099`.
 *
 * Raises:
 *   Error: si no responde, si lo hace el nginx del contenedor o si la página no es el Expo local.
 */
export async function verificarServidorLocal(baseUrl: string): Promise<void> {
  const ayuda = 'Las pruebas E2E solo corren contra el Expo local (npx expo start --web); '
    + 'libere el puerto o elija otro con E2E_PORT.';
  let res: Response;
  try {
    res = await fetch(baseUrl);
  } catch (e) {
    throw new Error(`E2E abortado: ${baseUrl} no responde (${e instanceof Error ? e.message : e}). ${ayuda}`);
  }
  const servidor = res.headers.get('server') ?? '';
  const html = await res.text();
  if (/nginx/i.test(servidor)) {
    throw new Error(`E2E abortado: ${baseUrl} responde con nginx (${servidor}): es el despliegue remoto o su túnel, no el Expo local. ${ayuda}`);
  }
  if (!MARCA_EXPO_LOCAL.test(html)) {
    throw new Error(`E2E abortado: ${baseUrl} no sirve el Expo local (su HTML no carga el bundle de desarrollo). ${ayuda}`);
  }
}
