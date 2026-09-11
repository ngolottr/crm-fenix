import { useEffect, useRef, useState } from 'react'
import { IconoCorreo, IconoTelefono, IconoWhatsapp } from '../../componentes/iconos'
import { enlaceEmail, enlaceLlamada, enlaceWhatsapp } from '../../lib/contacto'
import { plantillasCompartidas } from '../../lib/datos'
import { rellenar } from '../../lib/plantillas'
import type { Plantilla } from '../../tipos/db'
import type { Canal, Etapa, TipoInteraccion } from '../../tipos/dominio'

interface Props {
  nombre: string | null
  empresa: string | null
  servicio: string | null
  etapa: Etapa | null
  whatsapp: string | null
  email: string | null
  compacto?: boolean
  onContactado?: (tipo: TipoInteraccion) => void
}

// Contacto en un clic. WhatsApp y email ofrecen las plantillas de la etapa
// actual primero, ya rellenadas con {nombre}, {empresa} y {servicio}.
export default function BotonesContacto(p: Props) {
  const [menu, setMenu] = useState<'whatsapp' | 'email' | null>(null)
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    plantillasCompartidas()
      .then(setPlantillas)
      .catch(() => setPlantillas([]))
    const alClickFuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setMenu(null)
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [menu])

  const variables = { nombre: p.nombre, empresa: p.empresa, servicio: p.servicio }

  const delCanal = (canal: Canal) =>
    plantillas
      .filter((x) => x.canal === canal)
      .sort((a, b) => puntaje(b, p.etapa) - puntaje(a, p.etapa) || a.nombre.localeCompare(b.nombre))

  function contactar(url: string, tipo: TipoInteraccion, pestanaNueva: boolean) {
    if (pestanaNueva) window.open(url, '_blank', 'noopener')
    else window.location.href = url
    setMenu(null)
    p.onContactado?.(tipo)
  }

  const tamano = p.compacto ? 'p-1.5' : 'p-2'
  const claseBoton = `rounded-full ${tamano} text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-100 hover:text-zinc-900`

  if (!p.whatsapp && !p.email) return null

  return (
    <div ref={caja} className="relative flex shrink-0 items-center gap-1.5">
      {p.whatsapp && (
        <button
          type="button"
          className={claseBoton}
          onClick={() => setMenu(menu === 'whatsapp' ? null : 'whatsapp')}
          aria-label="Escribir por WhatsApp"
          title="WhatsApp"
        >
          <IconoWhatsapp width={p.compacto ? 16 : 18} height={p.compacto ? 16 : 18} />
        </button>
      )}
      {p.email && (
        <button
          type="button"
          className={claseBoton}
          onClick={() => setMenu(menu === 'email' ? null : 'email')}
          aria-label="Enviar email"
          title="Email"
        >
          <IconoCorreo width={p.compacto ? 16 : 18} height={p.compacto ? 16 : 18} />
        </button>
      )}
      {p.whatsapp && !p.compacto && (
        <button
          type="button"
          className={claseBoton}
          onClick={() => contactar(enlaceLlamada(p.whatsapp ?? ''), 'llamada', false)}
          aria-label="Llamar"
          title="Llamar"
        >
          <IconoTelefono width={18} height={18} />
        </button>
      )}

      {menu && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-1.5 text-left shadow-lg ring-1 ring-zinc-200">
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-zinc-400">
            {menu === 'whatsapp' ? 'WhatsApp' : 'Email'} a {p.nombre ?? 'contacto'}
          </p>
          {delCanal(menu).map((pl) => {
            const texto = rellenar(pl.cuerpo, variables)
            const url =
              menu === 'whatsapp'
                ? enlaceWhatsapp(p.whatsapp ?? '', texto)
                : enlaceEmail(p.email ?? '', rellenar(pl.asunto ?? '', variables), texto)
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => contactar(url, menu, menu === 'whatsapp')}
                className="block w-full rounded-xl px-2.5 py-2 text-left hover:bg-zinc-100"
              >
                <span className="block text-sm font-medium">{pl.nombre}</span>
                <span className="line-clamp-2 block text-xs text-zinc-500">{texto}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() =>
              contactar(
                menu === 'whatsapp' ? enlaceWhatsapp(p.whatsapp ?? '') : enlaceEmail(p.email ?? ''),
                menu,
                menu === 'whatsapp',
              )
            }
            className="block w-full rounded-xl px-2.5 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Mensaje en blanco
          </button>
        </div>
      )}
    </div>
  )
}

function puntaje(pl: Plantilla, etapa: Etapa | null): number {
  if (pl.etapa && pl.etapa === etapa) return 2
  if (!pl.etapa) return 1
  return 0
}
