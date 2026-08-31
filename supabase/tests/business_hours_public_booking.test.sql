-- Regression coverage for the canonical weekly business-hours flow.
-- Run with the Supabase test suite in an environment with pgTAP.

begin;

select plan(8);

select ok(
  to_regclass('public.business_hours') is not null,
  'business_hours exists'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_hours'
      and column_name = 'barbershop_id'
  ),
  'business_hours is tenant scoped'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_hours'
      and column_name = 'dia_semana'
  ),
  'business_hours stores one normalized weekday'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_hours'
      and column_name in ('hora_inicio', 'hora_fim')
    group by table_schema, table_name
    having count(*) = 2
  ),
  'business_hours stores opening and closing time'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_hours'
      and column_name = 'possui_intervalo'
  ),
  'business_hours stores explicit interval state'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'horarios_disponiveis'
  ),
  'public availability RPC exists'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'calcular_horarios_disponiveis'
  ),
  'availability core is isolated from the public schema'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'business_hours'
      and c.conname = 'business_hours_interval_consistency'
  ),
  'business-hours interval consistency is enforced in the database'
);

select * from finish();
rollback;
