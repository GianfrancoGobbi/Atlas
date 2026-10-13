-- =============================================================================
-- Atlas · Hora real de fin de la sesión
--
-- Junto con inicio_real permite medir la duración real y cuánto más (o menos) dura
-- cada sesión respecto de lo pactado (fecha_hora_fin − fecha_hora_inicio).
-- Mismo formato: hora local sin zona. Lo cargan el terapeuta del turno o administración.
-- =============================================================================

alter table public.turnos add column if not exists fin_real timestamp without time zone;

comment on column public.turnos.fin_real is
  'Hora real de fin de la sesión (hora local). Tiempo extra = (fin_real − inicio_real) − (fecha_hora_fin − fecha_hora_inicio).';
