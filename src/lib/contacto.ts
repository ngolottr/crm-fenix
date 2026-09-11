// Deja un número en formato +569XXXXXXXX. Acepta cómo lo escribe la gente en
// Chile: "9 1234 5678", "+56 9 1234 5678", "56912345678", "12345678".
export function normalizarWhatsapp(entrada: string): string | null {
  let n = entrada.replace(/\D/g, '')
  if (!n) return null
  if (n.startsWith('00')) n = n.slice(2)
  if (n.length === 8) n = `569${n}`
  else if (n.length === 9 && n.startsWith('9')) n = `56${n}`
  if (n.length < 8 || n.length > 15) return null
  return `+${n}`
}

export const enlaceWhatsapp = (numero: string, texto?: string) =>
  `https://wa.me/${numero.replace(/\D/g, '')}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`

export function enlaceEmail(email: string, asunto?: string, cuerpo?: string): string {
  const partes = [
    asunto ? `subject=${encodeURIComponent(asunto)}` : '',
    cuerpo ? `body=${encodeURIComponent(cuerpo)}` : '',
  ].filter(Boolean)
  return `mailto:${email}${partes.length ? `?${partes.join('&')}` : ''}`
}

export const enlaceLlamada = (numero: string) => `tel:${numero}`

export const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
