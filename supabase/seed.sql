-- CRM Fénix IA Method · datos DEMO
-- Correr DESPUÉS de crear tu usuario en Authentication → Users.
-- Todo lo que se crea acá lleva es_demo = true y "[DEMO]" en el nombre.
-- Empresas, personas, correos y teléfonos son ficticios. Para borrarlo: borrar_demo.sql

-- Tu perfil de administrador (el primer usuario creado en Supabase).
insert into perfiles (id, nombre, rol)
select id, 'Nicolás', 'admin' from auth.users order by created_at limit 1
on conflict (id) do nothing;

do $$
declare
  r   uuid := (select id from perfiles where rol = 'admin' order by creado_en limit 1);
  d   date := hoy();
  s_diag uuid; s_wsp uuid; s_int uuid; s_sop uuid; s_agente uuid;
  e uuid; c uuid; o uuid;
begin
  if r is null then
    raise exception 'Primero crea tu usuario en Authentication → Users y vuelve a correr este archivo';
  end if;

  -- ---------------------------------------------------------------- servicios
  insert into servicios (nombre, descripcion, precio_base, tipo_cobro, es_demo) values
    ('[DEMO] Diagnóstico de procesos con IA', 'Reunión y levantamiento de dónde se pierde tiempo, con propuesta de qué automatizar primero.', 150000, 'unico', true)
    returning id into s_diag;
  insert into servicios (nombre, descripcion, precio_base, tipo_cobro, es_demo) values
    ('[DEMO] Automatización de WhatsApp y seguimiento', 'Respuestas, recordatorios y registro de clientes desde WhatsApp.', 450000, 'unico_mas_mensual', true)
    returning id into s_wsp;
  insert into servicios (nombre, descripcion, precio_base, tipo_cobro, es_demo) values
    ('[DEMO] Integración de sistemas', 'Conectar ERP, CRM y planillas para eliminar la doble digitación.', 900000, 'unico', true)
    returning id into s_int;
  insert into servicios (nombre, descripcion, precio_base, tipo_cobro, es_demo) values
    ('[DEMO] Soporte y mejora continua', 'Mantención mensual de las automatizaciones y ajustes.', 90000, 'mensual', true)
    returning id into s_sop;
  insert into servicios (nombre, descripcion, precio_base, tipo_cobro, es_demo) values
    ('[DEMO] Agente IA de atención', 'Asistente que responde preguntas frecuentes y agenda.', 600000, 'unico_mas_mensual', true)
    returning id into s_agente;

  -- ---------------------------------------------------------------- 1 · Nuevo prospecto, tarea hoy
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Ferretería Los Andes', 'Ferretería', 'pequena', '{Planillas,WhatsApp}', true) returning id into e;
  insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor, es_demo) values
    ('Carolina Muñoz', 'Dueña', 'carolina@ferreteria-andes.example', '+56900000001', e, 'prospeccion_fria', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_setup, monto_mensual, probabilidad, etapa, orden, origen, responsable, es_demo, creado_en)
    values (e, c, s_wsp, 'Responden cotizaciones por WhatsApp a mano y se les pierden conversaciones.', 450000, 60000, 10, 'nuevo_prospecto', 1, 'prospeccion_fria', r, true, now() - interval '1 day') returning id into o;
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Primer mensaje por WhatsApp', d, r, o, true);

  -- ---------------------------------------------------------------- 2 · Nuevo prospecto abandonado (sin interacción hace 9 días)
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Colegio Los Aromos', 'Educación', 'mediana', '{ERP,Planillas}', true) returning id into e;
  insert into contactos (nombre, cargo, email, empresa_id, origen, es_decisor, es_demo) values
    ('Ana Morales', 'Directora', 'ana.morales@colegio-aromos.example', e, 'evento', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_setup, probabilidad, etapa, orden, origen, responsable, es_demo, creado_en)
    values (e, c, s_int, 'Matrículas y cobranza en planillas separadas del ERP.', 900000, 10, 'nuevo_prospecto', 2, 'evento', r, true, now() - interval '9 days') returning id into o;
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Llamar para presentar Fénix', d - 2, r, o, true);

  -- ---------------------------------------------------------------- 3 · Contactado, tarea vencida ayer
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Clínica Dental Sonrisa Sur', 'Salud', 'pequena', '{WhatsApp,Planillas}', true) returning id into e;
  insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor, es_demo) values
    ('Andrés Rojas', 'Administrador', 'andres@sonrisasur.example', '+56900000002', e, 'linkedin', false, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_setup, monto_mensual, probabilidad, etapa, orden, origen, responsable, es_demo, creado_en)
    values (e, c, s_agente, 'Pacientes no confirman sus horas y quedan bloques vacíos.', 600000, 80000, 20, 'contactado', 1, 'linkedin', r, true, now() - interval '8 days') returning id into o;
  insert into interacciones (oportunidad_id, tipo, fecha, resumen, proxima_accion, fecha_proxima_accion, creado_por, es_demo)
    values (o, 'whatsapp', now() - interval '3 days', 'Respondió interesado. Pidió que lo llamara esta semana.', 'Llamar para agendar diagnóstico', d - 1, r, true);
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Llamar para agendar diagnóstico', d - 1, r, o, true);

  -- ---------------------------------------------------------------- 4 · Reunión de diagnóstico
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Transportes Cordillera', 'Logística', 'mediana', '{ERP,Planillas,WhatsApp}', true) returning id into e;
  insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor, es_demo) values
    ('Paula Fuentes', 'Jefa de Operaciones', 'paula@tcordillera.example', '+56900000003', e, 'referido', false, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_setup, probabilidad, etapa, orden, fecha_cierre_estimada, origen, responsable, es_demo, creado_en)
    values (e, c, s_int, 'Cuadran guías de despacho entre el ERP y planillas a mano todos los días.', 900000, 35, 'reunion_diagnostico', 1, d + 30, 'referido', r, true, now() - interval '12 days') returning id into o;
  insert into interacciones (oportunidad_id, tipo, fecha, resumen, proxima_accion, fecha_proxima_accion, creado_por, es_demo)
    values (o, 'reunion', now() - interval '2 days', 'Diagnóstico por Zoom. Dos personas pierden cerca de una hora diaria cuadrando guías.', 'Enviar resumen del diagnóstico', d + 1, r, true);
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Enviar resumen del diagnóstico', d + 1, r, o, true);

  -- ---------------------------------------------------------------- 5 · Calificado, abandonado 10 días y tarea vencida
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Constructora Valle Central', 'Construcción', 'mediana', '{ERP,CRM,Planillas}', true) returning id into e;
  insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor, es_demo) values
    ('Rodrigo Pérez', 'Gerente General', 'rperez@vallecentral.example', '+56900000004', e, 'evento', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_setup, monto_mensual, probabilidad, etapa, orden, fecha_cierre_estimada, origen, responsable, es_demo, creado_en)
    values (e, c, s_int, 'Estados de pago de obras armados a mano desde tres sistemas.', 1200000, 90000, 50, 'calificado', 1, d + 20, 'evento', r, true, now() - interval '25 days') returning id into o;
  insert into interacciones (oportunidad_id, tipo, fecha, resumen, proxima_accion, fecha_proxima_accion, creado_por, es_demo)
    values (o, 'llamada', now() - interval '10 days', 'Confirmó presupuesto y que decide él. Quiere ver alcance por escrito.', 'Enviar borrador de alcance', d - 3, r, true);
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Enviar borrador de alcance', d - 3, r, o, true);

  -- ---------------------------------------------------------------- 6 · Propuesta enviada, tarea hoy
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Inmobiliaria Plaza Oriente', 'Inmobiliaria', 'pequena', '{CRM,WhatsApp}', true) returning id into e;
  insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor, es_demo) values
    ('Javiera Soto', 'Socia', 'javiera@plazaoriente.example', '+56900000005', e, 'web', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_setup, monto_mensual, probabilidad, etapa, orden, fecha_cierre_estimada, origen, responsable, es_demo, creado_en)
    values (e, c, s_agente, 'Consultas de arriendo fuera de horario que nadie responde.', 600000, 80000, 60, 'propuesta_enviada', 1, d + 10, 'web', r, true, now() - interval '18 days') returning id into o;
  insert into interacciones (oportunidad_id, tipo, fecha, resumen, proxima_accion, fecha_proxima_accion, creado_por, es_demo)
    values (o, 'email', now() - interval '4 days', 'Propuesta enviada por correo con dos alternativas de alcance.', 'Seguimiento de propuesta', d, r, true);
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Seguimiento de propuesta', d, r, o, true);

  -- ---------------------------------------------------------------- 7 · Negociación
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Distribuidora Pacífico', 'Distribución', 'grande', '{ERP,CRM,Planillas,WhatsApp}', true) returning id into e;
  insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor, es_demo) values
    ('Felipe Araya', 'Gerente Comercial', 'faraya@dpacifico.example', '+56900000006', e, 'referido', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_setup, monto_mensual, probabilidad, etapa, orden, fecha_cierre_estimada, origen, responsable, es_demo, creado_en)
    values (e, c, s_int, 'Pedidos de vendedores en terreno llegan por WhatsApp y se digitan dos veces.', 1800000, 150000, 75, 'negociacion', 1, d + 7, 'referido', r, true, now() - interval '30 days') returning id into o;
  insert into interacciones (oportunidad_id, tipo, fecha, resumen, proxima_accion, fecha_proxima_accion, creado_por, es_demo)
    values (o, 'reunion', now() - interval '1 day', 'Pidió pagar la implementación en dos cuotas.', 'Enviar propuesta ajustada en dos cuotas', d + 2, r, true);
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Enviar propuesta ajustada en dos cuotas', d + 2, r, o, true);

  -- ---------------------------------------------------------------- 8 · Ganado este mes
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Estudio Contable Andes', 'Contabilidad', 'micro', '{Planillas}', true) returning id into e;
  insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor, es_demo) values
    ('Marcela Díaz', 'Contadora', 'marcela@contableandes.example', '+56900000007', e, 'contenido', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_setup, probabilidad, etapa, orden, origen, responsable, es_demo, creado_en)
    values (e, c, s_diag, 'No sabe por dónde empezar a automatizar.', 150000, 100, 'ganado', 1, 'contenido', r, true, now() - interval '15 days') returning id into o;
  insert into interacciones (oportunidad_id, tipo, fecha, resumen, proxima_accion, fecha_proxima_accion, creado_por, es_demo)
    values (o, 'whatsapp', now() - interval '6 days', 'Aceptó y pagó el diagnóstico.', 'Agendar reunión de inicio', d + 5, r, true);
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Agendar reunión de inicio', d + 5, r, o, true);
  update historial_etapas set cambiado_en = now() - interval '6 days' where oportunidad_id = o;

  -- ---------------------------------------------------------------- 9 · Implementación (ganado el mes pasado)
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Gimnasio Fuerza Norte', 'Deporte', 'pequena', '{WhatsApp,Planillas}', true) returning id into e;
  insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor, es_demo) values
    ('Tomás Vega', 'Dueño', 'tomas@fuerzanorte.example', '+56900000008', e, 'whatsapp', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_setup, monto_mensual, probabilidad, etapa, orden, origen, responsable, es_demo, creado_en)
    values (e, c, s_wsp, 'Renovaciones de planes que se olvidan de cobrar.', 450000, 60000, 100, 'implementacion', 1, 'whatsapp', r, true, now() - interval '50 days') returning id into o;
  insert into interacciones (oportunidad_id, tipo, fecha, resumen, proxima_accion, fecha_proxima_accion, creado_por, es_demo)
    values (o, 'reunion', now() - interval '2 days', 'Revisamos el flujo de recordatorios. Falta cargar la base de socios.', 'Revisión semanal de avance', d, r, true);
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Revisión semanal de avance', d, r, o, true);
  update historial_etapas set cambiado_en = now() - interval '35 days' where oportunidad_id = o;

  -- ---------------------------------------------------------------- 10 · Postventa (ganado hace dos meses)
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Veterinaria Patitas', 'Veterinaria', 'micro', '{WhatsApp}', true) returning id into e;
  insert into contactos (nombre, cargo, email, whatsapp, empresa_id, origen, es_decisor, es_demo) values
    ('Daniela Castro', 'Dueña', 'daniela@patitas.example', '+56900000009', e, 'referido', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, dolor_detectado, monto_mensual, probabilidad, etapa, orden, origen, responsable, es_demo, creado_en)
    values (e, c, s_sop, 'Necesita que alguien mantenga lo que ya se automatizó.', 90000, 100, 'postventa', 1, 'referido', r, true, now() - interval '80 days') returning id into o;
  insert into interacciones (oportunidad_id, tipo, fecha, resumen, proxima_accion, fecha_proxima_accion, creado_por, es_demo)
    values (o, 'llamada', now() - interval '12 days', 'Todo funcionando. Preguntó por agregar recordatorios de vacunas.', 'Llamada de satisfacción mensual', d + 7, r, true);
  insert into tareas (titulo, vence, responsable, oportunidad_id, es_demo) values ('Llamada de satisfacción mensual', d + 7, r, o, true);
  update historial_etapas set cambiado_en = now() - interval '60 days' where oportunidad_id = o;

  -- ---------------------------------------------------------------- 11 y 12 · Perdidos
  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Restaurante Fogón Criollo', 'Gastronomía', 'micro', '{WhatsApp}', true) returning id into e;
  insert into contactos (nombre, cargo, email, empresa_id, origen, es_decisor, es_demo) values
    ('Luis Herrera', 'Dueño', 'luis@fogoncriollo.example', e, 'prospeccion_fria', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, monto_setup, monto_mensual, probabilidad, etapa, orden, origen, responsable, motivo_perdida, es_demo, creado_en)
    values (e, c, s_wsp, 450000, 60000, 0, 'perdido', 1, 'prospeccion_fria', r, 'Sin presupuesto', true, now() - interval '40 days');

  insert into empresas (nombre, rubro, tamano, herramientas, es_demo) values
    ('[DEMO] Taller Mecánico Ruta 5', 'Automotriz', 'micro', '{Planillas}', true) returning id into e;
  insert into contactos (nombre, cargo, empresa_id, origen, es_decisor, es_demo) values
    ('Jorge Silva', 'Dueño', e, 'otro', true, true) returning id into c;
  insert into oportunidades (empresa_id, contacto_id, servicio_id, monto_setup, probabilidad, etapa, orden, origen, responsable, motivo_perdida, es_demo, creado_en)
    values (e, c, s_diag, 150000, 0, 'perdido', 2, 'otro', r, 'Eligió otra solución', true, now() - interval '20 days');

  -- ---------------------------------------------------------------- plantillas
  insert into plantillas (nombre, canal, etapa, asunto, cuerpo, es_demo) values
    ('[DEMO] Primer contacto', 'whatsapp', 'nuevo_prospecto', null,
     'Hola {nombre}, soy Nicolás de Fénix IA Method. Ayudo a empresas como {empresa} a ahorrar tiempo automatizando tareas repetitivas con IA. ¿Te hace sentido conversar 20 minutos esta semana?', true),
    ('[DEMO] Agendar diagnóstico', 'whatsapp', 'contactado', null,
     'Hola {nombre}, gracias por responder. ¿Qué día te acomoda para una reunión de diagnóstico? Son 30 minutos y la idea es entender dónde se le va el tiempo al equipo de {empresa}.', true),
    ('[DEMO] Resumen del diagnóstico', 'email', 'reunion_diagnostico', 'Resumen de nuestra conversación — {empresa}',
     E'Hola {nombre}:\n\nGracias por el tiempo de hoy. Te dejo por escrito lo que conversamos y los próximos pasos que acordamos.\n\nQuedo atento,\nNicolás\nFénix IA Method', true),
    ('[DEMO] Propuesta enviada', 'email', 'propuesta_enviada', 'Propuesta de {servicio} para {empresa}',
     E'Hola {nombre}:\n\nTe adjunto la propuesta de {servicio}. Cualquier duda la vemos en una llamada corta.\n\nSaludos,\nNicolás\nFénix IA Method', true),
    ('[DEMO] Seguimiento de propuesta', 'whatsapp', 'propuesta_enviada', null,
     'Hola {nombre}, ¿alcanzaste a revisar la propuesta de {servicio}? Si quieres la vemos juntos en 15 minutos.', true),
    ('[DEMO] Postventa', 'whatsapp', 'postventa', null,
     'Hola {nombre}, ¿cómo ha funcionado todo en {empresa} este mes? Si hay algo que ajustar, lo vemos.', true);
end $$;
