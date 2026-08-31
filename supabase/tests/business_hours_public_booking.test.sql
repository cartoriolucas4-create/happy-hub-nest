-- Regression coverage for the canonical weekly business-hours flow.
-- Run with the Supabase test suite in an environment with pgTAP and seeded fixtures.

begin;

select plan(8);

select has_table('public', 'business_hours', 'business_hours exists');
select has_column('public', 'business_hours', 'barbershop_id', 'business_hours is tenant scoped');
select has_column('public', 'business_hours', 'dia_semana', 'business_hours stores one normalized weekday');
select has_column('public', 'business_hours', 'hora_inicio', 'business_hours stores opening time');
select has_column('public', 'business_hours', 'hora_fim', 'business_hours stores closing time');
select has_column('public', 'business_hours', 'possui_intervalo', 'business_hours stores explicit interval state');
select has_function('public', 'horarios_disponiveis', array['text','uuid','uuid','date'], 'public availability RPC exists');
select has_function('private', 'calcular_horarios_disponiveis', array['text','uuid','uuid','date'], 'availability core is isolated from the public schema');

select * from finish();
rollback;
