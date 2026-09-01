create table if not exists public.public_booking_auth_settings (
  barbershop_id uuid primary key references public.barbershops(id) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.public_booking_auth_settings enable row level security;

create policy "Public can read booking auth setting"
on public.public_booking_auth_settings
for select
to anon, authenticated
using (true);

create policy "Owners can insert booking auth setting"
on public.public_booking_auth_settings
for insert
to authenticated
with check (
  exists (
    select 1 from public.barbershops b
    where b.id = barbershop_id and b.owner_id = auth.uid()
  )
);

create policy "Owners can update booking auth setting"
on public.public_booking_auth_settings
for update
to authenticated
using (
  exists (
    select 1 from public.barbershops b
    where b.id = barbershop_id and b.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.barbershops b
    where b.id = barbershop_id and b.owner_id = auth.uid()
  )
);

create policy "Owners can delete booking auth setting"
on public.public_booking_auth_settings
for delete
to authenticated
using (
  exists (
    select 1 from public.barbershops b
    where b.id = barbershop_id and b.owner_id = auth.uid()
  )
);

create or replace function public.set_updated_at_public_booking_auth_settings()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists public_booking_auth_settings_updated_at on public.public_booking_auth_settings;
create trigger public_booking_auth_settings_updated_at
before update on public.public_booking_auth_settings
for each row execute function public.set_updated_at_public_booking_auth_settings();
