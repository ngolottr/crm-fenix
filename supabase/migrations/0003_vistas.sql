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
