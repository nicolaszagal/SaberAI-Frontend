export type BrazoArmado = 'right' | 'left';

/** Combate creado con POST /matches/config; es el único origen de pista, árbitro y alias. */
export interface CombateActivo {
  matchId: string;
  pista: string;
  arbitroId: string;
  arbitro: string;
  aliasA: string;
  aliasB: string;
  brazoA: BrazoArmado;
  brazoB: BrazoArmado;
}

export interface EventoCatalogo {
  id: string;
  nombre: string;
  fecha: string;
}

export interface UsuarioCatalogo {
  id: string;
  nombre: string;
}

/** Datos de un tirador en el formulario de configuración (sufijo A o B del contrato). */
export interface TiradorConfig {
  alias: string;
  brazo: BrazoArmado;
  esMenor: boolean;
  consentimientoFirmado: boolean;
  consentimientoFecha: string | null;
  firmante: string | null;
}

export interface ConfigCombateInput {
  eventoId: string;
  pista: string;
  arbitroId: string;
  a: TiradorConfig;
  b: TiradorConfig;
}

export type EstadoComponente = 'ok' | 'error';

export interface HealthResponse {
  fog: EstadoComponente;
  redis: EstadoComponente;
  postgres: EstadoComponente;
}

export interface ModeloActivo {
  nombre: string;
}

/** Fila de GET /revisiones. */
export interface RevisionResumen {
  id: string;
  abiertaEn: string;
  disponible: boolean;
  clase: string | null;
  confianza: number | null;
  decision: string | null;
  claseFinal: string | null;
}

/** Valores de `decision` del veredicto (CONTRATO_API 7.1). */
export type Decision = 'mantener' | 'cambiar' | 'anular';
