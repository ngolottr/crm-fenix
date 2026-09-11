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
