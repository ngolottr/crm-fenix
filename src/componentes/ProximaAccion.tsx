import { fechaCorta, fechaLarga, hoyChile } from '../lib/formato'
import { Insignia } from './ui'

// Cómo se ve la próxima acción en todas partes: roja si venció, ámbar si es
// hoy, gris si viene. Sin próxima acción es siempre una alarma.
export function ProximaAccion({
  titulo,
  fecha,
  compacta = false,
}: {
  titulo: string | null
  fecha: string | null
  compacta?: boolean
}) {
  if (!titulo || !fecha) return <Insignia tono="rojo">Sin próxima acción</Insignia>

  const hoy = hoyChile()
  const tono = fecha < hoy ? 'rojo' : fecha === hoy ? 'ambar' : 'gris'
  const cuando = fecha < hoy ? `Vencida · ${fechaCorta(fecha)}` : fecha === hoy ? 'Hoy' : fechaCorta(fecha)

  if (compacta) {
    return (
      <span className="flex w-full min-w-0 items-center gap-1.5 text-xs">
        <Insignia tono={tono}>{cuando}</Insignia>
        <span className="truncate text-zinc-600">{titulo}</span>
      </span>
    )
  }

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Próxima acción</p>
      <p className="mt-1 text-lg font-semibold leading-snug">{titulo}</p>
      <div className="mt-1.5 flex items-center gap-2 text-sm text-zinc-500">
        <Insignia tono={tono}>{cuando}</Insignia>
        <span className="first-letter:uppercase">{fechaLarga(fecha)}</span>
      </div>
    </div>
  )
}
