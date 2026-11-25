/**
 * frontend/types/veredicto.ts
 * Definiciones tipadas para la funcionalidad de 'El Veredicto'
 */

export type VeredictoEstado = 'CARO' | 'EN_LINEA' | 'BARATO';
export type VeredictoModalidad = 'alquiler' | 'comprar' | 'vender';

export interface VeredictoAjustes {
  estado: { valor: string; pct: number };
  ascensor: { valor: string; pct: number };
  tamano: { superficie_media: number; pct: number };
}

export interface VeredictoRequest {
  url?: string;
  precio?: number;
  metros?: number;
  barrio?: string;
  distrito?: string;
  operacion?: 'Venta' | 'Alquiler';
  estado_inmueble?: 'A reformar' | 'Buen estado' | 'Reformado';
  ascensor?: boolean;
}

export interface VeredictoResponse {
  veredicto: string;
  ref_base: number;
  ajustes: VeredictoAjustes;
  ref_ajustada: number;
  rango_bajo: number;
  rango_alto: number;
  rango_total_bajo: number;
  rango_total_alto: number;
  confianza: 'alta' | 'media' | 'baja' | string;
  confianza_indirecta: boolean;
  num_transacciones: number | null;
  anio_transacciones: number | null;
  periodo_dato: string;
  superficie_media: number;
  media_madrid: number;
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
  operacion?: string;
  estado_inmueble?: string | null;
  ascensor?: boolean | null;
}

export interface DossierCheckoutResponse {
  url: string;
  session_id: string;
}
