export type BrazoArmado = 'right' | 'left';

/** Combate creado con POST /matches/config; es el único origen de pista, árbitro y alias. */
export interface CombateActivo {
  matchId: string;
  /** Evento (sesión de validación) elegido al configurar. GET /matches/{id} no lo devuelve: null si no se recuerda. */
  eventoId: string | null;
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

/** Detalle de GET /revisiones/{id} (CONTRATO_API 1.3). */
export interface RevisionDetalle {
  id: string;
  abiertaEn: string;
  cerradaEn: string | null;
  sugerencia: {
    disponible: boolean;
    motivoNoDisp: string | null;
    clase: string | null;
    tirador: 'A' | 'B' | null;
    confianza: number | null;
  } | null;
  probabilidades: Record<string, number> | null;
  decision: string | null;
  claseFinal: string | null;
  registradoEn: string | null;
  auditoriaSeq: number | null;
  auditoriaHash: string | null;
}

/** Métricas de una validación (V1 o V2) en GET /validaciones/{evento_id}/resumen; solo los campos que usa la interfaz. */
export interface ResumenValidacion {
  nRevisiones: number;
  latencia: { p95Ms: number | null; p95ExcedeUmbral: boolean };
  kappa: { calculable: boolean; kappa: number | null; banda: string | null };
}

export interface ResumenSesion {
  V1: ResumenValidacion;
  V2: ResumenValidacion;
}

/** Valores de `decision` del veredicto (CONTRATO_API 7.1). */
export type Decision = 'mantener' | 'cambiar' | 'anular';
