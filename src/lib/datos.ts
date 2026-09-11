// Todo el acceso a Supabase pasa por acá.
import type {
  CambioEtapa,
  Contacto,
  Empresa,
  FilaConversion,
  FilaPipeline,
  Interaccion,
  MotivoPerdida,
  Oportunidad,
  OportunidadVista,
  Plantilla,
  Resumen,
  ResultadoImportacion,
  Servicio,
  Tarea,
  TareaHoy,
  VentaMensual,
} from '../tipos/db'
import type { Etapa, Origen, TipoInteraccion } from '../tipos/dominio'
import { DIAS_ALERTA } from '../tipos/dominio'
import type { FilaImportacion } from './csv'
import { supabase } from './supabase'

interface Respuesta<T> {
  data: T | null
  error: { message: string } | null
}

async function exigir<T>(consulta: PromiseLike<Respuesta<T>>): Promise<T> {
  const { data, error } = await consulta
  if (error) throw new Error(traducirError(error.message))
  return data as T
}

export function traducirError(mensaje: string): string {
  if (mensaje.includes('perdida_exige_motivo')) return 'Para marcar como perdida hay que indicar el motivo.'
  if (mensaje.includes('contactos_email_unico')) return 'Ya existe un contacto con ese email.'
  if (mensaje.includes('contactos_whatsapp_check')) return 'El WhatsApp debe tener formato +569XXXXXXXX.'
  if (mensaje.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (mensaje.includes('row-level security')) return 'Tu usuario no tiene permiso para hacer esto.'
  if (mensaje.includes('Failed to fetch')) return 'No hay conexión con Supabase. Revisa tu internet o las variables de entorno.'
  return mensaje
}

export const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error inesperado')

// ---------------------------------------------------------------- oportunidades

export const listarOportunidades = () =>
  exigir<OportunidadVista[]>(supabase.from('v_oportunidades').select('*').order('orden'))

export const obtenerOportunidad = (id: string) =>
  exigir<OportunidadVista>(supabase.from('v_oportunidades').select('*').eq('id', id).single())

export const moverOportunidad = (id: string, etapa: Etapa, orden: number) =>
  exigir(supabase.from('oportunidades').update({ etapa, orden }).eq('id', id))

export const marcarPerdida = (id: string, motivo: string) =>
  exigir(supabase.from('oportunidades').update({ etapa: 'perdido', motivo_perdida: motivo }).eq('id', id))

export type CambiosOportunidad = Partial<
  Pick<
    Oportunidad,
    | 'etapa'
    | 'servicio_id'
    | 'contacto_id'
    | 'dolor_detectado'
    | 'monto_setup'
    | 'monto_mensual'
    | 'probabilidad'
    | 'fecha_cierre_estimada'
    | 'origen'
  >
>

export const actualizarOportunidad = (id: string, cambios: CambiosOportunidad) =>
  exigir(supabase.from('oportunidades').update(cambios).eq('id', id))

export interface DatosNuevaOportunidad {
  empresaId: string
  contactoId: string | null
  servicioId: string | null
  dolor: string
  montoSetup: number
  montoMensual: number
  probabilidad: number
  fechaCierre: string | null
  origen: Origen | null
  proximaAccion: string
  fechaProxima: string
}

export const crearOportunidad = (d: DatosNuevaOportunidad) =>
  exigir<string>(
    supabase.rpc('crear_oportunidad', {
      p_empresa_id: d.empresaId,
      p_contacto_id: d.contactoId,
      p_servicio_id: d.servicioId,
      p_dolor_detectado: d.dolor,
      p_monto_setup: d.montoSetup,
      p_monto_mensual: d.montoMensual,
      p_probabilidad: d.probabilidad,
      p_fecha_cierre_estimada: d.fechaCierre,
      p_origen: d.origen,
      p_proxima_accion: d.proximaAccion,
      p_fecha_proxima_accion: d.fechaProxima,
    }),
  )

export const oportunidadesAbandonadas = () =>
  exigir<OportunidadVista[]>(
    supabase
      .from('v_oportunidades')
      .select('*')
      .neq('etapa', 'perdido')
      .gt('dias_sin_interaccion', DIAS_ALERTA)
      .order('valor_anual', { ascending: false }),
  )

export const oportunidadesSinSeguimiento = () =>
  exigir<OportunidadVista[]>(
    supabase
      .from('v_oportunidades')
      .select('*')
      .neq('etapa', 'perdido')
      .is('proxima_accion', null)
      .order('valor_anual', { ascending: false }),
  )

// ---------------------------------------------------------------- interacciones y tareas

export const listarInteracciones = (oportunidadId: string) =>
  exigir<Interaccion[]>(
    supabase.from('interacciones').select('*').eq('oportunidad_id', oportunidadId).order('fecha', { ascending: false }),
  )

export const listarHistorial = (oportunidadId: string) =>
  exigir<CambioEtapa[]>(
    supabase.from('historial_etapas').select('*').eq('oportunidad_id', oportunidadId).order('cambiado_en', { ascending: false }),
  )

export interface NuevaInteraccion {
  oportunidadId: string
  tipo: TipoInteraccion
  resumen: string
  proximaAccion: string | null
  fechaProxima: string | null
  fecha: string
}

export const registrarInteraccion = (n: NuevaInteraccion) =>
  exigir<string>(
    supabase.rpc('registrar_interaccion', {
      p_oportunidad: n.oportunidadId,
      p_tipo: n.tipo,
      p_resumen: n.resumen,
      p_proxima_accion: n.proximaAccion,
      p_fecha_proxima: n.fechaProxima,
      p_fecha: n.fecha,
    }),
  )

export const listarTareas = (oportunidadId: string) =>
  exigir<Tarea[]>(supabase.from('tareas').select('*').eq('oportunidad_id', oportunidadId).order('vence'))

export const tareasDeHoy = () =>
  exigir<TareaHoy[]>(supabase.from('v_hoy').select('*').order('valor_anual', { ascending: false }))

export const crearTarea = (t: { titulo: string; vence: string; oportunidad_id: string | null }) =>
  exigir(supabase.from('tareas').insert(t))

export const completarTarea = (id: string) =>
  exigir(
    supabase.from('tareas').update({ estado: 'completada', completada_en: new Date().toISOString() }).eq('id', id),
  )

// ---------------------------------------------------------------- empresas y contactos

export const listarEmpresas = () => exigir<Empresa[]>(supabase.from('empresas').select('*').order('nombre'))

export const obtenerEmpresa = (id: string) =>
  exigir<Empresa>(supabase.from('empresas').select('*').eq('id', id).single())

export type DatosEmpresa = Partial<Omit<Empresa, 'id' | 'es_demo'>>

export const crearEmpresa = (e: DatosEmpresa & { nombre: string }) =>
  exigir<Empresa>(supabase.from('empresas').insert(e).select().single())

export const actualizarEmpresa = (id: string, cambios: DatosEmpresa) =>
  exigir(supabase.from('empresas').update(cambios).eq('id', id))

export const listarContactos = (empresaId: string) =>
  exigir<Contacto[]>(supabase.from('contactos').select('*').eq('empresa_id', empresaId).order('nombre'))

export const obtenerContacto = (id: string) =>
  exigir<Contacto | null>(supabase.from('contactos').select('*').eq('id', id).maybeSingle())

export type DatosContacto = Partial<Omit<Contacto, 'id' | 'es_demo'>>

export const crearContacto = (c: DatosContacto & { nombre: string }) =>
  exigir<Contacto>(supabase.from('contactos').insert(c).select().single())

export const actualizarContacto = (id: string, cambios: DatosContacto) =>
  exigir(supabase.from('contactos').update(cambios).eq('id', id))

// ---------------------------------------------------------------- servicios y plantillas

export const listarServicios = (soloActivos = false) => {
  const consulta = supabase.from('servicios').select('*').order('nombre')
  return exigir<Servicio[]>(soloActivos ? consulta.eq('activo', true) : consulta)
}

export type DatosServicio = Omit<Servicio, 'id' | 'es_demo'>

export const guardarServicio = (id: string | null, s: DatosServicio) =>
  id
    ? exigir(supabase.from('servicios').update(s).eq('id', id))
    : exigir(supabase.from('servicios').insert(s))

let plantillasEnCache: Promise<Plantilla[]> | null = null

export const listarPlantillas = () =>
  exigir<Plantilla[]>(supabase.from('plantillas').select('*').order('nombre'))

// Los botones de contacto aparecen muchas veces en pantalla: comparten una sola carga.
export function plantillasCompartidas(): Promise<Plantilla[]> {
  plantillasEnCache ??= listarPlantillas().catch((e: unknown) => {
    plantillasEnCache = null
    throw e
  })
  return plantillasEnCache
}

export type DatosPlantilla = Omit<Plantilla, 'id' | 'es_demo'>

export async function guardarPlantilla(id: string | null, p: DatosPlantilla) {
  plantillasEnCache = null
  return id
    ? exigir(supabase.from('plantillas').update(p).eq('id', id))
    : exigir(supabase.from('plantillas').insert(p))
}

export async function borrarPlantilla(id: string) {
  plantillasEnCache = null
  return exigir(supabase.from('plantillas').delete().eq('id', id))
}

// ---------------------------------------------------------------- importación

export const importarProspectos = (filas: FilaImportacion[], proximaAccion: string, fechaProxima: string) =>
  exigir<ResultadoImportacion>(
    supabase.rpc('importar_prospectos', {
      p_filas: filas,
      p_proxima_accion: proximaAccion,
      p_fecha_proxima: fechaProxima,
    }),
  )

// ---------------------------------------------------------------- dashboard

export const obtenerResumen = () => exigir<Resumen>(supabase.from('v_resumen').select('*').single())
export const obtenerPipeline = () => exigir<FilaPipeline[]>(supabase.from('v_pipeline').select('*'))
export const obtenerConversion = () =>
  exigir<FilaConversion[]>(supabase.from('v_conversion').select('*').order('orden'))
export const obtenerVentasMensuales = () =>
  exigir<VentaMensual[]>(supabase.from('v_ventas_mensuales').select('*').order('mes'))
export const obtenerMotivosPerdida = () =>
  exigir<MotivoPerdida[]>(supabase.from('v_motivos_perdida').select('*').order('cantidad', { ascending: false }))
