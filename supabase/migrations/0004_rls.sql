-- CRM Fénix IA Method · 0004 seguridad por filas (RLS)
-- Regla: solo ve y toca datos quien esté registrado y activo en "perfiles".
-- Una cuenta creada por un desconocido no ve nada. Igual hay que desactivar
-- el registro público en Supabase (Authentication → Sign In / Providers).

create function es_usuario_crm() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from perfiles where id = auth.uid() and activo) $$;

create function es_admin_crm() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from perfiles where id = auth.uid() and activo and rol = 'admin') $$;

alter table perfiles enable row level security;
create policy perfiles_lectura on perfiles
  for select to authenticated using (es_usuario_crm());
create policy perfiles_admin on perfiles
  for all to authenticated using (es_admin_crm()) with check (es_admin_crm());

do $$
declare
  t text;
begin
  foreach t in array array['servicios', 'empresas', 'contactos', 'oportunidades',
                           'interacciones', 'tareas', 'plantillas', 'historial_etapas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy crm_acceso on %I for all to authenticated
                    using (es_usuario_crm()) with check (es_usuario_crm())', t);
  end loop;
end $$;

-- Las funciones de escritura no quedan al alcance de visitantes anónimos.
revoke execute on function crear_oportunidad(uuid, uuid, uuid, text, numeric, numeric, integer, date, origen_lead, text, date) from public, anon;
revoke execute on function registrar_interaccion(uuid, tipo_interaccion, text, text, date, timestamptz) from public, anon;
revoke execute on function importar_prospectos(jsonb, text, date) from public, anon;
grant execute on function crear_oportunidad(uuid, uuid, uuid, text, numeric, numeric, integer, date, origen_lead, text, date) to authenticated;
grant execute on function registrar_interaccion(uuid, tipo_interaccion, text, text, date, timestamptz) to authenticated;
grant execute on function importar_prospectos(jsonb, text, date) to authenticated;
