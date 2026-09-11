import type { FormEvent } from 'react'
import { useState } from 'react'
import { Boton, Campo, Entrada, MensajeError, Modal } from '../../componentes/ui'
import { marcarPerdida, mensajeDe } from '../../lib/datos'
import { MOTIVOS_PERDIDA } from '../../tipos/dominio'

interface Props {
  abierto: boolean
  oportunidad: { id: string; empresa_nombre: string }
  onCerrar: () => void
  onGuardado: () => void
}

export default function MarcarPerdida({ abierto, oportunidad, onCerrar, onGuardado }: Props) {
  const [motivo, setMotivo] = useState('')
  const [otro, setOtro] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const final = motivo === 'Otro' ? otro.trim() : motivo
    if (!final) return setError(motivo === 'Otro' ? 'Escribe el motivo.' : 'Elige un motivo.')
    setGuardando(true)
    setError(null)
    try {
      await marcarPerdida(oportunidad.id, final)
      onGuardado()
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal abierto={abierto} titulo={`Marcar como perdida · ${oportunidad.empresa_nombre}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <p className="text-sm text-zinc-500">
          El motivo es obligatorio: es lo que después muestra el panel para saber dónde se caen las ventas. Las tareas
          pendientes de esta oportunidad se cancelan.
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {MOTIVOS_PERDIDA.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivo(m)}
              className={`rounded-xl px-3 py-2 text-left text-sm ring-1 transition ${
                motivo === m ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {motivo === 'Otro' && (
          <Campo etiqueta="¿Cuál fue el motivo?">
            <Entrada value={otro} onChange={(e) => setOtro(e.target.value)} autoFocus />
          </Campo>
        )}
        <MensajeError mensaje={error} />
        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="peligro" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Marcar perdida'}
          </Boton>
        </div>
      </form>
    </Modal>
  )
}
