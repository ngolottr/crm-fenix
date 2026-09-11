import { createClient } from '@supabase/supabase-js'

const url: string | undefined = import.meta.env.VITE_SUPABASE_URL
const clave: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY

export const faltanVariables = !url || !clave

export const supabase = createClient(url ?? 'http://localhost:54321', clave ?? 'sin-clave', {
  auth: { persistSession: true, autoRefreshToken: true },
})
