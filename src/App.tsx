import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './componentes/Layout'
import { ProveedorSesion } from './lib/sesion'
import Ajustes from './modulos/ajustes/Ajustes'
import Login from './modulos/auth/Login'
import RutaProtegida from './modulos/auth/RutaProtegida'
import Dashboard from './modulos/dashboard/Dashboard'
import VistaHoy from './modulos/hoy/VistaHoy'
import ImportarCsv from './modulos/importar/ImportarCsv'
import Tablero from './modulos/kanban/Tablero'
import Ficha from './modulos/oportunidades/Ficha'

export default function App() {
  return (
    <ProveedorSesion>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route index element={<VistaHoy />} />
            <Route path="tablero" element={<Tablero />} />
            <Route path="oportunidades/:id" element={<Ficha />} />
            <Route path="panel" element={<Dashboard />} />
            <Route path="importar" element={<ImportarCsv />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProveedorSesion>
  )
}
