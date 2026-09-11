-- CRM Fénix IA Method · 0002 funciones y triggers

-- Supabase corre en UTC. Pasadas las 20:00 en Chile, current_date ya es
-- mañana, y las tareas de mañana aparecerían como "de hoy". Toda fecha de
-- negocio se calcula con esta función.
create function hoy() returns date
language sql stable
as $$ select (now() at time zone 'America/Santiago')::date $$;

create function tocar_actualizado_en() returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger servicios_actualizado      before update on servicios      for each row execute function tocar_actualizado_en();
create trigger empresas_actualizado       before update on empresas       for each row execute function tocar_actualizado_en();
create trigger contactos_actualizado      before update on contactos      for each row execute function tocar_actualizado_en();
create trigger oportunidades_actualizado  before update on oportunidades  for each row execute function tocar_actualizado_en();
create trigger tareas_actualizado         before update on tareas         for each row execute function tocar_actualizado_en();
create trigger plantillas_actualizado     before update on plantillas     for each row execute function tocar_actualizado_en();

create function registrar_cambio_etapa() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.etapa is distinct from old.etapa then
    insert into historial_etapas (oportunidad_id, etapa_anterior, etapa_nueva)
    values (new.id, case when tg_op = 'UPDATE' then old.etapa end, new.etapa);
  end if;

  -- Una oportunidad perdida no tiene seguimiento: sus pendientes se cancelan
  -- para que no ensucien la vista "Hoy".
  if new.etapa = 'perdido' and (tg_op = 'INSERT' or old.etapa <> 'perdido') then
    update tareas set estado = 'cancelada'
     where oportunidad_id = new.id and estado = 'pendiente';
  end if;
  return null;
end $$;

create trigger oportunidades_etapa
  after insert or update of etapa on oportunidades
  for each row execute function registrar_cambio_etapa();

-- Crear una oportunidad exige su primera próxima acción: nace con seguimiento.
create function crear_oportunidad(
  p_empresa_id            uuid,
  p_contacto_id           uuid,
  p_servicio_id           uuid,
  p_dolor_detectado       text,
  p_monto_setup           numeric,
  p_monto_mensual         numeric,
  p_probabilidad          integer,
  p_fecha_cierre_estimada date,
  p_origen                origen_lead,
  p_proxima_accion        text,
  p_fecha_proxima_accion  date
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_proxima_accion), '') = '' or p_fecha_proxima_accion is null then
    raise exception 'Toda oportunidad nueva necesita una próxima acción con fecha';
  end if;

  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado,
                             monto_setup, monto_mensual, probabilidad,
                             fecha_cierre_estimada, origen)
  values (p_empresa_id, p_contacto_id, p_servicio_id, nullif(trim(p_dolor_detectado), ''),
          coalesce(p_monto_setup, 0), coalesce(p_monto_mensual, 0), coalesce(p_probabilidad, 10),
          p_fecha_cierre_estimada, p_origen)
  returning id into v_id;

  insert into tareas (titulo, vence, oportunidad_id)
  values (trim(p_proxima_accion), p_fecha_proxima_accion, v_id);

  return v_id;
end $$;

-- Único camino para registrar una interacción desde la app. La regla
-- "ninguna oportunidad sin seguimiento" vive acá y no en la pantalla, así se
-- cumple aunque el dato entre por otro lado.
create function registrar_interaccion(
  p_oportunidad     uuid,
  p_tipo            tipo_interaccion,
  p_resumen         text,
  p_proxima_accion  text,
  p_fecha_proxima   date,
  p_fecha           timestamptz default now()
) returns uuid
language plpgsql
as $$
declare
  v_op oportunidades;
  v_id uuid;
begin
  select * into strict v_op from oportunidades where id = p_oportunidad;

  if coalesce(trim(p_resumen), '') = '' then
    raise exception 'La interacción necesita un resumen';
  end if;
  if v_op.etapa <> 'perdido'
     and (coalesce(trim(p_proxima_accion), '') = '' or p_fecha_proxima is null) then
    raise exception 'Una oportunidad activa necesita una próxima acción con fecha';
  end if;

  insert into interacciones (oportunidad_id, tipo, fecha, resumen, proxima_accion, fecha_proxima_accion)
  values (p_oportunidad, p_tipo, coalesce(p_fecha, now()), trim(p_resumen),
          nullif(trim(p_proxima_accion), ''),
          case when nullif(trim(p_proxima_accion), '') is null then null else p_fecha_proxima end)
  returning id into v_id;

  -- La próxima acción anterior queda hecha: esta interacción es su respuesta.
  update tareas set estado = 'completada', completada_en = now()
   where oportunidad_id = p_oportunidad and estado = 'pendiente' and id not in (
     select id from tareas where interaccion_id = v_id);

  if nullif(trim(p_proxima_accion), '') is not null then
    insert into tareas (titulo, vence, responsable, oportunidad_id, interaccion_id)
    values (trim(p_proxima_accion), p_fecha_proxima, v_op.responsable, p_oportunidad, v_id);
  end if;

  return v_id;
end $$;

-- Importación desde CSV en una sola transacción: o entra todo o no entra nada.
-- p_filas: [{empresa, rubro, tamano, web, notas, contacto, cargo, email, whatsapp, es_decisor, dolor}]
-- La app ya manda las filas validadas y normalizadas (whatsapp +56..., tamano válido).
create function importar_prospectos(
  p_filas           jsonb,
  p_proxima_accion  text,
  p_fecha_proxima   date
) returns jsonb
language plpgsql
as $$
declare
  f           jsonb;
  v_empresa   uuid;
  v_contacto  uuid;
  v_op        uuid;
  v_email     text;
  v_wsp       text;
  n_empresas  int := 0;
  n_contactos int := 0;
  n_ops       int := 0;
  n_omitidas  int := 0;
begin
  if coalesce(trim(p_proxima_accion), '') = '' or p_fecha_proxima is null then
    raise exception 'La importación necesita una próxima acción con fecha para todos los prospectos';
  end if;

  for f in select value from jsonb_array_elements(p_filas) loop
    if coalesce(trim(f->>'empresa'), '') = '' then
      n_omitidas := n_omitidas + 1;
      continue;
    end if;

    select id into v_empresa from empresas
     where lower(nombre) = lower(trim(f->>'empresa')) limit 1;
    if v_empresa is null then
      insert into empresas (nombre, rubro, tamano, web, notas)
      values (trim(f->>'empresa'), nullif(trim(f->>'rubro'), ''),
              nullif(trim(f->>'tamano'), '')::tamano_empresa,
              nullif(trim(f->>'web'), ''), nullif(trim(f->>'notas'), ''))
      returning id into v_empresa;
      n_empresas := n_empresas + 1;
    end if;

    v_contacto := null;
    v_email := nullif(lower(trim(f->>'email')), '');
    v_wsp   := nullif(trim(f->>'whatsapp'), '');
    if coalesce(trim(f->>'contacto'), '') <> '' then
      select id into v_contacto from contactos
       where (v_email is not null and lower(email) = v_email)
          or (v_wsp is not null and whatsapp = v_wsp)
       limit 1;
      if v_contacto is null then
        insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor)
        values (trim(f->>'contacto'), nullif(trim(f->>'cargo'), ''), v_email, v_wsp,
                v_empresa, 'importacion_csv', coalesce((f->>'es_decisor')::boolean, false))
        returning id into v_contacto;
        n_contactos := n_contactos + 1;
      end if;
    end if;

    -- Si la empresa ya tiene una oportunidad abierta no se duplica.
    if exists (select 1 from oportunidades where empresa_id = v_empresa and etapa < 'ganado') then
      n_omitidas := n_omitidas + 1;
      continue;
    end if;

    insert into oportunidades (empresa_id, contacto_id, dolor_detectado, origen)
    values (v_empresa, v_contacto, nullif(trim(f->>'dolor'), ''), 'importacion_csv')
    returning id into v_op;

    insert into tareas (titulo, vence, oportunidad_id)
    values (trim(p_proxima_accion), p_fecha_proxima, v_op);
    n_ops := n_ops + 1;
  end loop;

  return jsonb_build_object('empresas', n_empresas, 'contactos', n_contactos,
                            'oportunidades', n_ops, 'omitidas', n_omitidas);
end $$;
