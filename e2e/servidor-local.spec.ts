import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { verificarServidorLocal } from './servidorLocal';

/** Levanta un servidor HTTP de prueba y devuelve su URL. */
async function servir(cabeceras: Record<string, string>, cuerpo: string): Promise<{ url: string; server: Server }> {
  const server = createServer((_req, res) => { res.writeHead(200, cabeceras); res.end(cuerpo); });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };
  return { url: `http://127.0.0.1:${port}`, server };
}

const EXPO_LOCAL = '<html><body><div id="root"></div><script src="/index.ts.bundle?platform=web&dev=true&hot=false" defer></script></body></html>';
const EXPO_EXPORTADO = '<html><body><div id="root"></div><script src="/_expo/static/js/web/index-abc.js" defer></script></body></html>';

test.describe('guardia: las pruebas E2E nunca corren contra el despliegue', () => {
  test('acepta el servidor de desarrollo de Expo', async () => {
    const { url, server } = await servir({ 'Content-Type': 'text/html' }, EXPO_LOCAL);
    try { await verificarServidorLocal(url); } finally { server.close(); }
  });

  test('aborta si responde el nginx del contenedor', async () => {
    const { url, server } = await servir({ 'Content-Type': 'text/html', Server: 'nginx/1.27.0' }, EXPO_LOCAL);
    try {
      await expect(verificarServidorLocal(url)).rejects.toThrow(/E2E abortado.*nginx.*despliegue remoto/);
    } finally { server.close(); }
  });

  test('aborta si la página es una exportación y no el Expo local', async () => {
    const { url, server } = await servir({ 'Content-Type': 'text/html' }, EXPO_EXPORTADO);
    try {
      await expect(verificarServidorLocal(url)).rejects.toThrow(/E2E abortado.*no sirve el Expo local/);
    } finally { server.close(); }
  });

  test('aborta si no responde nadie', async () => {
    await expect(verificarServidorLocal('http://127.0.0.1:1')).rejects.toThrow(/E2E abortado.*no responde/);
  });
});
