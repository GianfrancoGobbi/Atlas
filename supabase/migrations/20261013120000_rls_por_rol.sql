-- =============================================================================
-- Atlas · Seguridad por rol (RLS)
--
-- Roles en usuarios_perfil.rol: paciente | terapeuta | admin | super_admin
-- (admin y super_admin se tratan igual: administración).
--
-- Activa RLS en las tablas que no lo tenían. No toca las que ya lo tenían
-- (arca_config, arca_tokens, audit_log, paciente_obras_sociales, user_activity).
-- Requisito previo (ya aplicado a mano el 2026-10-13): revoke all ... from anon,
-- salvo select en areas.
-- =============================================================================

-- ---------- Helpers (schema privado: no se exponen por la API REST) ----------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.mi_rol() returns text
language sql stable security definer set search_path = ''
as $$ select rol from public.usuarios_perfil where id = (select auth.uid()) $$;

create or replace function private.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(private.mi_rol() in ('admin', 'super_admin'), false) $$;

create or replace function private.es_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(private.mi_rol() in ('terapeuta', 'admin', 'super_admin'), false) $$;

revoke all on function private.mi_rol(), private.es_admin(), private.es_staff() from public;
grant execute on function private.mi_rol(), private.es_admin(), private.es_staff() to authenticated;

-- ---------- areas: catálogo público; solo administración lo edita ----------
alter table public.areas enable row level security;
drop policy if exists areas_select on public.areas;
create policy areas_select on public.areas for select to anon, authenticated using (true);
drop policy if exists areas_admin_write on public.areas;
create policy areas_admin_write on public.areas for all to authenticated
  using (private.es_admin()) with check (private.es_admin());

-- ---------- usuarios_perfil ----------
-- Cada uno ve su perfil, el staff ve todos y los pacientes ven los perfiles del
-- staff (p. ej., el nombre del terapeuta de su turno). Sin política de INSERT:
-- los perfiles los crea el trigger handle_new_user.
alter table public.usuarios_perfil enable row level security;
drop policy if exists perfil_select on public.usuarios_perfil;
create policy perfil_select on public.usuarios_perfil for select to authenticated
  using (id = (select auth.uid()) or private.es_staff() or rol in ('terapeuta', 'admin', 'super_admin'));
drop policy if exists perfil_update on public.usuarios_perfil;
create policy perfil_update on public.usuarios_perfil for update to authenticated
  using (id = (select auth.uid()) or private.es_admin())
  with check (id = (select auth.uid()) or private.es_admin());
drop policy if exists perfil_admin_delete on public.usuarios_perfil;
create policy perfil_admin_delete on public.usuarios_perfil for delete to authenticated
  using (private.es_admin());

-- Solo administración puede cambiar el rol, el estado o el id de un perfil.
-- (Las operaciones sin usuario, como el SQL Editor o la service role, no se frenan.)
create or replace function private.proteger_campos_perfil() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and not private.es_admin()
     and (new.rol is distinct from old.rol
          or new.activo is distinct from old.activo
          or new.id is distinct from old.id) then
    raise exception 'Solo un administrador puede cambiar el rol o el estado de un usuario'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists proteger_campos_perfil on public.usuarios_perfil;
create trigger proteger_campos_perfil before update on public.usuarios_perfil
  for each row execute function private.proteger_campos_perfil();

-- ---------- turnos: paciente ve los suyos; terapeuta gestiona los suyos ----------
alter table public.turnos enable row level security;
drop policy if exists turnos_select on public.turnos;
create policy turnos_select on public.turnos for select to authenticated
  using (paciente_id = (select auth.uid()) or terapeuta_id = (select auth.uid()) or private.es_admin());
drop policy if exists turnos_insert on public.turnos;
create policy turnos_insert on public.turnos for insert to authenticated
  with check ((terapeuta_id = (select auth.uid()) and private.es_staff()) or private.es_admin());
drop policy if exists turnos_update on public.turnos;
create policy turnos_update on public.turnos for update to authenticated
  using (terapeuta_id = (select auth.uid()) or private.es_admin())
  with check (terapeuta_id = (select auth.uid()) or private.es_admin());
drop policy if exists turnos_delete on public.turnos;
create policy turnos_delete on public.turnos for delete to authenticated
  using (terapeuta_id = (select auth.uid()) or private.es_admin());

-- ---------- facturas: terapeuta las suyas; administración todas ----------
alter table public.facturas enable row level security;
drop policy if exists facturas_rw on public.facturas;
create policy facturas_rw on public.facturas for all to authenticated
  using (terapeuta_id = (select auth.uid()) or private.es_admin())
  with check ((terapeuta_id = (select auth.uid()) and private.es_staff()) or private.es_admin());

-- ---------- factura_pacientes: hereda el acceso de su factura ----------
alter table public.factura_pacientes enable row level security;
drop policy if exists factura_pacientes_rw on public.factura_pacientes;
create policy factura_pacientes_rw on public.factura_pacientes for all to authenticated
  using (exists (select 1 from public.facturas f where f.id = factura_id))
  with check (exists (select 1 from public.facturas f where f.id = factura_id));

-- ---------- obras_sociales: el staff consulta y da de alta; administración edita ----------
alter table public.obras_sociales enable row level security;
drop policy if exists obras_sociales_select on public.obras_sociales;
create policy obras_sociales_select on public.obras_sociales for select to authenticated
  using (private.es_staff());
drop policy if exists obras_sociales_insert on public.obras_sociales;
create policy obras_sociales_insert on public.obras_sociales for insert to authenticated
  with check (private.es_staff());
drop policy if exists obras_sociales_update on public.obras_sociales;
create policy obras_sociales_update on public.obras_sociales for update to authenticated
  using (private.es_admin()) with check (private.es_admin());
drop policy if exists obras_sociales_delete on public.obras_sociales;
create policy obras_sociales_delete on public.obras_sociales for delete to authenticated
  using (private.es_admin());

-- ---------- tareas_terapeutas: tablero compartido del equipo ----------
alter table public.tareas_terapeutas enable row level security;
drop policy if exists tareas_staff on public.tareas_terapeutas;
create policy tareas_staff on public.tareas_terapeutas for all to authenticated
  using (private.es_staff()) with check (private.es_staff());

-- ---------- historial_clinico: cada terapeuta sus registros; administración todos ----------
alter table public.historial_clinico enable row level security;
drop policy if exists historial_rw on public.historial_clinico;
create policy historial_rw on public.historial_clinico for all to authenticated
  using (terapeuta_id = (select auth.uid()) or private.es_admin())
  with check ((terapeuta_id = (select auth.uid()) and private.es_staff()) or private.es_admin());

-- ---------- recordatorios: se ven si se ve el turno; los gestiona su terapeuta ----------
alter table public.recordatorios enable row level security;
drop policy if exists recordatorios_select on public.recordatorios;
create policy recordatorios_select on public.recordatorios for select to authenticated
  using (exists (select 1 from public.turnos t where t.id = turno_id));
drop policy if exists recordatorios_write on public.recordatorios;
create policy recordatorios_write on public.recordatorios for all to authenticated
  using (private.es_admin() or exists (select 1 from public.turnos t where t.id = turno_id and t.terapeuta_id = (select auth.uid())))
  with check (private.es_admin() or exists (select 1 from public.turnos t where t.id = turno_id and t.terapeuta_id = (select auth.uid())));

-- ---------- Vistas: que respeten el RLS de quien consulta ----------
-- Sin esto corren con los permisos del dueño y muestran todo a cualquier usuario logueado.
alter view public.v_ingresos_por_terapeuta set (security_invoker = true);
alter view public.v_pacientes_resumen set (security_invoker = true);
alter view public.v_resumen_ingresos set (security_invoker = true);
alter view public.v_sesiones_resumen set (security_invoker = true);

-- ---------- Página pública de cada área (visitantes sin login) ----------
-- Exponen solo lo que la página muestra, sin abrir usuarios_perfil al rol anon.
create or replace function public.equipo_publico_area(p_area_id uuid)
returns table (id uuid, nombre text, apellido text, especialidad text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.nombre, p.apellido, p.especialidad
  from public.usuarios_perfil p
  where p.area_id = p_area_id and p.rol = 'terapeuta' and p.activo is true
  order by p.apellido, p.nombre
$$;

create or replace function public.telefono_referente_area(p_area_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select p.telefono
  from public.areas a
  join public.usuarios_perfil p on p.id = a.referente_id
  where a.id = p_area_id and p.activo is true
$$;

revoke all on function public.equipo_publico_area(uuid), public.telefono_referente_area(uuid) from public;
grant execute on function public.equipo_publico_area(uuid), public.telefono_referente_area(uuid) to anon, authenticated;

-- ---------- Higiene ----------
-- TRUNCATE saltea RLS; ningún usuario de la app lo necesita.
revoke truncate, references, trigger on all tables in schema public from authenticated;
-- Función security definer sin search_path fijo (aviso del linter de Supabase).
alter function public.handle_new_user() set search_path = '';

-- =============================================================================
-- Rollback (vuelve al estado anterior a esta migración):
--   alter table public.<tabla> disable row level security;   -- para cada tabla de arriba
--   drop trigger proteger_campos_perfil on public.usuarios_perfil;
--   alter view public.v_* reset (security_invoker);
-- =============================================================================
