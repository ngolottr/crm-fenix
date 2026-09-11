import type { FormEvent } from 'react'
import { useState } from 'react'
import { AreaTexto, Boton, Campo, Encabezado, Entrada, Insignia, MensajeError, Modal, Selector, Tarjeta, Vacio } from '../../componentes/ui'
import type { DatosPlantilla, DatosServicio } from '../../lib/datos'
import { borrarPlantilla, guardarPlantilla, guardarServicio, listarPlantillas, listarServicios, mensajeDe } from '../../lib/datos'
import { clp } from '../../lib/formato'
import { rellenar } from '../../lib/plantillas'
import { salir, useSesion } from '../../lib/sesion'
import { useConsulta } from '../../lib/useConsulta'
import type { Plantilla, Servicio } from '../../tipos/db'
import type { Canal, Etapa, TipoCobro } from '../../tipos/dominio'
import { CANALES, ETAPAS, TIPOS_COBRO, nombreDe } from '../../tipos/dominio'

export default function Ajustes() {
  const servicios = useConsulta(() => listarServicios(), [])
  const plantillas = useConsulta(listarPlantillas, [])
  const [servicio, setServicio] = useState<Servicio | 'nuevo' | null>(null)
  const [plantilla, setPlantilla] = useState<Plantilla | 'nueva' | null>(null)
  const { perfil, sesion } = useSesion()

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <Encabezado titulo="Ajustes" />
      <div className="space-y-6 px-4 md:px-8">
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Servicios</h2>
            <Boton variante="secundario" onClick={() => setServicio('nuevo')}>
              Agregar servicio
            </Boton>
          </div>
          <Tarjeta className="p-0">
            <MensajeError mensaje={servicios.error} />
            {servicios.datos?.length === 0 && <Vacio titulo="Todavía no hay servicios" />}
            <ul className="divide-y divide-zinc-100">
              {servicios.datos?.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setServicio(s)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.nombre}</p>
                      <p className="truncate text-xs text-zinc-500">{nombreDe(TIPOS_COBRO, s.tipo_cobro)}</p>
                    </div>
                    {!s.activo && <Insignia>Inactivo</Insignia>}
                    <span className="text-sm tabular-nums">
                      {clp(s.precio_base)}
                      {s.tipo_cobro === 'mensual' && '/mes'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Plantillas de mensajes</h2>
            <Boton variante="secundario" onClick={() => setPlantilla('nueva')}>
              Agregar plantilla
            </Boton>
          </div>
          <Tarjeta className="p-0">
            <MensajeError mensaje={plantillas.error} />
            {plantillas.datos?.length === 0 && <Vacio titulo="Todavía no hay plantillas" />}
            <ul className="divide-y divide-zinc-100">
              {plantillas.datos?.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setPlantilla(p)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.nombre}</p>
                      <p className="truncate text-xs text-zinc-500">{p.cuerpo}</p>
                    </div>
                    <Insignia>{nombreDe(CANALES, p.canal)}</Insignia>
                    {p.etapa && <Insignia tono="azul">{nombreDe(ETAPAS, p.etapa)}</Insignia>}
                  </button>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Cuenta</h2>
          <Tarjeta className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{perfil?.nombre}</p>
              <p className="text-xs text-zinc-500">{sesion?.user.email}</p>
            </div>
            <Boton variante="secundario" onClick={() => void salir()}>
              Salir
            </Boton>
          </Tarjeta>
          <p className="mt-3 px-1 text-xs text-zinc-400">
            Los datos marcados como DEMO se borran corriendo <code>supabase/borrar_demo.sql</code> en el SQL Editor de
            Supabase. No toca lo que hayas creado tú.
          </p>
        </section>
      </div>

      {servicio && (
        <FormServicio
          servicio={servicio === 'nuevo' ? null : servicio}
          onCerrar={() => setServicio(null)}
          onGuardado={() => {
            setServicio(null)
            servicios.recargar()
          }}
        />
      )}
      {plantilla && (
        <FormPlantilla
          plantilla={plantilla === 'nueva' ? null : plantilla}
          onCerrar={() => setPlantilla(null)}
          onGuardado={() => {
            setPlantilla(null)
            plantillas.recargar()
          }}
        />
      )}
    </div>
  )
}

function FormServicio({
  servicio,
  onCerrar,
  onGuardado,
}: {
  servicio: Servicio | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [f, setF] = useState<DatosServicio>({
    nombre: servicio?.nombre ?? '',
    descripcion: servicio?.descripcion ?? '',
    precio_base: servicio?.precio_base ?? 0,
    tipo_cobro: servicio?.tipo_cobro ?? 'unico',
    activo: servicio?.activo ?? true,
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!f.nombre.trim()) return setError('El servicio necesita un nombre.')
    setGuardando(true)
    try {
      await guardarServicio(servicio?.id ?? null, { ...f, nombre: f.nombre.trim(), descripcion: f.descripcion?.trim() || null })
      onGuardado()
    } catch (err) {
      setError(mensajeDe(err))
      setGuardando(false)
    }
  }

  return (
    <Modal abierto titulo={servicio ? 'Editar servicio' : 'Nuevo servicio'} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo etiqueta="Nombre">
          <Entrada value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus />
        </Campo>
        <Campo etiqueta="Descripción">
          <AreaTexto rows={2} value={f.descripcion ?? ''} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Tipo de cobro">
            <Selector value={f.tipo_cobro} onChange={(e) => setF({ ...f, tipo_cobro: e.target.value as TipoCobro })}>
              {TIPOS_COBRO.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo
            etiqueta={f.tipo_cobro === 'mensual' ? 'Precio mensual' : 'Precio base (setup)'}
            ayuda={clp(f.precio_base)}
          >
            <Entrada
              type="number"
              min={0}
              step={1000}
              value={f.precio_base}
              onChange={(e) => setF({ ...f, precio_base: Number(e.target.value) || 0 })}
            />
          </Campo>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={f.activo}
            onChange={(e) => setF({ ...f, activo: e.target.checked })}
            className="h-4 w-4 rounded accent-zinc-900"
          />
          Activo (aparece al crear oportunidades)
        </label>
        <MensajeError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={guardando}>
            Guardar
          </Boton>
        </div>
      </form>
    </Modal>
  )
}

function FormPlantilla({
  plantilla,
  onCerrar,
  onGuardado,
}: {
  plantilla: Plantilla | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [f, setF] = useState<DatosPlantilla>({
    nombre: plantilla?.nombre ?? '',
    canal: plantilla?.canal ?? 'whatsapp',
    etapa: plantilla?.etapa ?? null,
    asunto: plantilla?.asunto ?? '',
    cuerpo: plantilla?.cuerpo ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const ejemplo = { nombre: 'Carolina Muñoz', empresa: 'Ferretería Los Andes', servicio: 'Automatización de WhatsApp' }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!f.nombre.trim() || !f.cuerpo.trim()) return setError('La plantilla necesita nombre y mensaje.')
    setGuardando(true)
    try {
      await guardarPlantilla(plantilla?.id ?? null, {
        ...f,
        nombre: f.nombre.trim(),
        asunto: f.canal === 'email' ? f.asunto?.trim() || null : null,
      })
      onGuardado()
    } catch (err) {
      setError(mensajeDe(err))
      setGuardando(false)
    }
  }

  async function borrar() {
    if (!plantilla || !window.confirm(`¿Borrar la plantilla "${plantilla.nombre}"?`)) return
    try {
      await borrarPlantilla(plantilla.id)
      onGuardado()
    } catch (err) {
      setError(mensajeDe(err))
    }
  }

  return (
    <Modal abierto titulo={plantilla ? 'Editar plantilla' : 'Nueva plantilla'} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo etiqueta="Nombre">
          <Entrada value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} autoFocus />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Canal">
            <Selector value={f.canal} onChange={(e) => setF({ ...f, canal: e.target.value as Canal })}>
              {CANALES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Etapa" ayuda="Se ofrece primero en esa etapa.">
            <Selector
              value={f.etapa ?? ''}
              onChange={(e) => setF({ ...f, etapa: (e.target.value || null) as Etapa | null })}
            >
              <option value="">Cualquier etapa</option>
              {ETAPAS.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
        </div>
        {f.canal === 'email' && (
          <Campo etiqueta="Asunto">
            <Entrada value={f.asunto ?? ''} onChange={(e) => setF({ ...f, asunto: e.target.value })} />
          </Campo>
        )}
        <Campo etiqueta="Mensaje" ayuda="Variables disponibles: {nombre} {empresa} {servicio}">
          <AreaTexto rows={5} value={f.cuerpo} onChange={(e) => setF({ ...f, cuerpo: e.target.value })} />
        </Campo>
        {f.cuerpo && (
          <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
            <p className="mb-1 text-xs font-medium text-zinc-400">Así se ve</p>
            <p className="whitespace-pre-line">{rellenar(f.cuerpo, ejemplo)}</p>
          </div>
        )}
        <MensajeError mensaje={error} />
        <div className="flex items-center justify-between gap-2">
          {plantilla ? (
            <Boton variante="fantasma" className="text-red-600" onClick={() => void borrar()}>
              Borrar
            </Boton>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Boton variante="fantasma" onClick={onCerrar}>
              Cancelar
            </Boton>
            <Boton type="submit" disabled={guardando}>
              Guardar
            </Boton>
          </div>
        </div>
      </form>
    </Modal>
  )
}
