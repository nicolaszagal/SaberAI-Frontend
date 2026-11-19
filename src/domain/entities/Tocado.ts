/** Tocado capturado por Edge (EDGE02). La sugerencia NO forma parte de la lista: solo aparece dentro de la revisión (D-04). */

export type EstadoPreproceso = 'procesando' | 'listo' | 'error';
export type FuenteTocado = 'favero' | 'simulado';

export interface DecisionPista {
  /** Clase del modelo (`AttackA`...), o null si se anuló. */
  clase: string | null;
  anulado: boolean;
}

export interface Tocado {
  tocadoId: string;
  creadoEn: string;
  fuente: FuenteTocado;
  luzA: boolean;
  luzB: boolean;
  tLuzAMs: number | null;
  tLuzBMs: number | null;
  estado: EstadoPreproceso;
  /** False si el clip ya se purgó (cierre de sesión). */
  tieneClip: boolean;
  revisionId: string | null;
  /** False = "No revisado" (se deriva de no tener revisión). */
  revisado: boolean;
  /** True solo para el tocado más reciente sin revisión. */
  admiteVar: boolean;
  decisionPista: DecisionPista | null;
}

export interface EstadoEdge {
  camara: {
    abierta: boolean;
    error: string | null;
    indice: number;
    resolucion: { ancho: number; alto: number };
    fps_configurados: number;
    fps_medidos: number;
    avisos: string[];
  };
  senal: { fuente: 'favero' | 'ninguna'; sin_senal_favero: boolean };
  /** True si Edge tiene el botón de señal de prueba habilitado (MODO_PRUEBA_SENAL=1). */
  modo_prueba: boolean;
  tocados_escritos: number;
  envio: { enviados: number; pendientes: number; errores: number } | null;
}

export interface CamaraDispositivo { indice: number; nombre: string }
export interface ConfigCamara { camara_indice: number; ancho: number; alto: number; fps: number }
