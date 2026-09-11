import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { AreaTexto, Boton, Campo, Entrada, MensajeError, Modal, Selector } from '../../componentes/ui'
import { actualizarOportunidad, mensajeDe, registrarInteraccion } from '../../lib/datos'
import { ahoraLocal, hoyChile, sumarDias } from '../../lib/formato'
import type { Etapa, TipoInteraccion } from '../../tipos/dominio'
import { ETAPAS_TABLERO, TIPOS_INTERACCION } from '../../tipos/dominio'

interface Props {
  abierto: boolean
  oportunidad: { id: string; etapa: Etapa; empresa_nombre: string }
  inicial?: { tipo?: TipoInteraccion; resumen?: string }
  onCerrar: () => void
  onGuardado: () => void
}

const ATAJOS = [
  { nombre: 'Mañana', dias: 1 },
  { nombre: 'En 3 días', dias: 3 },
  { nombre: 'En 1 semana', dias: 7 },
  { nombre: 'En 2 semanas', dias: 14 },
]

// La pieza que sostiene el objetivo del CRM: no se puede guardar sin decir
// qué viene después y cuándo. La base de datos lo exige igual.
export default function RegistrarInteraccion({ abierto, oportunidad, inicial, onCerrar, onGuardado }: Props) {
  const [tipo, setTipo] = useState<TipoInteraccion>('llamada')
  const [fecha, setFecha] = useState(ahoraLocal)
  const [resumen, setResumen] = useState('')
  const [accion, setAccion] = useState('')
  const [fechaAccion, setFechaAccion] = useState('')
  const [etapa, setEtapa] = useState<Etapa>(oportunidad.etapa)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const perdida = oportunidad.etapa === 'perdido'

  useEffect(() => {
    if (!abierto) return
    setTipo(inicial?.tipo ?? 'llamada')
    setFecha(ahoraLocal())
    setResumen(inicial?.resumen ?? '')
    setAccion('')
    setFechaAccion('')
    setEtapa(oportunidad.etapa)
    setError(null)
  }, [abierto, inicial?.tipo, inicial?.resumen, oportunidad.etapa])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!resumen.trim()) return setError('Escribe qué pasó en esta interacción.')
    if (!perdida && (!accion.trim() || !fechaAccion)) {
      return setError('Define la próxima acción y su fecha: ninguna oportunidad queda sin seguimiento.')
    }
    setGuardando(true)
    setError(null)
    try {
      await registrarInteraccion({
        oportunidadId: oportunidad.id,
        tipo,
        resumen: resumen.trim(),
        proximaAccion: accion.trim() || null,
        fechaProxima: fechaAccion || null,
        fecha: new Date(fecha).toISOString(),
      })
      if (etapa !== oportunidad.etapa) await actualizarOportunidad(oportunidad.id, { etapa })
      onGuardado()
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal abierto={abierto} titulo={`Registrar interacción · ${oportunidad.empresa_nombre}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_INTERACCION.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTipo(t.id)}
              className={`rounded-full px-3 py-1.5 text-sm ring-1 transition ${
                tipo === t.id ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-100'
              }`}
            >
              {t.nombre}
            </button>
          ))}
        </div>

        <Campo etiqueta="Cuándo">
          <Entrada type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </Campo>

        <Campo etiqueta="Qué pasó">
          <AreaTexto
            rows={4}
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            placeholder="¿Qué se conversó? ¿Qué dijo el cliente? ¿A qué se comprometieron?"
            autoFocus
          />
        </Campo>

        {!perdida && (
          <div className="space-y-3 rounded-2xl bg-zinc-50 p-3.5 ring-1 ring-zinc-200/70">
            <p className="text-sm font-semibold">Próxima acción</p>
            <Entrada
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              placeholder="Ej: Enviar propuesta, llamar para confirmar reunión"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Entrada
                type="date"
                value={fechaAccion}
                min={hoyChile()}
                onChange={(e) => setFechaAccion(e.target.value)}
                className="w-auto"
                aria-label="Fecha de la próxima acción"
              />
              {ATAJOS.map((a) => (
                <button
                  key={a.dias}
                  type="button"
                  onClick={() => setFechaAccion(sumarDias(hoyChile(), a.dias))}
                  className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"
                >
                  {a.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {!perdida && (
          <Campo etiqueta="Etapa" ayuda="Cámbiala si esta interacción hizo avanzar la oportunidad.">
            <Selector value={etapa} onChange={(e) => setEtapa(e.target.value as Etapa)}>
              {ETAPAS_TABLERO.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
        )}

        <MensajeError mensaje={error} />

        <div className="flex justify-end gap-2 pt-1">
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
