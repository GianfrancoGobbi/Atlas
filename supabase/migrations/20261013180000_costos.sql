-- =============================================================================
-- Atlas · Costos de la clínica
--
-- Un registro por gasto y mes. Opcionalmente asignado a un área o a un terapeuta
-- (los que no tienen asignación son costos comunes, que el tablero prorratea).
-- Solo administración los ve y los edita.
-- =============================================================================

create table if not exists public.costos (
  id uuid primary key default gen_random_uuid(),
  mes date not null check (extract(day from mes) = 1),
  categoria text not null check (categoria in (
    'alquiler', 'honorarios', 'sueldos', 'servicios', 'insumos',
    'impuestos', 'administracion', 'marketing', 'mantenimiento', 'otros'
  )),
  descripcion text not null default '',
  monto numeric(14, 2) not null check (monto >= 0),
  area_id uuid references public.areas (id) on delete set null,
  terapeuta_id uuid references public.usuarios_perfil (id) on delete set null,
  recurrente boolean not null default false,
  creado_por uuid default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists costos_mes_idx on public.costos (mes);

alter table public.costos enable row level security;
drop policy if exists costos_admin on public.costos;
create policy costos_admin on public.costos for all to authenticated
  using (private.es_admin()) with check (private.es_admin());

revoke all on public.costos from anon;
revoke truncate, references, trigger on public.costos from authenticated;
grant select, insert, update, delete on public.costos to authenticated;

create or replace function private.tocar_actualizado_en() returns trigger
language plpgsql set search_path = ''
as $$ begin new.actualizado_en := now(); return new; end; $$;

drop trigger if exists costos_actualizado_en on public.costos;
create trigger costos_actualizado_en before update on public.costos
  for each row execute function private.tocar_actualizado_en();
