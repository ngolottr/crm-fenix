import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton, Campo, Encabezado, Entrada, Insignia, MensajeError, Selector, Tarjeta } from '../../componentes/ui'
import type { Mapeo } from '../../lib/csv'
import { CAMPOS, leerCsv, mapeoAutomatico, plantillaCsv, revisarFilas } from '../../lib/csv'
import { importarProspectos, mensajeDe } from '../../lib/datos'
import { hoyChile, sumarDias } from '../../lib/formato'
import type { ResultadoImportacion } from '../../tipos/db'

const TAMANO_LOTE = 300

export default function ImportarCsv() {
  const [archivo, setArchivo] = useState('')
  const [columnas, setColumnas] = useState<string[]>([])
  const [filas, setFilas] = useState<Record<string, string>[]>([])
  const [mapeo, setMapeo] = useState<Mapeo>({})
  const [accion, setAccion] = useState('Primer contacto')
  const [fecha, setFecha] = useState(() => sumarDias(hoyChile(), 1))
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const revisadas = useMemo(() => revisarFilas(filas, mapeo), [filas, mapeo])
  const validas = revisadas.filter((r) => r.valida)
  const conAvisos = revisadas.filter((r) => r.avisos.length > 0).length

  async function elegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0]
    e.target.value = ''
    if (!elegido) return
    setResultado(null)
    setError(null)
    try {
      const leido = await leerCsv(elegido)
      if (leido.filas.length === 0) return setError('El archivo no tiene filas.')
      setArchivo(elegido.name)
      setColumnas(leido.columnas)
      setFilas(leido.filas)
      setMapeo(mapeoAutomatico(leido.columnas))
    } catch (err) {
      setError(mensajeDe(err))
    }
  }

  function descargarPlantilla() {
    const url = URL.createObjectURL(plantillaCsv())
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'plantilla-prospectos.csv'
    enlace.click()
    URL.revokeObjectURL(url)
  }

  async function importar() {
    if (!mapeo.empresa) return setError('Indica qué columna trae el nombre de la empresa.')
    if (!accion.trim() || !fecha) return setError('Define la próxima acción y la fecha para todos los prospectos.')
    setImportando(true)
    setError(null)
    const total: ResultadoImportacion = { empresas: 0, contactos: 0, oportunidades: 0, omitidas: 0 }
    try {
      for (let i = 0; i < validas.length; i += TAMANO_LOTE) {
        const lote = validas.slice(i, i + TAMANO_LOTE).map((r) => r.fila)
        const r = await importarProspectos(lote, accion.trim(), fecha)
        total.empresas += r.empresas
        total.contactos += r.contactos
        total.oportunidades += r.oportunidades
        total.omitidas += r.omitidas
      }
      total.omitidas += revisadas.length - validas.length
      setResultado(total)
      setArchivo('')
      setColumnas([])
      setFilas([])
    } catch (err) {
      setError(
        total.oportunidades > 0
          ? `Se alcanzaron a importar ${total.oportunidades} prospectos antes del error: ${mensajeDe(err)}`
          : mensajeDe(err),
      )
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <Encabezado
        titulo="Importar prospectos"
        detalle="Sube un CSV. Cada fila crea la empresa, el contacto y una oportunidad en Nuevo prospecto."
        acciones={
          <Boton variante="secundario" onClick={descargarPlantilla}>
            Descargar plantilla
          </Boton>
        }
      />

      <div className="space-y-5 px-4 md:px-8">
        <MensajeError mensaje={error} />

        {resultado && (
          <Tarjeta className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/60">
            <p className="text-sm">
              Listo: <strong>{resultado.oportunidades}</strong> oportunidades nuevas, {resultado.empresas} empresas y{' '}
              {resultado.contactos} contactos. {resultado.omitidas > 0 && `${resultado.omitidas} filas omitidas (sin empresa o con una oportunidad abierta).`}
            </p>
            <Link to="/tablero" className="text-sm font-medium underline">
              Ver en el tablero
            </Link>
          </Tarjeta>
        )}

        <Tarjeta>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-200 px-4 py-8 text-center hover:bg-zinc-50">
            <span className="text-sm font-medium">{archivo || 'Elegir archivo CSV'}</span>
            <span className="text-xs text-zinc-400">Funciona con CSV de Excel (con coma o punto y coma)</span>
            <input type="file" accept=".csv,text/csv" onChange={elegirArchivo} className="sr-only" />
          </label>
        </Tarjeta>

        {filas.length > 0 && (
          <>
            <Tarjeta className="space-y-3">
              <h2 className="text-sm font-semibold">1 · Qué columna es cada dato</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CAMPOS.map((campo) => (
                  <Campo key={campo.id} etiqueta={campo.id === 'empresa' ? `${campo.nombre} (obligatorio)` : campo.nombre}>
                    <Selector
                      value={mapeo[campo.id] ?? ''}
                      onChange={(e) => setMapeo({ ...mapeo, [campo.id]: e.target.value || undefined })}
                    >
                      <option value="">— No importar —</option>
                      {columnas.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Selector>
                  </Campo>
                ))}
              </div>
            </Tarjeta>

            <Tarjeta className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">2 · Revisión</h2>
                <Insignia tono="verde">{validas.length} se importan</Insignia>
                {revisadas.length - validas.length > 0 && (
                  <Insignia tono="rojo">{revisadas.length - validas.length} sin empresa</Insignia>
                )}
                {conAvisos > 0 && <Insignia tono="ambar">{conAvisos} con avisos</Insignia>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs text-zinc-400">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Empresa</th>
                      <th className="py-2 pr-3 font-medium">Contacto</th>
                      <th className="py-2 pr-3 font-medium">Email</th>
                      <th className="py-2 pr-3 font-medium">WhatsApp</th>
                      <th className="py-2 font-medium">Avisos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {revisadas.slice(0, 20).map((r, i) => (
                      <tr key={i} className={r.valida ? '' : 'text-zinc-400'}>
                        <td className="py-2 pr-3">{r.fila.empresa || '—'}</td>
                        <td className="py-2 pr-3">{r.fila.contacto ?? '—'}</td>
                        <td className="py-2 pr-3">{r.fila.email ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums">{r.fila.whatsapp ?? '—'}</td>
                        <td className="py-2 text-xs text-amber-700">{r.avisos.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {revisadas.length > 20 && <p className="text-xs text-zinc-400">Mostrando 20 de {revisadas.length} filas.</p>}
            </Tarjeta>

            <Tarjeta className="space-y-3">
              <h2 className="text-sm font-semibold">3 · Próxima acción para todos</h2>
              <p className="text-sm text-zinc-500">Ningún prospecto entra sin seguimiento.</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Entrada value={accion} onChange={(e) => setAccion(e.target.value)} />
                <Entrada type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha" />
              </div>
              <div className="flex justify-end">
                <Boton onClick={() => void importar()} disabled={importando || validas.length === 0}>
                  {importando ? 'Importando…' : `Importar ${validas.length} prospectos`}
                </Boton>
              </div>
            </Tarjeta>
          </>
        )}
      </div>
    </div>
  )
}
