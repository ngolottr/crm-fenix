import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Boton, Cargando } from '../../componentes/ui'
import { salir, useSesion } from '../../lib/sesion'

export default function RutaProtegida({ children }: { children: ReactNode }) {
  const { sesion, perfil, cargando } = useSesion()

  if (cargando) return <Cargando />
  if (!sesion) return <Navigate to="/login" replace />

  // Tiene cuenta en Supabase pero no está registrado en el CRM: la seguridad
  // por filas no le deja ver nada, así que se le explica en vez de mostrarle
  // pantallas vacías.
  if (!perfil) {
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="max-w-md rounded-3xl bg-white p-7 ring-1 ring-zinc-200/70">
          <h1 className="text-xl font-semibold tracking-tight">Tu usuario no tiene acceso al CRM</h1>
          <p className="mt-2 text-sm text-zinc-500">
            La cuenta <strong>{sesion.user.email}</strong> existe, pero no está registrada en la tabla de perfiles. Si
            eres el administrador, corre <code>supabase/seed.sql</code> en el SQL Editor de Supabase.
          </p>
          <Boton variante="secundario" className="mt-6" onClick={() => void salir()}>
            Salir
          </Boton>
        </div>
      </div>
    )
  }

  return children
}
