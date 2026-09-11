export type Etapa =
  | 'nuevo_prospecto'
  | 'contactado'
  | 'reunion_diagnostico'
  | 'calificado'
  | 'propuesta_enviada'
  | 'negociacion'
  | 'ganado'
  | 'implementacion'
  | 'postventa'
  | 'perdido'

export type TipoInteraccion = 'llamada' | 'reunion' | 'whatsapp' | 'email' | 'linkedin'
export type TipoCobro = 'unico' | 'mensual' | 'unico_mas_mensual'
export type Canal = 'whatsapp' | 'email' | 'linkedin'
export type Tamano = 'micro' | 'pequena' | 'mediana' | 'grande'
export type Origen =
  | 'referido'
  | 'linkedin'
  | 'whatsapp'
  | 'web'
  | 'formulario'
  | 'evento'
  | 'prospeccion_fria'
  | 'contenido'
  | 'importacion_csv'
  | 'otro'

export interface Opcion<T extends string> {
  id: T
  nombre: string
}

export interface InfoEtapa extends Opcion<Etapa> {
  punto: string
}

export const ETAPAS: InfoEtapa[] = [
  { id: 'nuevo_prospecto', nombre: 'Nuevo prospecto', punto: 'bg-zinc-400' },
  { id: 'contactado', nombre: 'Contactado', punto: 'bg-sky-400' },
  { id: 'reunion_diagnostico', nombre: 'Reunión de diagnóstico', punto: 'bg-blue-500' },
  { id: 'calificado', nombre: 'Calificado', punto: 'bg-indigo-500' },
  { id: 'propuesta_enviada', nombre: 'Propuesta enviada', punto: 'bg-violet-500' },
  { id: 'negociacion', nombre: 'Negociación', punto: 'bg-fuchsia-500' },
  { id: 'ganado', nombre: 'Ganado', punto: 'bg-emerald-500' },
  { id: 'implementacion', nombre: 'Implementación', punto: 'bg-teal-500' },
  { id: 'postventa', nombre: 'Postventa y fidelización', punto: 'bg-green-600' },
  { id: 'perdido', nombre: 'Perdido', punto: 'bg-red-500' },
]

export const ETAPAS_TABLERO = ETAPAS.filter((e) => e.id !== 'perdido')

export const TIPOS_INTERACCION: Opcion<TipoInteraccion>[] = [
  { id: 'llamada', nombre: 'Llamada' },
  { id: 'reunion', nombre: 'Reunión' },
  { id: 'whatsapp', nombre: 'WhatsApp' },
  { id: 'email', nombre: 'Email' },
  { id: 'linkedin', nombre: 'LinkedIn' },
]

export const ORIGENES: Opcion<Origen>[] = [
  { id: 'referido', nombre: 'Referido' },
  { id: 'linkedin', nombre: 'LinkedIn' },
  { id: 'whatsapp', nombre: 'WhatsApp' },
  { id: 'web', nombre: 'Sitio web' },
  { id: 'formulario', nombre: 'Formulario web' },
  { id: 'evento', nombre: 'Evento' },
  { id: 'prospeccion_fria', nombre: 'Prospección en frío' },
  { id: 'contenido', nombre: 'Contenido en redes' },
  { id: 'importacion_csv', nombre: 'Importación CSV' },
  { id: 'otro', nombre: 'Otro' },
]

export const TAMANOS: Opcion<Tamano>[] = [
  { id: 'micro', nombre: 'Micro (1-9)' },
  { id: 'pequena', nombre: 'Pequeña (10-49)' },
  { id: 'mediana', nombre: 'Mediana (50-199)' },
  { id: 'grande', nombre: 'Grande (200+)' },
]

export const TIPOS_COBRO: Opcion<TipoCobro>[] = [
  { id: 'unico', nombre: 'Cobro único' },
  { id: 'mensual', nombre: 'Mensual' },
  { id: 'unico_mas_mensual', nombre: 'Setup + mensual' },
]

export const CANALES: Opcion<Canal>[] = [
  { id: 'whatsapp', nombre: 'WhatsApp' },
  { id: 'email', nombre: 'Email' },
  { id: 'linkedin', nombre: 'LinkedIn' },
]

export const HERRAMIENTAS = ['ERP', 'CRM', 'Planillas', 'WhatsApp', 'Email', 'Sistema propio']

// Motivos fijos para que el dashboard pueda agruparlos. "Otro" pide detalle.
export const MOTIVOS_PERDIDA = [
  'Sin presupuesto',
  'Eligió otra solución',
  'No es prioridad ahora',
  'Dejó de responder',
  'No era cliente ideal',
  'Lo resolvió internamente',
  'Otro',
]

// Días sin interacción desde los que una oportunidad se considera abandonada.
export const DIAS_ALERTA = 7

export const ETAPAS_GANADAS: Etapa[] = ['ganado', 'implementacion', 'postventa']

export function nombreDe<T extends string>(lista: Opcion<T>[], id: T | null | undefined): string {
  return lista.find((o) => o.id === id)?.nombre ?? ''
}
