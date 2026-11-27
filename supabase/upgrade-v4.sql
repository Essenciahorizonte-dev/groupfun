-- GROUPFUN v4 — PRODUTOS COM VARIANTES (cores) + CENTRO DE IMAGENS
-- Executar UMA vez em: Supabase > SQL Editor > New query > colar tudo > Run.
--
-- É SEGURO executar sobre o projecto existente:
--   * NÃO apaga nem altera tabelas, produtos, fotografias, encomendas, utilizadores ou configurações.
--   * Só ACRESCENTA colunas (com valores por defeito) e uma tabela nova.
--   * Pode ser executado mais de uma vez sem dar erro.
--   * Os produtos existentes continuam a funcionar exactamente como antes.
--   * As políticas RLS são mantidas: visitantes só lêem; só administradores escrevem.

-- 1) Novos campos no produto --------------------------------------------------
alter table public.products
  add column if not exists reference    text,
  add column if not exists description  text,
  add column if not exists sort         int     not null default 0,
  add column if not exists is_available boolean not null default true,
  add column if not exists use_variants boolean not null default false;

-- 2) Fotografias podem ser activadas / desactivadas ---------------------------
alter table public.product_images
  add column if not exists is_active boolean not null default true;

-- 3) Variantes (uma por cor, dentro do mesmo produto) -------------------------
create table if not exists public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  color        text not null constraint product_variants_color_check check (color in (
                 'Preto','Branco','Vermelho','Laranja','Amarelo','Azul','Azul-marinho',
                 'Verde','Verde-escuro','Rosa','Violeta','Lilás','Castanho','Bege','Creme',
                 'Cinzento','Prateado','Dourado','Bordô','Multicolor')),
  name         text,                                  -- vazio = usa o nome do produto
  reference    text,                                  -- vazio = usa a referência do produto
  price        numeric(12,2) check (price is null or price >= 0),  -- vazio = usa o preço base
  sizes        text[] not null default '{}',          -- vazio = usa os tamanhos do produto
  is_available boolean not null default true,         -- disponível para encomenda
  is_active    boolean not null default true,         -- visível no catálogo
  sort         int     not null default 0,
  created_at   timestamptz not null default now()
);
create unique index if not exists product_variants_product_color_uidx
  on public.product_variants (product_id, color);
create index if not exists product_variants_product_idx
  on public.product_variants (product_id);

-- 4) RLS ----------------------------------------------------------------------
alter table public.product_variants enable row level security;

drop policy if exists "variantes: leitura publica de activas" on public.product_variants;
create policy "variantes: leitura publica de activas" on public.product_variants for select using (
  public.is_admin()
  or (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active))
);

drop policy if exists "variantes: admin" on public.product_variants;
create policy "variantes: admin" on public.product_variants for all
  using (public.is_admin()) with check (public.is_admin());

-- Fotografias desactivadas deixam de ser públicas (o administrador continua a vê-las).
drop policy if exists "fotos: leitura publica de produtos activos" on public.product_images;
create policy "fotos: leitura publica de produtos activos" on public.product_images for select using (
  public.is_admin()
  or (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active))
);

-- 5) Verificação (opcional) — deve devolver as 5 colunas novas e a tabela ------
-- select column_name from information_schema.columns
--   where table_name = 'products' and column_name in ('reference','description','sort','is_available','use_variants');
-- select count(*) from public.product_variants;
