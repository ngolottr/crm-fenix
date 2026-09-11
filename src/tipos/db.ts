// Tipos de las filas tal como las devuelve Supabase. Si cambia el esquema SQL,
// se actualizan acá.
import type { Canal, Etapa, Origen, Tamano, TipoCobro, TipoInteraccion } from './dominio'

export interface Perfil {
  id: string
  nombre: string
  rol: 'admin' | 'vendedor'
  activo: boolean
}

export interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  precio_base: number
  tipo_cobro: TipoCobro
  activo: boolean
  es_demo: boolean
}

export interface Empresa {
  id: string
  nombre: string
  rubro: string | null
  tamano: Tamano | null
  web: string | null
  herramientas: string[]
  notas: string | null
  es_demo: boolean
}

export interface Contacto {
  id: string
  nombre: string
  cargo: string | null
  email: string | null
  whatsapp: string | null
  empresa_id: string | null
  origen: Origen | null
  es_decisor: boolean
  es_demo: boolean
}

export interface Oportunidad {
  id: string
  empresa_id: string
  contacto_id: string | null
  servicio_id: string | null
  dolor_detectado: string | null
  monto_setup: number
  monto_mensual: number
  probabilidad: number
  etapa: Etapa
  orden: number
  fecha_cierre_estimada: string | null
  origen: Origen | null
  responsable: string
  motivo_perdida: string | null
  es_demo: boolean
  creado_en: string
  actualizado_en: string
}

export interface OportunidadVista extends Oportunidad {
  empresa_nombre: string
  contacto_nombre: string | null
  contacto_cargo: string | null
  contacto_email: string | null
  contacto_whatsapp: string | null
  servicio_nombre: string | null
  responsable_nombre: string | null
  valor_anual: number
  ultima_interaccion: string | null
  dias_sin_interaccion: number
  proxima_accion: string | null
  fecha_proxima_accion: string | null
}

export interface Interaccion {
  id: string
  oportunidad_id: string
  tipo: TipoInteraccion
  fecha: string
  resumen: string
  proxima_accion: string | null
  fecha_proxima_accion: string | null
  creado_en: string
}

export interface CambioEtapa {
  id: number
  oportunidad_id: string
  etapa_anterior: Etapa | null
  etapa_nueva: Etapa
  cambiado_en: string
}

export interface Tarea {
  id: string
  titulo: string
  vence: string
  estado: 'pendiente' | 'completada' | 'cancelada'
  oportunidad_id: string | null
  interaccion_id: string | null
  completada_en: string | null
  creado_en: string
}

export interface Plantilla {
  id: string
  nombre: string
  canal: Canal
  etapa: Etapa | null
  asunto: string | null
  cuerpo: string
  es_demo: boolean
}

export interface TareaHoy {
  tarea_id: string
  titulo: string
  vence: string
  vencida: boolean
  dias_atraso: number
  oportunidad_id: string | null
  etapa: Etapa | null
  empresa_nombre: string | null
  contacto_nombre: string | null
  contacto_whatsapp: string | null
  contacto_email: string | null
  servicio_nombre: string | null
  valor_anual: number
}

export interface FilaPipeline {
  etapa: Etapa
  cantidad: number
  total_setup: number
  total_mensual: number
  valor_anual: number
  valor_ponderado: number
}

export interface FilaConversion {
  orden: number
  etapa: Etapa
  alcanzaron: number
}

export interface Resumen {
  abiertas: number
  pipeline_valor: number
  ganadas: number
  perdidas: number
  ventas_setup: number
  recurrente_mensual: number
  clientes_activos: number
  tasa_cierre: number | null
}

export interface VentaMensual {
  mes: string
  cantidad: number
  total_setup: number
  total_mensual: number
}

export interface MotivoPerdida {
  motivo: string
  cantidad: number
  valor_anual: number
}

export interface ResultadoImportacion {
  empresas: number
  contactos: number
  oportunidades: number
  omitidas: number
}
