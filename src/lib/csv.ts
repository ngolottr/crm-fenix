import Papa from 'papaparse'
import type { Tamano } from '../tipos/dominio'
import { emailValido, normalizarWhatsapp } from './contacto'

export const CAMPOS = [
  { id: 'empresa', nombre: 'Empresa', alias: ['empresa', 'razon social', 'compania', 'negocio', 'cliente'] },
  { id: 'rubro', nombre: 'Rubro', alias: ['rubro', 'industria', 'sector', 'giro'] },
  { id: 'tamano', nombre: 'Tamaño', alias: ['tamano', 'size', 'empleados', 'trabajadores'] },
  { id: 'web', nombre: 'Sitio web', alias: ['web', 'sitio', 'sitio web', 'website', 'url', 'pagina'] },
  { id: 'contacto', nombre: 'Contacto', alias: ['contacto', 'nombre', 'nombre contacto', 'persona'] },
  { id: 'cargo', nombre: 'Cargo', alias: ['cargo', 'puesto', 'rol'] },
  { id: 'email', nombre: 'Email', alias: ['email', 'correo', 'mail', 'e-mail'] },
  { id: 'whatsapp', nombre: 'WhatsApp', alias: ['whatsapp', 'telefono', 'celular', 'fono', 'movil'] },
  { id: 'es_decisor', nombre: '¿Decide?', alias: ['es_decisor', 'decisor', 'es decisor', 'decide'] },
  { id: 'dolor', nombre: 'Dolor detectado', alias: ['dolor', 'necesidad', 'problema', 'dolor detectado'] },
  { id: 'notas', nombre: 'Notas', alias: ['notas', 'nota', 'comentarios', 'observaciones'] },
] as const

export type CampoId = (typeof CAMPOS)[number]['id']
export type Mapeo = Partial<Record<CampoId, string>>

export interface FilaImportacion {
  empresa: string
  rubro?: string
  tamano?: Tamano
  web?: string
  contacto?: string
  cargo?: string
  email?: string
  whatsapp?: string
  es_decisor?: boolean
  dolor?: string
  notas?: string
}

export interface FilaRevisada {
  fila: FilaImportacion
  avisos: string[]
  valida: boolean
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Excel en Chile guarda los CSV en Windows-1252 y con punto y coma. Si la
// lectura en UTF-8 deja caracteres rotos, se relee en Windows-1252.
export async function leerCsv(archivo: File) {
  const bytes = await archivo.arrayBuffer()
  let texto = new TextDecoder('utf-8').decode(bytes)
  if (texto.includes('�')) texto = new TextDecoder('windows-1252').decode(bytes)
  const r = Papa.parse<Record<string, string>>(texto.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })
  return { columnas: r.meta.fields ?? [], filas: r.data }
}

export function mapeoAutomatico(columnas: string[]): Mapeo {
  const mapeo: Mapeo = {}
  for (const campo of CAMPOS) {
    const columna = columnas.find((c) => (campo.alias as readonly string[]).includes(normalizar(c)))
    if (columna) mapeo[campo.id] = columna
  }
  return mapeo
}

function normalizarTamano(valor: string): Tamano | undefined {
  const v = normalizar(valor)
  if (!v) return undefined
  if (['micro', 'pequena', 'mediana', 'grande'].includes(v)) return v as Tamano
  const n = Number(v.replace(/\D/g, ''))
  if (!n) return undefined
  if (n < 10) return 'micro'
  if (n < 50) return 'pequena'
  if (n < 200) return 'mediana'
  return 'grande'
}

export function revisarFilas(filas: Record<string, string>[], mapeo: Mapeo): FilaRevisada[] {
  return filas.map((original) => {
    const valor = (campo: CampoId) => (mapeo[campo] ? (original[mapeo[campo]] ?? '').trim() : '')
    const avisos: string[] = []
    const fila: FilaImportacion = { empresa: valor('empresa') }

    if (!fila.empresa) avisos.push('Sin empresa: no se importa')
    for (const campo of ['rubro', 'web', 'contacto', 'cargo', 'dolor', 'notas'] as const) {
      if (valor(campo)) fila[campo] = valor(campo)
    }

    const email = valor('email')
    if (email) {
      if (emailValido(email)) fila.email = email.toLowerCase()
      else avisos.push(`Email "${email}" no válido: se omite`)
    }

    const whatsapp = valor('whatsapp')
    if (whatsapp) {
      const normalizado = normalizarWhatsapp(whatsapp)
      if (normalizado) fila.whatsapp = normalizado
      else avisos.push(`WhatsApp "${whatsapp}" no válido: se omite`)
    }

    const tamano = valor('tamano')
    if (tamano) {
      fila.tamano = normalizarTamano(tamano)
      if (!fila.tamano) avisos.push(`Tamaño "${tamano}" no reconocido: se omite`)
    }

    fila.es_decisor = ['si', 'x', '1', 'true'].includes(normalizar(valor('es_decisor')))

    if (fila.empresa && !fila.contacto && (fila.email || fila.whatsapp)) {
      avisos.push('Tiene email o WhatsApp pero no nombre de contacto: el contacto no se crea')
    }

    return { fila, avisos, valida: Boolean(fila.empresa) }
  })
}

export function plantillaCsv(): Blob {
  const encabezado = CAMPOS.map((c) => c.id).join(';')
  const ejemplo = 'Ferretería Ejemplo;Ferretería;pequena;ferreteria.example;Ana Pérez;Dueña;ana@ferreteria.example;+56912345678;si;Cotizaciones por WhatsApp a mano;'
  return new Blob([`﻿${encabezado}\n${ejemplo}\n`], { type: 'text/csv;charset=utf-8' })
}
