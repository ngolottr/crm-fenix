-- Borra todos los datos DEMO. No toca nada que hayas creado tú.
-- Las oportunidades van primero: al borrarlas se van también sus
-- interacciones, tareas e historial.
delete from oportunidades where es_demo;
delete from tareas        where es_demo;
delete from interacciones where es_demo;
delete from contactos     where es_demo;
delete from empresas      where es_demo and id not in (select empresa_id from oportunidades);
delete from servicios     where es_demo;
delete from plantillas    where es_demo;
