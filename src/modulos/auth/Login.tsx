import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Boton, Campo, Entrada, MensajeError } from '../../componentes/ui'
import { traducirError } from '../../lib/datos'
import { useSesion } from '../../lib/sesion'
import { faltanVariables, supabase } from '../../lib/supabase'

export default function Login() {
  const { sesion, cargando } = useSesion()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!cargando && sesion) return <Navigate to="/" replace />

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { error: fallo } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (fallo) setError(traducirError(fallo.message))
    setEnviando(false)
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-sm ring-1 ring-zinc-200/70">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">CRM</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Fénix IA Method</h1>
        <p className="mb-6 mt-1 text-sm text-zinc-500">Entra con tu cuenta.</p>

        {faltanVariables && (
          <div className="mb-4">
            <MensajeError mensaje="Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.local." />
          </div>
        )}

        <div className="space-y-3">
          <Campo etiqueta="Email">
            <Entrada type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Campo>
          <Campo etiqueta="Contraseña">
            <Entrada
              type="password"
              autoComplete="current-password"
              required
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </Campo>
        </div>

        {error && (
          <div className="mt-4">
            <MensajeError mensaje={error} />
          </div>
        )}

        <Boton type="submit" disabled={enviando} className="mt-6 w-full py-2.5">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Boton>
      </form>
    </div>
  )
}
