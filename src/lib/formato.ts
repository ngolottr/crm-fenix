import { addDays, format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const pesos = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

export const clp = (n: number | null | undefined) => pesos.format(n ?? 0)

// Para espacios chicos: $1,2 M · $450 mil
export function clpCorto(n: number | null | undefined): string {
  const v = n ?? 0
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)} mil`
  return clp(v)
}

export const fechaCorta = (iso: string) => format(parseISO(iso), 'd MMM', { locale: es })
export const fechaLarga = (iso: string) => format(parseISO(iso), "EEEE d 'de' MMMM", { locale: es })
export const fechaHora = (iso: string) => format(parseISO(iso), "d MMM yyyy '·' HH:mm", { locale: es })
export const hace = (iso: string) => formatDistanceToNowStrict(parseISO(iso), { locale: es, addSuffix: true })
export const mesCorto = (iso: string) => format(parseISO(iso), 'MMM yy', { locale: es })

// La fecha de hoy en Chile (yyyy-mm-dd), igual que la función hoy() de la base.
export const hoyChile = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

export const sumarDias = (iso: string, dias: number) => format(addDays(parseISO(iso), dias), 'yyyy-MM-dd')

export const ahoraLocal = () => format(new Date(), "yyyy-MM-dd'T'HH:mm")
