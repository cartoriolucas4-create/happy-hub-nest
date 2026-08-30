alter table public.barbershops
  add column if not exists slogan text,
  add column if not exists sobre_experiencia text;

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  path text not null,
  descricao text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

grant select on public.gallery_images to anon;
grant select, insert, update, delete on public.gallery_images to authenticated;
grant all on public.gallery_images to service_role;

alter table public.gallery_images enable row level security;

drop policy if exists "gallery public read" on public.gallery_images;
create policy "gallery public read" on public.gallery_images
  for select to anon, authenticated using (true);

drop policy if exists "gallery owner write" on public.gallery_images;
create policy "gallery owner write" on public.gallery_images
  for all to authenticated
  using (barbershop_id = public.current_barbershop_id())
  with check (barbershop_id = public.current_barbershop_id());

create index if not exists gallery_images_shop_idx on public.gallery_images (barbershop_id, ordem);