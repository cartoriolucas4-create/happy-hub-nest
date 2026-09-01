create table if not exists public.public_booking_auth_settings (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_booking_auth_settings_barbershop_id_key unique (barbershop_id)
);

alter table public.public_booking_auth_settings enable row level security;

drop policy if exists "barbershop admins can read own booking auth settings" on public.public_booking_auth_settings;
drop policy if exists "barbershop admins can insert own booking auth settings" on public.public_booking_auth_settings;
drop policy if exists "barbershop admins can update own booking auth settings" on public.public_booking_auth_settings;

create policy "barbershop admins can read own booking auth settings"
on public.public_booking_auth_settings for select to authenticated
using (exists (select 1 from public.barbershops b where b.id = public_booking_auth_settings.barbershop_id and b.owner_id = auth.uid()));

create policy "barbershop admins can insert own booking auth settings"
on public.public_booking_auth_settings for insert to authenticated
with check (exists (select 1 from public.barbershops b where b.id = public_booking_auth_settings.barbershop_id and b.owner_id = auth.uid()));

create policy "barbershop admins can update own booking auth settings"
on public.public_booking_auth_settings for update to authenticated
using (exists (select 1 from public.barbershops b where b.id = public_booking_auth_settings.barbershop_id and b.owner_id = auth.uid()))
with check (exists (select 1 from public.barbershops b where b.id = public_booking_auth_settings.barbershop_id and b.owner_id = auth.uid()));

notify pgrst, 'reload schema';
