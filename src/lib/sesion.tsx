import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Perfil } from '../tipos/db'
import { supabase } from './supabase'

interface EstadoSesion {
  sesion: Session | null
  perfil: Perfil | null
  cargando: boolean
}

const Contexto = createContext<EstadoSesion>({ sesion: null, perfil: null, cargando: true })

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      if (!data.session) setCargando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSesion(nueva)
      if (!nueva) {
        setPerfil(null)
        setCargando(false)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const usuarioId = sesion?.user.id
  useEffect(() => {
    if (!usuarioId) return
    let vigente = true
    setCargando(true)
    supabase
      .from('perfiles')
      .select('*')
      .eq('id', usuarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (!vigente) return
        setPerfil(data as Perfil | null)
        setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [usuarioId])

  return <Contexto.Provider value={{ sesion, perfil, cargando }}>{children}</Contexto.Provider>
}

export const useSesion = () => useContext(Contexto)

export const salir = () => supabase.auth.signOut()
