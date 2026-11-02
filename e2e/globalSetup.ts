import type { FullConfig } from '@playwright/test';
import { verificarServidorLocal } from './servidorLocal';

/** Aborta la corrida si la URL base no sirve el Expo local (nunca se prueba contra el despliegue). */
export default async function globalSetup(config: FullConfig): Promise<void> {
  await verificarServidorLocal(config.projects[0].use.baseURL as string);
}
