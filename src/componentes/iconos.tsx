import type { SVGProps } from 'react'

function crearIcono(trazos: string[]) {
  return function Icono(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {trazos.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    )
  }
}

export const IconoHoy = crearIcono(['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'])
export const IconoTablero = crearIcono(['M4 4h4v16H4z', 'M10 4h4v10h-4z', 'M16 4h4v13h-4z'])
export const IconoPanel = crearIcono(['M4 20V11', 'M10 20V4', 'M16 20v-6', 'M2 20h20'])
export const IconoImportar = crearIcono(['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'])
export const IconoAjustes = crearIcono(['M4 6h10', 'M18 6h2', 'M4 12h4', 'M12 12h8', 'M4 18h12', 'M20 18h0', 'M16 4v4', 'M10 10v4', 'M18 16v4'])
export const IconoMas = crearIcono(['M12 5v14', 'M5 12h14'])
export const IconoWhatsapp = crearIcono(['M3 21l1.65-4.95A8.5 8.5 0 1 1 8.2 19.4L3 21Z', 'M9 10c.5 2 2 3.5 4 4l1.2-1.2 2 1-.5 1.7c-3.5.2-7-3.3-6.8-6.8l1.7-.5 1 2L9 10Z'])
export const IconoCorreo = crearIcono(['M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z', 'M3 7l9 6 9-6'])
export const IconoTelefono = crearIcono([
  'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z',
])
export const IconoAtras = crearIcono(['M15 18l-6-6 6-6'])
export const IconoAdelante = crearIcono(['M9 18l6-6-6-6'])
export const IconoSalir = crearIcono(['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'])
export const IconoCheck = crearIcono(['M5 12l5 5L20 7'])
