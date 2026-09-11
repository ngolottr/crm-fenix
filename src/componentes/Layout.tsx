import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { salir, useSesion } from '../lib/sesion'
import NuevaOportunidad from '../modulos/oportunidades/NuevaOportunidad'
import { IconoAjustes, IconoHoy, IconoImportar, IconoMas, IconoPanel, IconoSalir, IconoTablero } from './iconos'
import { Boton } from './ui'

const NAVEGACION = [
  { a: '/', nombre: 'Hoy', Icono: IconoHoy },
  { a: '/tablero', nombre: 'Tablero', Icono: IconoTablero },
  { a: '/panel', nombre: 'Panel', Icono: IconoPanel },
  { a: '/importar', nombre: 'Importar', Icono: IconoImportar },
  { a: '/ajustes', nombre: 'Ajustes', Icono: IconoAjustes },
]

export default function Layout() {
  const [creando, setCreando] = useState(false)
  const navigate = useNavigate()
  const { perfil } = useSesion()

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200/70 bg-white/70 p-4 backdrop-blur md:flex">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold tracking-tight">Fénix IA Method</p>
          <p className="text-xs text-zinc-500">CRM</p>
        </div>
        <Boton onClick={() => setCreando(true)} className="mb-4 w-full">
          <IconoMas width={16} height={16} /> Oportunidad
        </Boton>
        <nav className="flex flex-col gap-1">
          {NAVEGACION.map(({ a, nombre, Icono }) => (
            <NavLink
              key={a}
              to={a}
              end={a === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`
              }
            >
              <Icono width={18} height={18} />
              {nombre}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 px-2 text-xs text-zinc-500">
          <span className="truncate">{perfil?.nombre}</span>
          <button
            type="button"
            onClick={() => void salir()}
            className="rounded-lg p-1.5 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Salir"
            title="Salir"
          >
            <IconoSalir width={16} height={16} />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-28 md:pb-0">
        <Outlet />
      </main>

      <button
        type="button"
        onClick={() => setCreando(true)}
        aria-label="Nueva oportunidad"
        className="fixed bottom-20 right-4 z-40 rounded-full bg-zinc-900 p-3.5 text-white shadow-lg md:hidden"
      >
        <IconoMas width={22} height={22} />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-zinc-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAVEGACION.map(({ a, nombre, Icono }) => (
          <NavLink
            key={a}
            to={a}
            end={a === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`
            }
          >
            <Icono width={22} height={22} />
            {nombre}
          </NavLink>
        ))}
      </nav>

      <NuevaOportunidad
        abierto={creando}
        onCerrar={() => setCreando(false)}
        onCreada={(id) => {
          setCreando(false)
          navigate(`/oportunidades/${id}`)
        }}
      />
    </div>
  )
}
