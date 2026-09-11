# CRM · Fénix IA Method

CRM propio para ventas B2B de soluciones tecnológicas, automatización con IA e
integraciones. Una sola regla lo organiza todo: **ninguna oportunidad sin
seguimiento**. Toda oportunidad activa tiene una próxima acción con fecha y
responsable, y la base de datos no deja guardarla de otra forma.

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (Postgres, Auth, RLS).
Se despliega como sitio estático (Cloudflare Pages o Vercel).

## Fase 1 — MVP

| Qué | Dónde |
|---|---|
| Login y datos protegidos con RLS | `supabase/migrations/0004_rls.sql`, `src/modulos/auth` |
| Kanban con arrastre y total por columna | `src/modulos/kanban` |
| Ficha: datos, línea de tiempo, tareas, registrar interacción | `src/modulos/oportunidades` |
| Vista Hoy: vencidas y del día, ordenadas por monto | `src/modulos/hoy` |
| Alerta de oportunidades sin interacción hace más de 7 días | `src/modulos/hoy` (`DIAS_ALERTA` en `src/tipos/dominio.ts`) |
| Contacto en 1 clic: WhatsApp con plantilla, email, llamada | `src/modulos/oportunidades/BotonesContacto.tsx` |
| Importación de prospectos desde CSV | `src/modulos/importar` |
| Panel: pipeline, conversión, cierre, ventas, clientes, pérdidas | `src/modulos/dashboard` |

## Base de datos

Las migraciones se corren en orden en el **SQL Editor** de Supabase:

1. `supabase/migrations/0001_esquema.sql` — tablas, tipos y restricciones
2. `supabase/migrations/0002_funciones.sql` — triggers y funciones (`registrar_interaccion`, `crear_oportunidad`, `importar_prospectos`)
3. `supabase/migrations/0003_vistas.sql` — vistas para Hoy, tablero y panel
4. `supabase/migrations/0004_rls.sql` — seguridad por filas

Después de crear tu usuario en **Authentication → Users**, corre `supabase/seed.sql`:
te registra como administrador y carga datos DEMO. Para sacarlos: `supabase/borrar_demo.sql`.

Reglas que viven en la base, no en la pantalla:

- Registrar una interacción en una oportunidad activa **exige** próxima acción y fecha, crea la tarea y cierra la anterior.
- Crear una oportunidad exige su primera próxima acción.
- Marcar perdida exige motivo y cancela las tareas pendientes.
- Cada cambio de etapa queda en `historial_etapas` (de ahí sale la conversión).
- Las fechas de negocio usan la hora de Chile (`hoy()`), no UTC.
- Solo ve datos quien está activo en `perfiles`.

## Correr en local

```bash
npm install
cp .env.example .env.local   # y completar con la URL y la anon key de Supabase
npm run dev
```

## Desplegar

- **Cloudflare Pages:** comando de build `npm run build`, carpeta `dist`, variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. `public/_redirects` ya resuelve las rutas.
- **Vercel:** lo mismo; `vercel.json` resuelve las rutas. El plan gratuito de Vercel es solo para uso no comercial.
