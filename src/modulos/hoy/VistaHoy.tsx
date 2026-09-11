import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconoAdelante } from '../../componentes/iconos'
import { Cargando, Encabezado, Insignia, MensajeError, Tarjeta, Vacio } from '../../componentes/ui'
import {
  completarTarea,
  mensajeDe,
  oportunidadesAbandonadas,
  oportunidadesSinSeguimiento,
  tareasDeHoy,
} from '../../lib/datos'
import { clpCorto, fechaLarga, hoyChile } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import type { OportunidadVista, TareaHoy } from '../../tipos/db'
import type { Etapa, TipoInteraccion } from '../../tipos/dominio'
import { DIAS_ALERTA, ETAPAS, nombreDe } from '../../tipos/dominio'
import BotonesContacto from '../oportunidades/BotonesContacto'
import RegistrarInteraccion from '../oportunidades/RegistrarInteraccion'

interface Registro {
  op: { id: string; etapa: Etapa; empresa_nombre: string }
  tipo?: TipoInteraccion
  resumen?: string
}

export default function VistaHoy() {
  const tareas = useConsulta(tareasDeHoy, [])
  const abandonadas = useConsulta(oportunidadesAbandonadas, [])
  const sinSeguimiento = useConsulta(oportunidadesSinSeguimiento, [])
  const [registro, setRegistro] = useState<Registro | null>(null)
  const [error, setError] = useState<string | null>(null)

  function recargar() {
    tareas.recargar()
    abandonadas.recargar()
    sinSeguimiento.recargar()
  }

  // Marcar hecha una tarea de una oportunidad obliga a registrar la interacción:
  // así se define la siguiente acción en el mismo gesto.
  function marcarHecha(t: TareaHoy) {
    if (t.oportunidad_id && t.etapa && t.empresa_nombre) {
      setRegistro({
        op: { id: t.oportunidad_id, etapa: t.etapa, empresa_nombre: t.empresa_nombre },
        resumen: `${t.titulo}: `,
      })
      return
    }
    completarTarea(t.tarea_id)
      .then(recargar)
      .catch((e: unknown) => setError(mensajeDe(e)))
  }

  const lista = tareas.datos ?? []
  const vencidas = lista.filter((t) => t.vencida)
  const deHoy = lista.filter((t) => !t.vencida)
  const enJuego = [...new Map(lista.map((t) => [t.oportunidad_id, Number(t.valor_anual)])).values()].reduce(
    (s, v) => s + v,
    0,
  )

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <Encabezado
        titulo="Hoy"
        detalle={
          <span className="first-letter:uppercase">
            {fechaLarga(hoyChile())}
            {lista.length > 0 && ` · ${lista.length} acciones · ${clpCorto(enJuego)} en juego`}
          </span>
        }
      />

      <div className="space-y-5 px-4 md:px-8">
        <MensajeError mensaje={error ?? tareas.error} />

        {tareas.cargando && !tareas.datos ? (
          <Cargando />
        ) : lista.length === 0 ? (
          <Tarjeta>
            <Vacio titulo="Nada pendiente para hoy" detalle="Todas las oportunidades tienen su próxima acción más adelante." />
          </Tarjeta>
        ) : (
          <>
            {vencidas.length > 0 && (
              <ListaTareas
                titulo="Vencidas"
                tareas={vencidas}
                onHecha={marcarHecha}
                onContactado={(t, tipo) => t.oportunidad_id && t.etapa && t.empresa_nombre && setRegistro({ op: { id: t.oportunidad_id, etapa: t.etapa, empresa_nombre: t.empresa_nombre }, tipo })}
              />
            )}
            {deHoy.length > 0 && (
              <ListaTareas
                titulo="Para hoy"
                tareas={deHoy}
                onHecha={marcarHecha}
                onContactado={(t, tipo) => t.oportunidad_id && t.etapa && t.empresa_nombre && setRegistro({ op: { id: t.oportunidad_id, etapa: t.etapa, empresa_nombre: t.empresa_nombre }, tipo })}
              />
            )}
          </>
        )}

        {(sinSeguimiento.datos?.length ?? 0) > 0 && (
          <ListaAlertas
            titulo="Sin próxima acción"
            detalle="Rompen la regla del CRM. Registra una interacción para definir qué sigue."
            ops={sinSeguimiento.datos ?? []}
            etiqueta={() => <Insignia tono="rojo">Sin seguimiento</Insignia>}
            onDefinir={(op) => setRegistro({ op })}
          />
        )}

        {(abandonadas.datos?.length ?? 0) > 0 && (
          <ListaAlertas
            titulo={`Sin interacción hace más de ${DIAS_ALERTA} días`}
            detalle="Tienen próxima acción, pero nadie ha hablado con el cliente en un buen rato."
            ops={abandonadas.datos ?? []}
            etiqueta={(op) => <Insignia tono="ambar">{op.dias_sin_interaccion} días</Insignia>}
            onDefinir={(op) => setRegistro({ op })}
          />
        )}
      </div>

      {registro && (
        <RegistrarInteraccion
          abierto
          oportunidad={registro.op}
          inicial={{ tipo: registro.tipo, resumen: registro.resumen }}
          onCerrar={() => setRegistro(null)}
          onGuardado={() => {
            setRegistro(null)
            recargar()
          }}
        />
      )}
    </div>
  )
}

function ListaTareas({
  titulo,
  tareas,
  onHecha,
  onContactado,
}: {
  titulo: string
  tareas: TareaHoy[]
  onHecha: (t: TareaHoy) => void
  onContactado: (t: TareaHoy, tipo: TipoInteraccion) => void
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {titulo} · {tareas.length}
      </h2>
      <Tarjeta className="p-0">
        <ul className="divide-y divide-zinc-100">
          {tareas.map((t) => (
            <li key={t.tarea_id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => onHecha(t)}
                className="h-5 w-5 shrink-0 rounded-full ring-1 ring-zinc-300 transition hover:ring-2 hover:ring-zinc-900"
                aria-label={`Marcar "${t.titulo}" como hecha`}
                title="Hecha"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.titulo}</p>
                <p className="truncate text-xs text-zinc-500">
                  {t.empresa_nombre ?? 'Tarea suelta'}
                  {t.etapa && ` · ${nombreDe(ETAPAS, t.etapa)}`}
                </p>
              </div>
              {t.vencida && <Insignia tono="rojo">{t.dias_atraso === 1 ? 'Ayer' : `Hace ${t.dias_atraso} días`}</Insignia>}
              <span className="hidden w-20 text-right text-sm tabular-nums text-zinc-600 sm:block">
                {clpCorto(t.valor_anual)}
              </span>
              <BotonesContacto
                compacto
                nombre={t.contacto_nombre}
                empresa={t.empresa_nombre}
                servicio={t.servicio_nombre}
                etapa={t.etapa}
                whatsapp={t.contacto_whatsapp}
                email={t.contacto_email}
                onContactado={(tipo) => onContactado(t, tipo)}
              />
              {t.oportunidad_id && (
                <Link
                  to={`/oportunidades/${t.oportunidad_id}`}
                  className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                  aria-label="Abrir ficha"
                >
                  <IconoAdelante width={18} height={18} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Tarjeta>
    </section>
  )
}

function ListaAlertas({
  titulo,
  detalle,
  ops,
  etiqueta,
  onDefinir,
}: {
  titulo: string
  detalle: string
  ops: OportunidadVista[]
  etiqueta: (op: OportunidadVista) => React.ReactNode
  onDefinir: (op: OportunidadVista) => void
}) {
  return (
    <section>
      <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {titulo} · {ops.length}
      </h2>
      <p className="mb-2 px-1 text-xs text-zinc-400">{detalle}</p>
      <Tarjeta className="p-0">
        <ul className="divide-y divide-zinc-100">
          {ops.map((op) => (
            <li key={op.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link to={`/oportunidades/${op.id}`} className="block truncate text-sm font-medium hover:underline">
                  {op.empresa_nombre}
                </Link>
                <p className="truncate text-xs text-zinc-500">
                  {nombreDe(ETAPAS, op.etapa)}
                  {op.proxima_accion && ` · Siguiente: ${op.proxima_accion}`}
                </p>
              </div>
              {etiqueta(op)}
              <span className="hidden w-20 text-right text-sm tabular-nums text-zinc-600 sm:block">
                {clpCorto(op.valor_anual)}
              </span>
              <button
                type="button"
                onClick={() => onDefinir(op)}
                className="rounded-full px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
              >
                Registrar
              </button>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </section>
  )
}
