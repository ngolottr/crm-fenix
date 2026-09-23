-- CRM Fenix IA Method - TODO EL ESQUEMA EN UN SOLO ARCHIVO
-- Pegar completo en Supabase (SQL Editor) y apretar Run.
-- Orden: 0001 esquema, 0002 funciones, 0003 vistas, 0004 seguridad (RLS).
-- El archivo supabase/seed.sql va DESPUES, cuando ya exista tu usuario.

-- ---------- 0001_esquema.sql ----------
-- CRM Fénix IA Method · 0001 esquema
-- Montos en pesos chilenos, netos (sin IVA) y sin decimales.

-- El orden de las etapas importa: las vistas comparan con >= para saber
-- hasta dónde llegó una oportunidad. 'perdido' va siempre al final.
create type etapa_oportunidad as enum (
  'nuevo_prospecto', 'contactado', 'reunion_diagnostico', 'calificado',
  'propuesta_enviada', 'negociacion', 'ganado', 'implementacion', 'postventa',
  'perdido'
);

create type tipo_interaccion as enum ('llamada', 'reunion', 'whatsapp', 'email', 'linkedin');
create type estado_tarea     as enum ('pendiente', 'completada', 'cancelada');
create type tipo_cobro       as enum ('unico', 'mensual', 'unico_mas_mensual');
create type canal_plantilla  as enum ('whatsapp', 'email', 'linkedin');
create type tamano_empresa   as enum ('micro', 'pequena', 'mediana', 'grande');  -- 1-9 / 10-49 / 50-199 / 200+
create type origen_lead      as enum (
  'referido', 'linkedin', 'whatsapp', 'web', 'formulario', 'evento',
  'prospeccion_fria', 'contenido', 'importacion_csv', 'otro'
);

create table perfiles (
  id         uuid primary key references auth.users on delete cascade,
  nombre     text not null,
  rol        text not null default 'admin' check (rol in ('admin', 'vendedor')),
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table servicios (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  descripcion     text,
  precio_base     numeric(12,0) not null default 0 check (precio_base >= 0),
  tipo_cobro      tipo_cobro not null,
  activo          boolean not null default true,
  es_demo         boolean not null default false,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table empresas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  rubro           text,
  tamano          tamano_empresa,
  web             text,
  herramientas    text[] not null default '{}',   -- {'ERP','CRM','Planillas','WhatsApp',...}
  notas           text,
  es_demo         boolean not null default false,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);
create index empresas_nombre on empresas (lower(nombre));

create table contactos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  cargo           text,
  email           text,
  whatsapp        text check (whatsapp ~ '^\+[0-9]{8,15}$'),   -- +569XXXXXXXX, listo para wa.me
  empresa_id      uuid references empresas on delete set null,
  origen          origen_lead,
  es_decisor      boolean not null default false,
  es_demo         boolean not null default false,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);
create unique index contactos_email_unico on contactos (lower(email)) where email is not null;
create index contactos_empresa on contactos (empresa_id);

create table oportunidades (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references empresas on delete restrict,
  contacto_id            uuid references contactos on delete set null,
  servicio_id            uuid references servicios on delete set null,
  dolor_detectado        text,
  monto_setup            numeric(12,0) not null default 0 check (monto_setup >= 0),
  monto_mensual          numeric(12,0) not null default 0 check (monto_mensual >= 0),
  probabilidad           smallint not null default 10 check (probabilidad between 0 and 100),
  etapa                  etapa_oportunidad not null default 'nuevo_prospecto',
  orden                  double precision not null default 0,   -- posición dentro de la columna del kanban
  fecha_cierre_estimada  date,
  origen                 origen_lead,
  responsable            uuid not null default auth.uid() references perfiles,
  motivo_perdida         text,
  es_demo                boolean not null default false,
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  constraint perdida_exige_motivo
    check (etapa <> 'perdido' or length(trim(coalesce(motivo_perdida, ''))) > 0)
);
create index oportunidades_etapa on oportunidades (etapa, orden);
create index oportunidades_empresa on oportunidades (empresa_id);

create table interacciones (
  id                    uuid primary key default gen_random_uuid(),
  oportunidad_id        uuid not null references oportunidades on delete cascade,
  tipo                  tipo_interaccion not null,
  fecha                 timestamptz not null default now(),
  resumen               text not null,
  proxima_accion        text,
  fecha_proxima_accion  date,
  creado_por            uuid default auth.uid() references perfiles,
  es_demo               boolean not null default false,
  creado_en             timestamptz not null default now(),
  constraint proxima_accion_con_fecha
    check ((proxima_accion is null) = (fecha_proxima_accion is null))
);
create index interacciones_oportunidad on interacciones (oportunidad_id, fecha desc);

create table tareas (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  vence           date not null,
  estado          estado_tarea not null default 'pendiente',
  responsable     uuid not null default auth.uid() references perfiles,
  oportunidad_id  uuid references oportunidades on delete cascade,
  interaccion_id  uuid references interacciones on delete set null,   -- la interacción que la originó
  completada_en   timestamptz,
  es_demo         boolean not null default false,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);
create index tareas_estado_vence on tareas (estado, vence);
create index tareas_oportunidad on tareas (oportunidad_id);

create table plantillas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  canal           canal_plantilla not null,
  etapa           etapa_oportunidad,      -- null = sirve para cualquier etapa
  asunto          text,                   -- solo email
  cuerpo          text not null,          -- admite {nombre} {empresa} {servicio}
  es_demo         boolean not null default false,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- Cada cambio de etapa. Sin esto no se puede medir conversión entre etapas,
-- y es lo que dispara el webhook de salida en la Fase 2.
create table historial_etapas (
  id              bigint generated always as identity primary key,
  oportunidad_id  uuid not null references oportunidades on delete cascade,
  etapa_anterior  etapa_oportunidad,
  etapa_nueva     etapa_oportunidad not null,
  cambiado_por    uuid default auth.uid() references perfiles,
  cambiado_en     timestamptz not null default now()
);
create index historial_oportunidad on historial_etapas (oportunidad_id, cambiado_en);


-- ---------- 0002_funciones.sql ----------
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


-- ---------- 0003_vistas.sql ----------
-- CRM Fénix IA Method · 0003 vistas
-- Todas con security_invoker: respetan la seguridad por filas del usuario que consulta.

-- Una fila por oportunidad con todo lo que necesitan el kanban y la ficha.
create view v_oportunidades with (security_invoker = on) as
select
  o.id, o.empresa_id, o.contacto_id, o.servicio_id, o.dolor_detectado,
  o.monto_setup, o.monto_mensual, o.probabilidad, o.etapa, o.orden,
  o.fecha_cierre_estimada, o.origen, o.responsable, o.motivo_perdida,
  o.es_demo, o.creado_en, o.actualizado_en,
  e.nombre                                  as empresa_nombre,
  c.nombre                                  as contacto_nombre,
  c.cargo                                   as contacto_cargo,
  c.email                                   as contacto_email,
  c.whatsapp                                as contacto_whatsapp,
  s.nombre                                  as servicio_nombre,
  p.nombre                                  as responsable_nombre,
  (o.monto_setup + o.monto_mensual * 12)    as valor_anual,
  ui.ultima_interaccion,
  (hoy() - coalesce(ui.ultima_interaccion, o.creado_en)::date) as dias_sin_interaccion,
  pt.titulo                                 as proxima_accion,
  pt.vence                                  as fecha_proxima_accion
from oportunidades o
join empresas e       on e.id = o.empresa_id
left join contactos c on c.id = o.contacto_id
left join servicios s on s.id = o.servicio_id
left join perfiles p  on p.id = o.responsable
left join lateral (
  select max(i.fecha) as ultima_interaccion
  from interacciones i where i.oportunidad_id = o.id
) ui on true
left join lateral (
  select t.titulo, t.vence
  from tareas t
  where t.oportunidad_id = o.id and t.estado = 'pendiente'
  order by t.vence
  limit 1
) pt on true;

-- Acciones vencidas y del día. La app las ordena por valor.
create view v_hoy with (security_invoker = on) as
select
  t.id              as tarea_id,
  t.titulo,
  t.vence,
  t.responsable,
  (t.vence < hoy()) as vencida,
  (hoy() - t.vence) as dias_atraso,
  o.id              as oportunidad_id,
  o.etapa,
  o.empresa_nombre,
  o.contacto_nombre,
  o.contacto_whatsapp,
  o.contacto_email,
  o.servicio_nombre,
  coalesce(o.valor_anual, 0) as valor_anual
from tareas t
left join v_oportunidades o on o.id = t.oportunidad_id
where t.estado = 'pendiente' and t.vence <= hoy();

create view v_pipeline with (security_invoker = on) as
select
  etapa,
  count(*)::int                                                     as cantidad,
  sum(monto_setup)                                                  as total_setup,
  sum(monto_mensual)                                                as total_mensual,
  sum(monto_setup + monto_mensual * 12)                             as valor_anual,
  round(sum((monto_setup + monto_mensual * 12) * probabilidad / 100.0)) as valor_ponderado
from oportunidades
group by etapa;

-- Cuántas oportunidades llegaron al menos hasta cada etapa. Si una salta de
-- "Contactado" a "Propuesta enviada", cuenta también como que pasó por las
-- intermedias: lo que importa es hasta dónde llegó.
create view v_conversion with (security_invoker = on) as
with alcance as (
  select oportunidad_id, max(etapa_nueva) as maxima
  from historial_etapas
  where etapa_nueva <> 'perdido'
  group by oportunidad_id
)
select
  x.orden::int,
  x.etapa,
  count(a.oportunidad_id)::int as alcanzaron
from unnest(enum_range(null::etapa_oportunidad)) with ordinality as x(etapa, orden)
left join alcance a on a.maxima >= x.etapa
where x.etapa <> 'perdido'
group by x.orden, x.etapa;

create view v_ventas_mensuales with (security_invoker = on) as
with ganadas as (
  select
    o.monto_setup,
    o.monto_mensual,
    (select min(h.cambiado_en) from historial_etapas h
      where h.oportunidad_id = o.id
        and h.etapa_nueva in ('ganado', 'implementacion', 'postventa')) as ganada_en
  from oportunidades o
  where o.etapa in ('ganado', 'implementacion', 'postventa')
)
select
  date_trunc('month', ganada_en at time zone 'America/Santiago')::date as mes,
  count(*)::int        as cantidad,
  sum(monto_setup)     as total_setup,
  sum(monto_mensual)   as total_mensual
from ganadas
where ganada_en is not null
group by 1;

create view v_resumen with (security_invoker = on) as
select
  count(*) filter (where etapa < 'ganado')::int                                        as abiertas,
  coalesce(sum(monto_setup + monto_mensual * 12) filter (where etapa < 'ganado'), 0)   as pipeline_valor,
  count(*) filter (where etapa in ('ganado', 'implementacion', 'postventa'))::int      as ganadas,
  count(*) filter (where etapa = 'perdido')::int                                       as perdidas,
  coalesce(sum(monto_setup)   filter (where etapa in ('ganado', 'implementacion', 'postventa')), 0) as ventas_setup,
  coalesce(sum(monto_mensual) filter (where etapa in ('ganado', 'implementacion', 'postventa')), 0) as recurrente_mensual,
  count(distinct empresa_id)  filter (where etapa in ('ganado', 'implementacion', 'postventa'))::int as clientes_activos,
  round(100.0 * count(*) filter (where etapa in ('ganado', 'implementacion', 'postventa'))
        / nullif(count(*) filter (where etapa >= 'ganado'), 0), 1)                    as tasa_cierre
from oportunidades;

create view v_motivos_perdida with (security_invoker = on) as
select
  motivo_perdida                            as motivo,
  count(*)::int                             as cantidad,
  sum(monto_setup + monto_mensual * 12)     as valor_anual
from oportunidades
where etapa = 'perdido'
group by motivo_perdida;


-- ---------- 0004_rls.sql ----------
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


