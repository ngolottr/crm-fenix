import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconoAtras } from '../../componentes/iconos'
import { ProximaAccion } from '../../componentes/ProximaAccion'
import { Boton, Cargando, Entrada, Insignia, MensajeError, Selector, Tarjeta, Vacio } from '../../componentes/ui'
import {
  actualizarOportunidad,
  crearTarea,
  listarHistorial,
  listarInteracciones,
  listarTareas,
  mensajeDe,
  obtenerOportunidad,
} from '../../lib/datos'
import { clp, fechaCorta, fechaHora, hoyChile } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import type { CambioEtapa, Interaccion } from '../../tipos/db'
import type { Etapa, TipoInteraccion } from '../../tipos/dominio'
import { DIAS_ALERTA, ETAPAS, TIPOS_INTERACCION, nombreDe } from '../../tipos/dominio'
import BotonesContacto from './BotonesContacto'
import DatosEmpresa from './DatosEmpresa'
import DatosOportunidad from './DatosOportunidad'
import MarcarPerdida from './MarcarPerdida'
import RegistrarInteraccion from './RegistrarInteraccion'

type Evento =
  | { clave: string; fecha: string; tipo: 'interaccion'; interaccion: Interaccion }
  | { clave: string; fecha: string; tipo: 'etapa'; cambio: CambioEtapa }

export default function Ficha() {
  const { id = '' } = useParams()
  const op = useConsulta(() => obtenerOportunidad(id), [id])
  const interacciones = useConsulta(() => listarInteracciones(id), [id])
  const historial = useConsulta(() => listarHistorial(id), [id])
  const tareas = useConsulta(() => listarTareas(id), [id])
  const [registro, setRegistro] = useState<{ tipo?: TipoInteraccion; resumen?: string } | null>(null)
  const [perdiendo, setPerdiendo] = useState(false)
  const [nuevaTarea, setNuevaTarea] = useState({ titulo: '', vence: '' })
  const [error, setError] = useState<string | null>(null)

  function recargarTodo() {
    op.recargar()
    interacciones.recargar()
    historial.recargar()
    tareas.recargar()
  }

  if (op.cargando && !op.datos) return <Cargando />
  if (!op.datos) {
    return (
      <div className="p-8">
        <MensajeError mensaje={op.error ?? 'No se encontró la oportunidad.'} />
      </div>
    )
  }

  const o = op.datos

  async function cambiarEtapa(etapa: Etapa) {
    if (etapa === 'perdido') return setPerdiendo(true)
    try {
      await actualizarOportunidad(o.id, { etapa })
      recargarTodo()
    } catch (err) {
      setError(mensajeDe(err))
    }
  }

  async function agregarTarea(e: FormEvent) {
    e.preventDefault()
    if (!nuevaTarea.titulo.trim() || !nuevaTarea.vence) return
    try {
      await crearTarea({ titulo: nuevaTarea.titulo.trim(), vence: nuevaTarea.vence, oportunidad_id: o.id })
      setNuevaTarea({ titulo: '', vence: '' })
      recargarTodo()
    } catch (err) {
      setError(mensajeDe(err))
    }
  }

  const eventos: Evento[] = [
    ...(interacciones.datos ?? []).map(
      (i): Evento => ({ clave: `i-${i.id}`, fecha: i.fecha, tipo: 'interaccion', interaccion: i }),
    ),
    ...(historial.datos ?? []).map((c): Evento => ({ clave: `c-${c.id}`, fecha: c.cambiado_en, tipo: 'etapa', cambio: c })),
  ].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))

  const pendientes = (tareas.datos ?? []).filter((t) => t.estado === 'pendiente')
  const cerradas = (tareas.datos ?? []).filter((t) => t.estado !== 'pendiente')

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 md:px-8 md:pt-6">
      <Link to="/tablero" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
        <IconoAtras width={16} height={16} /> Tablero
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{o.empresa_nombre}</h1>
            {o.es_demo && <Insignia tono="azul">DEMO</Insignia>}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {[o.contacto_nombre, o.contacto_cargo].filter(Boolean).join(' · ') || 'Sin contacto'}
            {' · '}
            <span className="font-medium text-zinc-700">
              {clp(o.monto_setup)}
              {o.monto_mensual > 0 && ` + ${clp(o.monto_mensual)}/mes`}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotonesContacto
            nombre={o.contacto_nombre}
            empresa={o.empresa_nombre}
            servicio={o.servicio_nombre}
            etapa={o.etapa}
            whatsapp={o.contacto_whatsapp}
            email={o.contacto_email}
            onContactado={(tipo) => setRegistro({ tipo })}
          />
          <Selector
            value={o.etapa}
            onChange={(e) => void cambiarEtapa(e.target.value as Etapa)}
            className="w-auto"
            aria-label="Etapa"
          >
            {ETAPAS.map((et) => (
              <option key={et.id} value={et.id}>
                {et.nombre}
              </option>
            ))}
          </Selector>
        </div>
      </header>

      {error && (
        <div className="mt-4">
          <MensajeError mensaje={error} />
        </div>
      )}

      {o.etapa !== 'perdido' && (
        <Tarjeta className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <ProximaAccion titulo={o.proxima_accion} fecha={o.fecha_proxima_accion} />
            {o.dias_sin_interaccion > DIAS_ALERTA && (
              <Insignia tono="ambar">{o.dias_sin_interaccion} días sin interacción</Insignia>
            )}
          </div>
          <Boton onClick={() => setRegistro({})}>Registrar interacción</Boton>
        </Tarjeta>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Tarjeta>
            <h2 className="mb-3 text-sm font-semibold">Tareas</h2>
            {pendientes.length === 0 && <p className="text-sm text-zinc-400">No hay tareas pendientes.</p>}
            <ul className="divide-y divide-zinc-100">
              {pendientes.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => setRegistro({ resumen: `${t.titulo}: ` })}
                    className="h-5 w-5 shrink-0 rounded-full ring-1 ring-zinc-300 transition hover:ring-2 hover:ring-zinc-900"
                    aria-label={`Marcar "${t.titulo}" como hecha`}
                    title="Hecha: registra la interacción"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{t.titulo}</span>
                  <Insignia tono={t.vence < hoyChile() ? 'rojo' : t.vence === hoyChile() ? 'ambar' : 'gris'}>
                    {t.vence === hoyChile() ? 'Hoy' : fechaCorta(t.vence)}
                  </Insignia>
                </li>
              ))}
              {cerradas.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2 text-zinc-400">
                  <span className="h-5 w-5 shrink-0 rounded-full bg-zinc-100" />
                  <span className="min-w-0 flex-1 truncate text-sm line-through">{t.titulo}</span>
                  <span className="text-xs">{t.estado === 'cancelada' ? 'Cancelada' : 'Hecha'}</span>
                </li>
              ))}
            </ul>
            {o.etapa !== 'perdido' && (
              <form onSubmit={agregarTarea} className="mt-3 flex flex-wrap gap-2">
                <Entrada
                  value={nuevaTarea.titulo}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                  placeholder="Otra tarea"
                  className="min-w-40 flex-1"
                />
                <Entrada
                  type="date"
                  value={nuevaTarea.vence}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, vence: e.target.value })}
                  className="w-auto"
                  aria-label="Vence"
                />
                <Boton type="submit" variante="secundario" disabled={!nuevaTarea.titulo.trim() || !nuevaTarea.vence}>
                  Agregar
                </Boton>
              </form>
            )}
          </Tarjeta>

          <Tarjeta>
            <h2 className="mb-3 text-sm font-semibold">Línea de tiempo</h2>
            {eventos.length === 0 ? (
              <Vacio titulo="Todavía no hay interacciones" detalle="Registra la primera cuando hables con el cliente." />
            ) : (
              <ol className="relative space-y-4 border-l border-zinc-200 pl-5">
                {eventos.map((ev) => (
                  <li key={ev.clave} className="relative">
                    <span
                      className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                        ev.tipo === 'etapa' ? 'bg-zinc-300' : 'bg-zinc-900'
                      }`}
                    />
                    {ev.tipo === 'etapa' ? (
                      <p className="text-xs text-zinc-500">
                        {ev.cambio.etapa_anterior ? 'Pasó a ' : 'Creada en '}
                        <span className="font-medium text-zinc-700">{nombreDe(ETAPAS, ev.cambio.etapa_nueva)}</span>
                        {' · '}
                        {fechaHora(ev.cambio.cambiado_en)}
                      </p>
                    ) : (
                      <div>
                        <p className="text-xs text-zinc-500">
                          <span className="font-medium text-zinc-700">
                            {nombreDe(TIPOS_INTERACCION, ev.interaccion.tipo)}
                          </span>
                          {' · '}
                          {fechaHora(ev.interaccion.fecha)}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm">{ev.interaccion.resumen}</p>
                        {ev.interaccion.proxima_accion && ev.interaccion.fecha_proxima_accion && (
                          <p className="mt-1 text-xs text-zinc-500">
                            Siguiente: {ev.interaccion.proxima_accion} · {fechaCorta(ev.interaccion.fecha_proxima_accion)}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Tarjeta>
        </div>

        <div className="space-y-5">
          <DatosOportunidad op={o} onGuardado={recargarTodo} />
          <DatosEmpresa
            oportunidadId={o.id}
            empresaId={o.empresa_id}
            contactoId={o.contacto_id}
            onGuardado={recargarTodo}
          />
        </div>
      </div>

      <RegistrarInteraccion
        abierto={registro !== null}
        oportunidad={o}
        inicial={registro ?? undefined}
        onCerrar={() => setRegistro(null)}
        onGuardado={() => {
          setRegistro(null)
          recargarTodo()
        }}
      />
      <MarcarPerdida
        abierto={perdiendo}
        oportunidad={o}
        onCerrar={() => setPerdiendo(false)}
        onGuardado={() => {
          setPerdiendo(false)
          recargarTodo()
        }}
      />
    </div>
  )
}
