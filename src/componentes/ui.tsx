import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useEffect } from 'react'

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma'

const estilosBoton: Record<Variante, string> = {
  primario: 'bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-300',
  secundario: 'bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-100 disabled:text-zinc-400',
  peligro: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300',
  fantasma: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:text-zinc-300',
}

export function Boton({
  variante = 'primario',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${estilosBoton[variante]} ${className}`}
    />
  )
}

export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-zinc-400">{ayuda}</span>}
    </label>
  )
}

const claseEntrada =
  'w-full rounded-xl border-0 bg-white px-3 py-2 text-sm text-zinc-900 ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:bg-zinc-50'

export function Entrada({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${claseEntrada} ${className}`} />
}

export function Selector({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${claseEntrada} ${className}`} />
}

export function AreaTexto({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${claseEntrada} ${className}`} />
}

export function Modal({
  abierto,
  titulo,
  onCerrar,
  children,
  ancho = 'sm:max-w-lg',
}: {
  abierto: boolean
  titulo: string
  onCerrar: () => void
  children: ReactNode
  ancho?: string
}) {
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierto, onCerrar])

  if (!abierto) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl ${ancho}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 ring-1 ring-zinc-200/70 ${className}`}>{children}</div>
}

type Tono = 'gris' | 'rojo' | 'ambar' | 'verde' | 'azul'

const estilosTono: Record<Tono, string> = {
  gris: 'bg-zinc-100 text-zinc-600',
  rojo: 'bg-red-50 text-red-700',
  ambar: 'bg-amber-50 text-amber-700',
  verde: 'bg-emerald-50 text-emerald-700',
  azul: 'bg-sky-50 text-sky-700',
}

export function Insignia({ children, tono = 'gris' }: { children: ReactNode; tono?: Tono }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${estilosTono[tono]}`}>
      {children}
    </span>
  )
}

export function Encabezado({
  titulo,
  detalle,
  acciones,
}: {
  titulo: ReactNode
  detalle?: ReactNode
  acciones?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-6 md:px-8 md:pt-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{titulo}</h1>
        {detalle && <p className="mt-1 text-sm text-zinc-500">{detalle}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  )
}

export function Cargando() {
  return <div className="p-8 text-center text-sm text-zinc-400">Cargando…</div>
}

export function MensajeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{mensaje}</div>
}

export function Vacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-zinc-700">{titulo}</p>
      {detalle && <p className="mt-1 text-sm text-zinc-400">{detalle}</p>}
    </div>
  )
}
