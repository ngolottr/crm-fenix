import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProximaAccion } from '../../componentes/ProximaAccion'
import { Cargando, Encabezado, Insignia, MensajeError } from '../../componentes/ui'
import { mensajeDe, moverOportunidad, listarOportunidades } from '../../lib/datos'
import { clp, clpCorto } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import type { OportunidadVista } from '../../tipos/db'
import type { Etapa, InfoEtapa } from '../../tipos/dominio'
import { DIAS_ALERTA, ETAPAS_TABLERO } from '../../tipos/dominio'
import MarcarPerdida from '../oportunidades/MarcarPerdida'

interface Destino {
  etapa: Etapa
  orden?: number
}

export default function Tablero() {
  const { datos, error, cargando, setDatos, recargar } = useConsulta(listarOportunidades, [])
  const [activa, setActiva] = useState<OportunidadVista | null>(null)
  const [perdiendo, setPerdiendo] = useState<OportunidadVista | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // Mouse: se arrastra tras moverse 6 px, así un clic abre la ficha.
  // Dedo: se arrastra tras mantener apretado, así se puede hacer scroll.
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  )

  const porEtapa = useMemo(() => {
    const mapa = new Map<Etapa, OportunidadVista[]>()
    for (const o of [...(datos ?? [])].sort((a, b) => a.orden - b.orden)) {
      mapa.set(o.etapa, [...(mapa.get(o.etapa) ?? []), o])
    }
    return mapa
  }, [datos])

  function alEmpezar({ active }: DragStartEvent) {
    setActiva(datos?.find((o) => o.id === active.id) ?? null)
  }

  function alSoltar({ active, over }: DragEndEvent) {
    setActiva(null)
    const op = datos?.find((o) => o.id === active.id)
    const destino = over?.data.current as Destino | undefined
    if (!datos || !op || !destino || over?.id === `tarjeta-${op.id}`) return

    if (destino.etapa === 'perdido') {
      if (op.etapa !== 'perdido') setPerdiendo(op)
      return
    }

    const columna = (porEtapa.get(destino.etapa) ?? []).filter((o) => o.id !== op.id)
    let orden: number
    if (destino.orden === undefined) {
      orden = (columna.at(-1)?.orden ?? 0) + 1
    } else {
      // Soltada sobre otra tarjeta: queda justo antes de ella.
      const i = columna.findIndex((o) => o.orden === destino.orden)
      const anterior = i > 0 ? columna[i - 1].orden : destino.orden - 1
      orden = (anterior + destino.orden) / 2
    }
    if (destino.etapa === op.etapa && orden === op.orden) return

    const previos = datos
    setDatos(datos.map((o) => (o.id === op.id ? { ...o, etapa: destino.etapa, orden } : o)))
    moverOportunidad(op.id, destino.etapa, orden).catch((e: unknown) => {
      setDatos(previos)
      setAviso(mensajeDe(e))
    })
  }

  return (
    <div className="flex min-h-full flex-col">
      <Encabezado titulo="Tablero" detalle="Arrastra una tarjeta para cambiarla de etapa. Tócala para abrir su ficha." />

      {(error || aviso) && (
        <div className="px-4 pb-3 md:px-8">
          <MensajeError mensaje={error ?? aviso} />
        </div>
      )}

      {cargando && !datos ? (
        <Cargando />
      ) : (
        <DndContext
          sensors={sensores}
          onDragStart={alEmpezar}
          onDragEnd={alSoltar}
          onDragCancel={() => setActiva(null)}
        >
          <div className="flex flex-1 snap-x items-start gap-3 overflow-x-auto px-4 pb-6 md:px-8">
            {ETAPAS_TABLERO.map((etapa) => {
              const ops = porEtapa.get(etapa.id) ?? []
              return (
                <Columna key={etapa.id} etapa={etapa} ops={ops}>
                  {ops.map((op) => (
                    <TarjetaArrastrable key={op.id} op={op} />
                  ))}
                </Columna>
              )
            })}
            <ZonaPerdidas cantidad={porEtapa.get('perdido')?.length ?? 0} />
          </div>
          <DragOverlay>
            {activa ? (
              <div className="rotate-1 rounded-xl shadow-xl">
                <ContenidoTarjeta op={activa} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {perdiendo && (
        <MarcarPerdida
          abierto
          oportunidad={perdiendo}
          onCerrar={() => setPerdiendo(null)}
          onGuardado={() => {
            setPerdiendo(null)
            recargar()
          }}
        />
      )}
    </div>
  )
}

function Columna({ etapa, ops, children }: { etapa: InfoEtapa; ops: OportunidadVista[]; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `columna-${etapa.id}`, data: { etapa: etapa.id } })
  const setup = ops.reduce((s, o) => s + Number(o.monto_setup), 0)
  const mensual = ops.reduce((s, o) => s + Number(o.monto_mensual), 0)

  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 shrink-0 snap-start flex-col rounded-2xl bg-zinc-100/80 p-2 transition ${
        isOver ? 'ring-2 ring-zinc-900/15' : ''
      }`}
    >
      <header className="px-2 pb-2 pt-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${etapa.punto}`} />
          <h2 className="truncate text-sm font-semibold">{etapa.nombre}</h2>
          <span className="ml-auto text-xs tabular-nums text-zinc-400">{ops.length}</span>
        </div>
        <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
          {clpCorto(setup)}
          {mensual > 0 && ` + ${clpCorto(mensual)}/mes`}
        </p>
      </header>
      <div className="flex min-h-20 flex-col gap-2">{children}</div>
    </section>
  )
}

function TarjetaArrastrable({ op }: { op: OportunidadVista }) {
  const navigate = useNavigate()
  const arrastre = useDraggable({ id: op.id })
  const destino = useDroppable({ id: `tarjeta-${op.id}`, data: { etapa: op.etapa, orden: op.orden } })

  return (
    <div
      ref={(nodo) => {
        arrastre.setNodeRef(nodo)
        destino.setNodeRef(nodo)
      }}
      {...arrastre.listeners}
      {...arrastre.attributes}
      onClick={() => navigate(`/oportunidades/${op.id}`)}
      className={`cursor-grab touch-manipulation rounded-xl transition active:cursor-grabbing ${
        arrastre.isDragging ? 'opacity-30' : ''
      } ${destino.isOver && !arrastre.isDragging ? 'translate-y-1 ring-2 ring-zinc-900/20' : ''}`}
    >
      <ContenidoTarjeta op={op} />
    </div>
  )
}

function ContenidoTarjeta({ op }: { op: OportunidadVista }) {
  return (
    <article className="rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-zinc-200/70">
      <p className="text-sm font-medium leading-snug">{op.empresa_nombre}</p>
      {(op.contacto_nombre || op.servicio_nombre) && (
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {[op.contacto_nombre, op.servicio_nombre].filter(Boolean).join(' · ')}
        </p>
      )}
      <p className="mt-2 text-sm font-semibold tabular-nums">
        {clp(op.monto_setup)}
        {op.monto_mensual > 0 && <span className="font-normal text-zinc-500"> + {clp(op.monto_mensual)}/mes</span>}
      </p>
      <div className="mt-2 space-y-1.5">
        <ProximaAccion titulo={op.proxima_accion} fecha={op.fecha_proxima_accion} compacta />
        {op.dias_sin_interaccion > DIAS_ALERTA && (
          <Insignia tono="ambar">{op.dias_sin_interaccion} días sin interacción</Insignia>
        )}
      </div>
    </article>
  )
}

function ZonaPerdidas({ cantidad }: { cantidad: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'columna-perdido', data: { etapa: 'perdido' } })
  return (
    <section
      ref={setNodeRef}
      className={`flex w-56 shrink-0 snap-start flex-col items-center justify-center gap-1 self-stretch rounded-2xl border-2 border-dashed p-4 text-center transition ${
        isOver ? 'border-red-400 bg-red-50 text-red-700' : 'border-zinc-200 text-zinc-400'
      }`}
    >
      <p className="text-sm font-semibold">Perdido</p>
      <p className="text-xs">Suelta aquí para marcarla perdida</p>
      <p className="mt-2 text-xs tabular-nums">{cantidad} perdidas</p>
    </section>
  )
}
