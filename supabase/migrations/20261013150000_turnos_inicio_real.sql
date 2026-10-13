-- =============================================================================
-- Atlas · Hora real de inicio de la sesión
--
-- Guarda a qué hora empezó de verdad cada sesión, para medir el atraso en minutos
-- contra fecha_hora_inicio. Mismo formato que fecha_hora_inicio: hora local sin zona.
-- Lo cargan el terapeuta del turno o administración (políticas existentes de turnos).
-- =============================================================================

alter table public.turnos add column if not exists inicio_real timestamp without time zone;

comment on column public.turnos.inicio_real is
  'Hora real de inicio de la sesión (hora local, como fecha_hora_inicio). Atraso = inicio_real - fecha_hora_inicio.';
