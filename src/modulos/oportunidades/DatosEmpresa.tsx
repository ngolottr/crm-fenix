import { useEffect, useState } from 'react'
import { AreaTexto, Boton, Cargando, Campo, Entrada, MensajeError, Selector, Tarjeta } from '../../componentes/ui'
import { emailValido, normalizarWhatsapp } from '../../lib/contacto'
import {
  actualizarContacto,
  actualizarEmpresa,
  actualizarOportunidad,
  crearContacto,
  mensajeDe,
  obtenerContacto,
  obtenerEmpresa,
} from '../../lib/datos'
import { useConsulta } from '../../lib/useConsulta'
import type { Contacto, Empresa } from '../../tipos/db'
import type { Tamano } from '../../tipos/dominio'
import { HERRAMIENTAS, TAMANOS } from '../../tipos/dominio'

const formEmpresa = (e: Empresa | null) => ({
  nombre: e?.nombre ?? '',
  rubro: e?.rubro ?? '',
  tamano: (e?.tamano ?? '') as Tamano | '',
  web: e?.web ?? '',
  herramientas: e?.herramientas ?? [],
  notas: e?.notas ?? '',
})

const formContacto = (c: Contacto | null) => ({
  nombre: c?.nombre ?? '',
  cargo: c?.cargo ?? '',
  email: c?.email ?? '',
  whatsapp: c?.whatsapp ?? '',
  esDecisor: c?.es_decisor ?? false,
})

interface Props {
  oportunidadId: string
  empresaId: string
  contactoId: string | null
  onGuardado: () => void
}

export default function DatosEmpresa({ oportunidadId, empresaId, contactoId, onGuardado }: Props) {
  const empresa = useConsulta(() => obtenerEmpresa(empresaId), [empresaId])
  const contacto = useConsulta(() => (contactoId ? obtenerContacto(contactoId) : Promise.resolve(null)), [contactoId])
  const [e, setE] = useState(() => formEmpresa(null))
  const [c, setC] = useState(() => formContacto(null))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setE(formEmpresa(empresa.datos)), [empresa.datos])
  useEffect(() => setC(formContacto(contacto.datos)), [contacto.datos])

  const hayCambios =
    JSON.stringify(e) !== JSON.stringify(formEmpresa(empresa.datos)) ||
    JSON.stringify(c) !== JSON.stringify(formContacto(contacto.datos))

  function alternarHerramienta(h: string) {
    setE((p) => ({
      ...p,
      herramientas: p.herramientas.includes(h) ? p.herramientas.filter((x) => x !== h) : [...p.herramientas, h],
    }))
  }

  async function guardar() {
    if (!e.nombre.trim()) return setError('La empresa necesita un nombre.')
    const whatsapp = c.whatsapp.trim() ? normalizarWhatsapp(c.whatsapp) : null
    if (c.whatsapp.trim() && !whatsapp) return setError('El WhatsApp no es válido. Escríbelo como +56 9 1234 5678.')
    if (c.email.trim() && !emailValido(c.email.trim())) return setError('El email no es válido.')

    setGuardando(true)
    setError(null)
    try {
      await actualizarEmpresa(empresaId, {
        nombre: e.nombre.trim(),
        rubro: e.rubro.trim() || null,
        tamano: e.tamano || null,
        web: e.web.trim() || null,
        herramientas: e.herramientas,
        notas: e.notas.trim() || null,
      })
      const datosContacto = {
        nombre: c.nombre.trim(),
        cargo: c.cargo.trim() || null,
        email: c.email.trim().toLowerCase() || null,
        whatsapp,
        es_decisor: c.esDecisor,
      }
      if (contacto.datos) {
        await actualizarContacto(contacto.datos.id, datosContacto)
      } else if (datosContacto.nombre) {
        const nuevo = await crearContacto({ ...datosContacto, empresa_id: empresaId })
        await actualizarOportunidad(oportunidadId, { contacto_id: nuevo.id })
      }
      empresa.recargar()
      contacto.recargar()
      onGuardado()
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  if (empresa.cargando && !empresa.datos) return <Cargando />

  return (
    <Tarjeta className="space-y-4">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Empresa</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre">
            <Entrada value={e.nombre} onChange={(x) => setE({ ...e, nombre: x.target.value })} />
          </Campo>
          <Campo etiqueta="Rubro">
            <Entrada value={e.rubro} onChange={(x) => setE({ ...e, rubro: x.target.value })} />
          </Campo>
          <Campo etiqueta="Tamaño">
            <Selector value={e.tamano} onChange={(x) => setE({ ...e, tamano: x.target.value as Tamano | '' })}>
              <option value="">Sin definir</option>
              {TAMANOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Sitio web">
            <Entrada value={e.web} onChange={(x) => setE({ ...e, web: x.target.value })} placeholder="empresa.cl" />
          </Campo>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-500">Herramientas que usa hoy</p>
          <div className="flex flex-wrap gap-1.5">
            {HERRAMIENTAS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => alternarHerramienta(h)}
                className={`rounded-full px-2.5 py-1 text-xs ring-1 transition ${
                  e.herramientas.includes(h)
                    ? 'bg-zinc-900 text-white ring-zinc-900'
                    : 'bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-100'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        <Campo etiqueta="Notas">
          <AreaTexto rows={2} value={e.notas} onChange={(x) => setE({ ...e, notas: x.target.value })} />
        </Campo>
      </div>

      <div className="space-y-3 border-t border-zinc-100 pt-4">
        <h2 className="text-sm font-semibold">{contacto.datos ? 'Contacto' : 'Agregar contacto'}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre">
            <Entrada value={c.nombre} onChange={(x) => setC({ ...c, nombre: x.target.value })} />
          </Campo>
          <Campo etiqueta="Cargo">
            <Entrada value={c.cargo} onChange={(x) => setC({ ...c, cargo: x.target.value })} />
          </Campo>
          <Campo etiqueta="WhatsApp">
            <Entrada
              type="tel"
              value={c.whatsapp}
              onChange={(x) => setC({ ...c, whatsapp: x.target.value })}
              placeholder="+56 9 1234 5678"
            />
          </Campo>
          <Campo etiqueta="Email">
            <Entrada type="email" value={c.email} onChange={(x) => setC({ ...c, email: x.target.value })} />
          </Campo>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={c.esDecisor}
            onChange={(x) => setC({ ...c, esDecisor: x.target.checked })}
            className="h-4 w-4 rounded accent-zinc-900"
          />
          Es quien decide la compra
        </label>
      </div>

      <MensajeError mensaje={error ?? empresa.error ?? contacto.error} />
      {hayCambios && (
        <div className="flex justify-end gap-2">
          <Boton
            variante="fantasma"
            onClick={() => {
              setE(formEmpresa(empresa.datos))
              setC(formContacto(contacto.datos))
            }}
          >
            Descartar
          </Boton>
          <Boton onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Boton>
        </div>
      )}
    </Tarjeta>
  )
}
