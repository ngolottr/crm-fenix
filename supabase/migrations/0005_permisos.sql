-- CRM Fénix IA Method · 0005 permisos de rol
--
-- La seguridad por filas decide QUÉ filas ve cada usuario, pero antes de eso
-- Postgres exige un permiso más básico: que el rol pueda tocar la tabla. En
-- este proyecto las tablas quedaron sin ese permiso, así que la API responde
-- "permission denied for table servicios" incluso con una clave válida.
--
-- Acá se otorga lo mínimo:
--   authenticated  → puede leer y escribir; qué filas, lo decide la RLS.
--   anon           → no recibe nada. Sin sesión no se toca el CRM.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Las vistas del tablero y del panel se leen con los permisos de quien
-- consulta (security_invoker), así que también necesitan su grant.
grant select on
  v_oportunidades, v_hoy, v_pipeline, v_conversion,
  v_ventas_mensuales, v_resumen, v_motivos_perdida
to authenticated;

-- Lo que se cree de aquí en adelante nace con los mismos permisos, para no
-- volver a toparse con esto al agregar una tabla.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- Y una comprobación explícita: el visitante anónimo no tiene nada que hacer
-- acá. Si alguna vez se agrega una tabla pública, se le otorga a mano.
revoke all on all tables in schema public from anon;
