/**
 * frontend/types/veredicto.ts
 * Definiciones tipadas para la funcionalidad de 'El Veredicto'
 */

export type VeredictoEstado = 'CARO' | 'EN_LINEA' | 'BARATO';

export interface VeredictoRequest {
  url?: string;
  precio?: number;
  metros?: number;
  barrio?: string;
  distrito?: string;
  operacion?: 'Venta' | 'Alquiler';
}

export interface VeredictoResponse {
  estado: VeredictoEstado;
  precio_m2_inmueble: number;
  precio_m2_barrio_medio: number;
  precio_m2_distrito_medio: number;
  precio_m2_madrid_medio: number;
  desviacion_pct_barrio: number;
  desviacion_pct_madrid: number;
  margen_negociacion_estimado_eur: number;
  tendencia_trimestral_pct: number;
  precio_justo_estimado_eur: number;
  barrio_nombre: string;
  distrito_nombre: string;
  resumen_argumentos: string[];
  fecha_cierre_referencia: string;
}

export interface DossierCheckoutResponse {
  url: string;
  session_id: string;
}
