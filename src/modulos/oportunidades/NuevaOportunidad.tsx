import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { AreaTexto, Boton, Campo, Entrada, MensajeError, Modal, Selector } from '../../componentes/ui'
import { emailValido, normalizarWhatsapp } from '../../lib/contacto'
import {
  crearContacto,
  crearEmpresa,
  crearOportunidad,
  listarContactos,
  listarEmpresas,
  listarServicios,
  mensajeDe,
} from '../../lib/datos'
import { clp, hoyChile } from '../../lib/formato'
import type { Contacto, Empresa, Servicio } from '../../tipos/db'
import type { Origen } from '../../tipos/dominio'
import { ORIGENES } from '../../tipos/dominio'

interface Formulario {
  empresa: string
  rubro: string
  contactoId: string
  contactoNombre: string
  cargo: string
  whatsapp: string
  email: string
  esDecisor: boolean
  servicioId: string
  dolor: string
  setup: string
  mensual: string
  probabilidad: string
  cierre: string
  origen: Origen | ''
  accion: string
  fechaAccion: string
}

const vacio = (): Formulario => ({
  empresa: '',
  rubro: '',
  contactoId: '',
  contactoNombre: '',
  cargo: '',
  whatsapp: '',
  email: '',
  esDecisor: false,
  servicioId: '',
  dolor: '',
  setup: '',
  mensual: '',
  probabilidad: '10',
  cierre: '',
  origen: '',
  accion: 'Primer contacto',
  fechaAccion: hoyChile(),
})

interface Props {
  abierto: boolean
  onCerrar: () => void
  onCreada: (id: string) => void
}

export default function NuevaOportunidad({ abierto, onCerrar, onCreada }: Props) {
  const [f, setF] = useState<Formulario>(vacio)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cambiar = <K extends keyof Formulario>(clave: K, valor: Formulario[K]) =>
    setF((previo) => ({ ...previo, [clave]: valor }))

  useEffect(() => {
    if (!abierto) return
    setF(vacio())
    setError(null)
    Promise.all([listarEmpresas(), listarServicios(true)])
      .then(([e, s]) => {
        setEmpresas(e)
        setServicios(s)
      })
      .catch((err: unknown) => setError(mensajeDe(err)))
  }, [abierto])

  const existente = empresas.find((e) => e.nombre.trim().toLowerCase() === f.empresa.trim().toLowerCase())
  const existenteId = existente?.id

  useEffect(() => {
    if (!existenteId) {
      setContactos([])
      return
    }
    listarContactos(existenteId)
      .then(setContactos)
      .catch(() => setContactos([]))
  }, [existenteId])

  function elegirServicio(id: string) {
    const s = servicios.find((x) => x.id === id)
    setF((p) => ({
      ...p,
      servicioId: id,
      setup: s && s.tipo_cobro !== 'mensual' ? String(s.precio_base) : p.setup,
      mensual: s && s.tipo_cobro === 'mensual' ? String(s.precio_base) : p.mensual,
    }))
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!f.empresa.trim()) return setError('Indica la empresa.')
    if (!f.accion.trim() || !f.fechaAccion) return setError('Toda oportunidad nace con una próxima acción y su fecha.')

    const contactoNuevo = !f.contactoId && f.contactoNombre.trim()
    let whatsapp: string | null = null
    if (contactoNuevo && f.whatsapp.trim()) {
      whatsapp = normalizarWhatsapp(f.whatsapp)
      if (!whatsapp) return setError('El WhatsApp no es válido. Escríbelo como +56 9 1234 5678.')
    }
    if (contactoNuevo && f.email.trim() && !emailValido(f.email.trim())) return setError('El email no es válido.')

    setGuardando(true)
    setError(null)
    try {
      const empresaId =
        existente?.id ?? (await crearEmpresa({ nombre: f.empresa.trim(), rubro: f.rubro.trim() || null })).id

      let contactoId: string | null = f.contactoId || null
      if (contactoNuevo) {
        const c = await crearContacto({
          nombre: f.contactoNombre.trim(),
          cargo: f.cargo.trim() || null,
          email: f.email.trim().toLowerCase() || null,
          whatsapp,
          empresa_id: empresaId,
          origen: f.origen || null,
          es_decisor: f.esDecisor,
        })
        contactoId = c.id
      }

      const id = await crearOportunidad({
        empresaId,
        contactoId,
        servicioId: f.servicioId || null,
        dolor: f.dolor,
        montoSetup: Number(f.setup) || 0,
        montoMensual: Number(f.mensual) || 0,
        probabilidad: Math.min(100, Math.max(0, Number(f.probabilidad) || 0)),
        fechaCierre: f.cierre || null,
        origen: f.origen || null,
        proximaAccion: f.accion.trim(),
        fechaProxima: f.fechaAccion,
      })
      onCreada(id)
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal abierto={abierto} titulo="Nueva oportunidad" onCerrar={onCerrar} ancho="sm:max-w-2xl">
      <form onSubmit={guardar} className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Empresa"
            ayuda={f.empresa.trim() ? (existente ? 'Empresa ya registrada' : 'Se creará una empresa nueva') : undefined}
          >
            <Entrada
              list="empresas-registradas"
              value={f.empresa}
              onChange={(e) => cambiar('empresa', e.target.value)}
              placeholder="Nombre de la empresa"
              autoFocus
            />
            <datalist id="empresas-registradas">
              {empresas.map((e) => (
                <option key={e.id} value={e.nombre} />
              ))}
            </datalist>
          </Campo>
          {!existente && (
            <Campo etiqueta="Rubro">
              <Entrada value={f.rubro} onChange={(e) => cambiar('rubro', e.target.value)} placeholder="Ej: Logística" />
            </Campo>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-sm font-semibold">Contacto</p>
          {contactos.length > 0 && (
            <Selector value={f.contactoId} onChange={(e) => cambiar('contactoId', e.target.value)}>
              <option value="">Nuevo contacto</option>
              {contactos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.cargo ? ` · ${c.cargo}` : ''}
                </option>
              ))}
            </Selector>
          )}
          {!f.contactoId && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Nombre">
                <Entrada value={f.contactoNombre} onChange={(e) => cambiar('contactoNombre', e.target.value)} />
              </Campo>
              <Campo etiqueta="Cargo">
                <Entrada value={f.cargo} onChange={(e) => cambiar('cargo', e.target.value)} />
              </Campo>
              <Campo etiqueta="WhatsApp">
                <Entrada
                  type="tel"
                  value={f.whatsapp}
                  onChange={(e) => cambiar('whatsapp', e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </Campo>
              <Campo etiqueta="Email">
                <Entrada type="email" value={f.email} onChange={(e) => cambiar('email', e.target.value)} />
              </Campo>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={f.esDecisor}
                  onChange={(e) => cambiar('esDecisor', e.target.checked)}
                  className="h-4 w-4 rounded accent-zinc-900"
                />
                Es quien decide la compra
              </label>
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Servicio">
            <Selector value={f.servicioId} onChange={(e) => elegirServicio(e.target.value)}>
              <option value="">Sin definir</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Origen">
            <Selector value={f.origen} onChange={(e) => cambiar('origen', e.target.value as Origen | '')}>
              <option value="">Sin definir</option>
              {ORIGENES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Dolor detectado">
              <AreaTexto
                rows={2}
                value={f.dolor}
                onChange={(e) => cambiar('dolor', e.target.value)}
                placeholder="¿Qué problema concreto tiene hoy?"
              />
            </Campo>
          </div>
          <Campo etiqueta="Monto setup (único)" ayuda={f.setup ? clp(Number(f.setup)) : undefined}>
            <Entrada type="number" min={0} step={1000} value={f.setup} onChange={(e) => cambiar('setup', e.target.value)} />
          </Campo>
          <Campo etiqueta="Monto mensual" ayuda={f.mensual ? clp(Number(f.mensual)) : undefined}>
            <Entrada
              type="number"
              min={0}
              step={1000}
              value={f.mensual}
              onChange={(e) => cambiar('mensual', e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Probabilidad de cierre (%)">
            <Entrada
              type="number"
              min={0}
              max={100}
              value={f.probabilidad}
              onChange={(e) => cambiar('probabilidad', e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Cierre estimado">
            <Entrada type="date" value={f.cierre} onChange={(e) => cambiar('cierre', e.target.value)} />
          </Campo>
        </section>

        <section className="space-y-3 rounded-2xl bg-zinc-50 p-3.5 ring-1 ring-zinc-200/70">
          <p className="text-sm font-semibold">Primera próxima acción</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Entrada value={f.accion} onChange={(e) => cambiar('accion', e.target.value)} />
            <Entrada
              type="date"
              value={f.fechaAccion}
              onChange={(e) => cambiar('fechaAccion', e.target.value)}
              aria-label="Fecha de la próxima acción"
            />
          </div>
        </section>

        <MensajeError mensaje={error} />

        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear oportunidad'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
