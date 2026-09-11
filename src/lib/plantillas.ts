export interface VariablesPlantilla {
  nombre: string | null
  empresa: string | null
  servicio: string | null
}

// {nombre} usa solo el primer nombre: "Hola Carolina", no "Hola Carolina Muñoz".
export function rellenar(texto: string, v: VariablesPlantilla): string {
  return texto.replace(/\{(nombre|empresa|servicio)\}/g, (_, clave: keyof VariablesPlantilla) => {
    const valor = v[clave] ?? ''
    return clave === 'nombre' ? valor.trim().split(/\s+/)[0] : valor
  })
}
