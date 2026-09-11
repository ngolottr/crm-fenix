import { useEffect, useState } from 'react'
import { AreaTexto, Boton, Campo, Entrada, MensajeError, Selector, Tarjeta } from '../../componentes/ui'
import { actualizarOportunidad, listarServicios, mensajeDe } from '../../lib/datos'
import { clp } from '../../lib/formato'
import type { OportunidadVista, Servicio } from '../../tipos/db'
import type { Origen } from '../../tipos/dominio'
import { ORIGENES } from '../../tipos/dominio'

const desde = (op: OportunidadVista) => ({
  servicioId: op.servicio_id ?? '',
  dolor: op.dolor_detectado ?? '',
  setup: String(op.monto_setup),
  mensual: String(op.monto_mensual),
  probabilidad: String(op.probabilidad),
  cierre: op.fecha_cierre_estimada ?? '',
  origen: (op.origen ?? '') as Origen | '',
})

type Formulario = ReturnType<typeof desde>

export default function DatosOportunidad({ op, onGuardado }: { op: OportunidadVista; onGuardado: () => void }) {
  const [f, setF] = useState<Formulario>(() => desde(op))
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setF(desde(op)), [op])
  useEffect(() => {
    listarServicios()
      .then(setServicios)
      .catch(() => setServicios([]))
  }, [])

  const cambiar = <K extends keyof Formulario>(clave: K, valor: Formulario[K]) =>
    setF((previo) => ({ ...previo, [clave]: valor }))

  const hayCambios = JSON.stringify(f) !== JSON.stringify(desde(op))

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await actualizarOportunidad(op.id, {
        servicio_id: f.servicioId || null,
        dolor_detectado: f.dolor.trim() || null,
        monto_setup: Number(f.setup) || 0,
        monto_mensual: Number(f.mensual) || 0,
        probabilidad: Math.min(100, Math.max(0, Number(f.probabilidad) || 0)),
        fecha_cierre_estimada: f.cierre || null,
        origen: f.origen || null,
      })
      onGuardado()
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Tarjeta className="space-y-3">
      <h2 className="text-sm font-semibold">Oportunidad</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Servicio">
          <Selector value={f.servicioId} onChange={(e) => cambiar('servicioId', e.target.value)}>
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
            <AreaTexto rows={3} value={f.dolor} onChange={(e) => cambiar('dolor', e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Setup (único)" ayuda={clp(Number(f.setup))}>
          <Entrada type="number" min={0} step={1000} value={f.setup} onChange={(e) => cambiar('setup', e.target.value)} />
        </Campo>
        <Campo etiqueta="Mensual" ayuda={clp(Number(f.mensual))}>
          <Entrada type="number" min={0} step={1000} value={f.mensual} onChange={(e) => cambiar('mensual', e.target.value)} />
        </Campo>
        <Campo etiqueta="Probabilidad (%)">
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
      </div>
      {op.etapa === 'perdido' && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Motivo de pérdida: {op.motivo_perdida}</p>
      )}
      <MensajeError mensaje={error} />
      {hayCambios && (
        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={() => setF(desde(op))}>
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
