-- =============================================================================
-- Atlas · La página pública de cada área no muestra terapeutas de demostración
--
-- Los perfiles de demo (demo.registros, tabla 'usuarios_perfil') pueden tener área
-- asignada para que el tablero tenga datos por área, pero no deben aparecer en la web.
-- =============================================================================

create or replace function public.equipo_publico_area(p_area_id uuid)
returns table (id uuid, nombre text, apellido text, especialidad text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.nombre, p.apellido, p.especialidad
  from public.usuarios_perfil p
  where p.area_id = p_area_id and p.rol = 'terapeuta' and p.activo is true
    and not exists (select 1 from demo.registros r where r.tabla = 'usuarios_perfil' and r.id = p.id)
  order by p.apellido, p.nombre
$$;
