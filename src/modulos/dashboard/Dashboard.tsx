import type { ReactNode } from 'react'
import { useState } from 'react'
import { Cargando, Encabezado, MensajeError, Tarjeta } from '../../componentes/ui'
import {
  obtenerConversion,
  obtenerMotivosPerdida,
  obtenerPipeline,
  obtenerResumen,
  obtenerVentasMensuales,
} from '../../lib/datos'
import { clp, clpCorto, hoyChile, mesCorto } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import { ETAPAS_TABLERO } from '../../tipos/dominio'

// Paleta de referencia de la skill dataviz, validada sobre fondo blanco.
// Una serie → slot 1. Dos series (setup y mensual) → slots 1 y 2.
const COLOR = {
  serie1: '#2a78d6',
  serie1Activa: '#1c5cab',
  serie2: '#eb6834',
  serie2Activa: '#c24f22',
  tinta: '#0b0b0b',
  tinta2: '#52514e',
  tintaSuave: '#898781',
  grilla: '#e1e0d9',
  base: '#c3c2b7',
}

export default function Dashboard() {
  const panel = useConsulta(
    () =>
      Promise.all([obtenerResumen(), obtenerPipeline(), obtenerConversion(), obtenerVentasMensuales(), obtenerMotivosPerdida()]),
    [],
  )

  if (panel.cargando && !panel.datos) return <Cargando />
  if (!panel.datos) {
    return (
      <div className="p-8">
        <MensajeError mensaje={panel.error ?? 'No se pudo cargar el panel.'} />
      </div>
    )
  }

  const [resumen, pipeline, conversion, ventas, motivos] = panel.datos

  const filasPipeline: FilaBarra[] = ETAPAS_TABLERO.map((e) => {
    const fila = pipeline.find((p) => p.etapa === e.id)
    const valor = Number(fila?.valor_anual ?? 0)
    return {
      clave: e.id,
      etiqueta: e.nombre,
      valor,
      texto: clpCorto(valor),
      detalle: `${fila?.cantidad ?? 0} oportunidades · ponderado por probabilidad ${clpCorto(Number(fila?.valor_ponderado ?? 0))}`,
    }
  })

  const total = conversion[0]?.alcanzaron ?? 0
  const filasConversion: FilaBarra[] = conversion.map((c, i) => {
    const anterior = i > 0 ? conversion[i - 1] : null
    const pctAnterior = anterior && anterior.alcanzaron > 0 ? Math.round((c.alcanzaron / anterior.alcanzaron) * 100) : null
    const etapa = ETAPAS_TABLERO.find((e) => e.id === c.etapa)
    return {
      clave: c.etapa,
      etiqueta: etapa?.nombre ?? c.etapa,
      valor: c.alcanzaron,
      texto: pctAnterior === null ? String(c.alcanzaron) : `${c.alcanzaron} · ${pctAnterior} %`,
      detalle:
        anterior === null
          ? 'Punto de partida del embudo'
          : `${pctAnterior ?? 0} % pasó desde ${ETAPAS_TABLERO.find((e) => e.id === anterior.etapa)?.nombre ?? ''} · ${
              total > 0 ? Math.round((c.alcanzaron / total) * 100) : 0
            } % del total`,
    }
  })

  const filasMotivos: FilaBarra[] = motivos.map((m) => ({
    clave: m.motivo,
    etiqueta: m.motivo,
    valor: m.cantidad,
    texto: String(m.cantidad),
    detalle: `${clpCorto(Number(m.valor_anual))} en valor anual perdido`,
  }))

  const meses = ultimosMeses(6).map((clave) => {
    const fila = ventas.find((v) => v.mes.slice(0, 7) === clave)
    return {
      clave,
      etiqueta: mesCorto(`${clave}-01`),
      setup: Number(fila?.total_setup ?? 0),
      mensual: Number(fila?.total_mensual ?? 0),
      cantidad: fila?.cantidad ?? 0,
    }
  })

  const tasa = resumen.tasa_cierre === null ? null : Number(resumen.tasa_cierre)

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <Encabezado titulo="Panel" detalle="Montos netos en pesos. Valor anual = setup + mensual × 12." />

      <div className="space-y-5 px-4 md:px-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Tarjeta className="sm:col-span-2 lg:col-span-2">
            <p className="text-sm text-zinc-500">Pipeline abierto</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight">{clpCorto(Number(resumen.pipeline_valor))}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {resumen.abiertas} oportunidades antes de ganarse · {clp(Number(resumen.pipeline_valor))}
            </p>
          </Tarjeta>
          <Cifra etiqueta="Ventas ganadas (setup)" valor={clpCorto(Number(resumen.ventas_setup))} detalle={`${resumen.ganadas} ganadas`} />
          <Cifra
            etiqueta="Recurrente mensual"
            valor={clpCorto(Number(resumen.recurrente_mensual))}
            detalle={`${resumen.clientes_activos} clientes activos`}
          />
          <Cifra
            etiqueta="Tasa de cierre"
            valor={tasa === null ? '—' : `${String(tasa).replace('.', ',')} %`}
            detalle={`${resumen.ganadas} ganadas · ${resumen.perdidas} perdidas`}
          />
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <ConTabla
            titulo="Pipeline por etapa"
            detalle="Valor anual de las oportunidades en cada etapa."
            tabla={
              <Tabla
                columnas={['Etapa', 'Oportunidades', 'Valor anual', 'Ponderado']}
                filas={ETAPAS_TABLERO.map((e) => {
                  const f = pipeline.find((p) => p.etapa === e.id)
                  return [e.nombre, String(f?.cantidad ?? 0), clp(Number(f?.valor_anual ?? 0)), clp(Number(f?.valor_ponderado ?? 0))]
                })}
              />
            }
          >
            <BarrasHorizontales filas={filasPipeline} />
          </ConTabla>

          <ConTabla
            titulo="Conversión entre etapas"
            detalle="Cuántas llegaron al menos hasta cada etapa, y qué porcentaje pasó desde la anterior."
            tabla={
              <Tabla
                columnas={['Etapa', 'Llegaron', '% desde la anterior']}
                filas={conversion.map((c, i) => [
                  ETAPAS_TABLERO.find((e) => e.id === c.etapa)?.nombre ?? c.etapa,
                  String(c.alcanzaron),
                  i === 0 || conversion[i - 1].alcanzaron === 0
                    ? '—'
                    : `${Math.round((c.alcanzaron / conversion[i - 1].alcanzaron) * 100)} %`,
                ])}
              />
            }
          >
            <BarrasHorizontales filas={filasConversion} />
          </ConTabla>

          <ConTabla
            titulo="Ventas ganadas por mes"
            detalle="Setup cobrado una vez y recurrente mensual contratado, según el mes en que se ganó."
            tabla={
              <Tabla
                columnas={['Mes', 'Ganadas', 'Setup', 'Mensual']}
                filas={meses.map((m) => [m.etiqueta, String(m.cantidad), clp(m.setup), clp(m.mensual)])}
              />
            }
          >
            <ColumnasAgrupadas meses={meses} />
          </ConTabla>

          <ConTabla
            titulo="Motivos de pérdida"
            detalle="Cuántas oportunidades se perdieron por cada motivo."
            tabla={
              <Tabla
                columnas={['Motivo', 'Perdidas', 'Valor anual']}
                filas={motivos.map((m) => [m.motivo, String(m.cantidad), clp(Number(m.valor_anual))])}
              />
            }
          >
            {filasMotivos.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">Todavía no hay oportunidades perdidas.</p>
            ) : (
              <BarrasHorizontales filas={filasMotivos} />
            )}
          </ConTabla>
        </div>
      </div>
    </div>
  )
}

function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle: string }) {
  return (
    <Tarjeta>
      <p className="text-sm text-zinc-500">{etiqueta}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{valor}</p>
      <p className="mt-1 text-xs text-zinc-500">{detalle}</p>
    </Tarjeta>
  )
}

// Cada gráfico tiene su tabla gemela: el valor nunca depende solo del color ni del tooltip.
function ConTabla({
  titulo,
  detalle,
  tabla,
  children,
}: {
  titulo: string
  detalle: string
  tabla: ReactNode
  children: ReactNode
}) {
  const [verTabla, setVerTabla] = useState(false)
  return (
    <Tarjeta>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{detalle}</p>
        </div>
        <button
          type="button"
          onClick={() => setVerTabla(!verTabla)}
          className="shrink-0 rounded-full px-2.5 py-1 text-xs text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"
        >
          {verTabla ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>
      {verTabla ? tabla : children}
    </Tarjeta>
  )
}

function Tabla({ columnas, filas }: { columnas: string[]; filas: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-zinc-400">
          <tr>
            {columnas.map((c, i) => (
              <th key={c} className={`py-1.5 font-medium ${i > 0 ? 'text-right' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {filas.map((f) => (
            <tr key={f[0]}>
              {f.map((celda, i) => (
                <td key={i} className={`py-1.5 ${i > 0 ? 'text-right tabular-nums' : ''}`}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface FilaBarra {
  clave: string
  etiqueta: string
  valor: number
  texto: string
  detalle: string
}

// Barras horizontales de una sola serie: 14 px de grosor, punta redondeada de
// 4 px y base recta. El valor va en la punta; el tooltip agrega el detalle.
function BarrasHorizontales({ filas }: { filas: FilaBarra[] }) {
  const maximo = Math.max(...filas.map((f) => f.valor), 1)
  return (
    <ul className="space-y-1">
      {filas.map((f) => {
        const pct = (f.valor / maximo) * 100
        return (
          <li key={f.clave} className="grid grid-cols-[8.5rem_1fr] items-center gap-3 sm:grid-cols-[11rem_1fr]">
            <span className="truncate text-xs" style={{ color: COLOR.tinta2 }}>
              {f.etiqueta}
            </span>
            <div
              tabIndex={0}
              aria-label={`${f.etiqueta}: ${f.texto}. ${f.detalle}`}
              className="group relative h-7 rounded outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
            >
              <div className="absolute inset-y-0 left-0 right-24 border-l" style={{ borderColor: COLOR.base }}>
                <div
                  className="absolute left-0 top-1/2 h-3.5 -translate-y-1/2 rounded-r-[4px] bg-[var(--barra)] transition-colors group-hover:bg-[var(--barra-activa)] group-focus-visible:bg-[var(--barra-activa)]"
                  style={
                    {
                      width: `${pct}%`,
                      minWidth: f.valor > 0 ? 3 : 0,
                      '--barra': COLOR.serie1,
                      '--barra-activa': COLOR.serie1Activa,
                    } as React.CSSProperties
                  }
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-1.5 text-xs tabular-nums"
                  style={{ left: `${pct}%`, color: COLOR.tinta }}
                >
                  {f.texto}
                </span>
              </div>
              <Tooltip>
                <strong className="font-semibold">{f.texto}</strong>
                <span className="text-zinc-300"> · {f.etiqueta}</span>
                <span className="block text-zinc-300">{f.detalle}</span>
              </Tooltip>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

interface Mes {
  clave: string
  etiqueta: string
  setup: number
  mensual: number
  cantidad: number
}

// Dos series en un solo eje (las dos son pesos). Columnas de máximo 24 px,
// separadas por 2 px de fondo, con leyenda siempre visible.
function ColumnasAgrupadas({ meses }: { meses: Mes[] }) {
  const tope = redondearArriba(Math.max(...meses.flatMap((m) => [m.setup, m.mensual]), 1))
  const lineas = [tope, tope / 2, 0]
  const ultimo = meses[meses.length - 1]

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs" style={{ color: COLOR.tinta2 }}>
        <Leyenda color={COLOR.serie1} nombre="Setup" />
        <Leyenda color={COLOR.serie2} nombre="Recurrente mensual" />
      </div>
      <div className="grid grid-cols-[3.5rem_1fr] gap-2">
        <div className="relative h-44">
          {lineas.map((v) => (
            <span
              key={v}
              className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums"
              style={{ top: `${100 - (v / tope) * 100}%`, color: COLOR.tintaSuave }}
            >
              {clpCorto(v)}
            </span>
          ))}
        </div>
        <div>
          <div className="relative h-44 border-b" style={{ borderColor: COLOR.base }}>
            {lineas.slice(0, 2).map((v) => (
              <div
                key={v}
                className="absolute inset-x-0 border-t"
                style={{ top: `${100 - (v / tope) * 100}%`, borderColor: COLOR.grilla }}
              />
            ))}
            <div className="absolute inset-0 flex items-end">
              {meses.map((m) => (
                <div
                  key={m.clave}
                  tabIndex={0}
                  aria-label={`${m.etiqueta}: setup ${clp(m.setup)}, mensual ${clp(m.mensual)}`}
                  className="group relative flex h-full flex-1 items-end justify-center gap-[2px] rounded outline-none hover:bg-zinc-50 focus-visible:bg-zinc-50"
                >
                  <Columna valor={m.setup} tope={tope} color={COLOR.serie1} />
                  <Columna valor={m.mensual} tope={tope} color={COLOR.serie2} />
                  <Tooltip>
                    <span className="block text-zinc-300">{m.etiqueta} · {m.cantidad} ganadas</span>
                    <FilaTooltip color={COLOR.serie1} valor={clp(m.setup)} nombre="Setup" />
                    <FilaTooltip color={COLOR.serie2} valor={clp(m.mensual)} nombre="Mensual" />
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
          <div className="flex">
            {meses.map((m) => (
              <span key={m.clave} className="flex-1 pt-1.5 text-center text-[11px]" style={{ color: COLOR.tintaSuave }}>
                {m.etiqueta}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs" style={{ color: COLOR.tinta2 }}>
        Este mes: {clp(ultimo.setup)} en setup y {clp(ultimo.mensual)} en recurrente mensual.
      </p>
    </div>
  )
}

function Columna({ valor, tope, color }: { valor: number; tope: number; color: string }) {
  return (
    <div
      className="w-full max-w-6 rounded-t-[4px]"
      style={{ height: `${(valor / tope) * 100}%`, minHeight: valor > 0 ? 3 : 0, backgroundColor: color }}
    />
  )
}

function Leyenda({ color, nombre }: { color: string; nombre: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {nombre}
    </span>
  )
}

function FilaTooltip({ color, valor, nombre }: { color: string; valor: string; nombre: string }) {
  return (
    <span className="mt-1 flex items-center gap-2">
      <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
      <strong className="font-semibold">{valor}</strong>
      <span className="text-zinc-300">{nombre}</span>
    </span>
  )
}

function Tooltip({ children }: { children: ReactNode }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-xl bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block group-focus-visible:block"
    >
      {children}
    </div>
  )
}

function ultimosMeses(n: number): string[] {
  const [anio, mes] = hoyChile().split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(anio, mes - 1 - (n - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

// Tope del eje en un número redondo: 1, 2 o 5 por potencia de 10.
function redondearArriba(n: number): number {
  const potencia = 10 ** Math.floor(Math.log10(n))
  const base = n / potencia
  const paso = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10
  return paso * potencia
}
