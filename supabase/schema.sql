-- GROUPFUN — esquema Supabase (executar uma vez em SQL Editor).
-- Cria tabelas, políticas RLS e o bucket de fotografias.

create extension if not exists pgcrypto;

-- ---------- Tabelas ----------
create table if not exists public.categories (
  slug     text primary key,
  name     text not null,
  singular text not null,
  sort     int  not null
);

insert into public.categories (slug, name, singular, sort) values
  ('camisas','Camisas','Camisa',1),
  ('polos','Polos','Polo',2),
  ('calcas','Calças','Calça',3),
  ('camisolas','Camisolas','Camisola',4),
  ('blusoes','Blusões','Blusão',5),
  ('jaquetas','Jaquetas','Jaqueta',6),
  ('sacolas','Sacolas','Sacola',7),
  ('chapeus','Chapéus','Chapéu',8),
  ('croppeds','Cropped''s','Cropped',9)
on conflict (slug) do nothing;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  category_slug text not null references public.categories(slug),
  name          text not null check (length(trim(name)) > 0),
  price         numeric(12,2) not null check (price >= 0),
  sizes         text[] not null default '{}',
  is_active     boolean not null default true,
  is_new        boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists products_active_idx on public.products (is_active, category_slug);

create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color      text not null constraint product_images_color_check check (color in ('Preto','Branco','Vermelho','Laranja','Amarelo','Azul','Azul-marinho','Verde','Verde-escuro','Rosa','Violeta','Lilás','Castanho','Bege','Creme','Cinzento','Prateado','Dourado','Bordô','Multicolor')),
  path       text not null,            -- caminho no bucket gf-media
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id);

create table if not exists public.site_images (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null constraint site_images_kind_check check (kind in ('hero','highlight','news','logo')),
  path       text not null,
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

-- No máximo 5 imagens por secção (um logótipo)
create or replace function public.limit_site_images() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.site_images where kind = new.kind) >= (case when new.kind = 'logo' then 1 else 5 end) then
    raise exception 'Limite de imagens por secção atingido';
  end if;
  return new;
end $$;
drop trigger if exists site_images_limit on public.site_images;
create trigger site_images_limit before insert on public.site_images
  for each row execute function public.limit_site_images();

-- ---------- Função de administrador ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- RLS ----------
alter table public.categories     enable row level security;
alter table public.admins         enable row level security;
alter table public.products       enable row level security;
alter table public.product_images enable row level security;
alter table public.site_images    enable row level security;

-- Visitantes: só leitura pública
create policy "categorias: leitura publica" on public.categories for select using (true);
create policy "produtos: leitura publica de activos" on public.products for select using (is_active or public.is_admin());
create policy "fotos: leitura publica de produtos activos" on public.product_images for select using (
  public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.is_active)
);
create policy "site: leitura publica" on public.site_images for select using (true);

-- Administradores: escrita total
create policy "categorias: admin" on public.categories     for all using (public.is_admin()) with check (public.is_admin());
create policy "produtos: admin"   on public.products       for all using (public.is_admin()) with check (public.is_admin());
create policy "fotos: admin"      on public.product_images for all using (public.is_admin()) with check (public.is_admin());
create policy "site: admin"       on public.site_images    for all using (public.is_admin()) with check (public.is_admin());

-- Cada utilizador só vê a sua própria linha em "admins"; ninguém escreve pela API
create policy "admins: ver propria linha" on public.admins for select using (user_id = auth.uid());

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gf-media', 'gf-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "gf-media: leitura publica" on storage.objects for select using (bucket_id = 'gf-media');
create policy "gf-media: admin envia"     on storage.objects for insert with check (bucket_id = 'gf-media' and public.is_admin());
create policy "gf-media: admin altera"    on storage.objects for update using (bucket_id = 'gf-media' and public.is_admin());
create policy "gf-media: admin apaga"     on storage.objects for delete using (bucket_id = 'gf-media' and public.is_admin());

-- ---------- Tornar o proprietário administrador ----------
-- 1) Criar o utilizador em Authentication > Users (email + palavra-passe).
-- 2) Executar (trocar o email):
--    insert into public.admins (user_id) select id from auth.users where email = 'EMAIL_DO_PROPRIETARIO';
