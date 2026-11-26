-- GROUPFUN v2 — executar UMA vez no SQL Editor do projecto já existente.
-- Amplia as cores e permite gerir o logótipo pela tabela site_images.
-- Não apaga produtos, utilizadores, fotografias ou políticas.

alter table public.product_images
  drop constraint if exists product_images_color_check;
alter table public.product_images
  add constraint product_images_color_check
  check (color in (
    'Preto','Branco','Vermelho','Laranja','Amarelo','Azul','Azul-marinho',
    'Verde','Verde-escuro','Rosa','Violeta','Lilás','Castanho','Bege','Creme',
    'Cinzento','Prateado','Dourado','Bordô','Multicolor'
  ));

alter table public.site_images
  drop constraint if exists site_images_kind_check;
alter table public.site_images
  add constraint site_images_kind_check
  check (kind in ('hero','news','logo'));

-- A função existente continua a limitar hero/news a 3 imagens.
-- O painel mantém apenas um logótipo, substituindo o anterior quando necessário.
