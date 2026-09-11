import { useCallback, useEffect, useState } from 'react'

// Carga datos al montar y cada vez que cambian las dependencias.
export function useConsulta<T>(consulta: () => Promise<T>, dependencias: readonly unknown[]) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    consulta()
      .then((d) => {
        if (!vigente) return
        setDatos(d)
        setError(null)
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  return { datos, error, cargando, recargar, setDatos }
}
