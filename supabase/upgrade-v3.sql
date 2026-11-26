-- GROUPFUN VIP — ampliar os espaços de imagem para 5 por secção.
-- Executar uma vez no SQL Editor do Supabase existente. Não elimina imagens nem produtos.
alter table public.site_images drop constraint if exists site_images_kind_check;
alter table public.site_images add constraint site_images_kind_check
  check (kind in ('hero','highlight','news','logo'));

create or replace function public.limit_site_images() returns trigger
language plpgsql as $$
declare
  max_items integer;
begin
  max_items := case when new.kind = 'logo' then 1 else 5 end;
  if (select count(*) from public.site_images where kind = new.kind) >= max_items then
    raise exception 'Limite de imagens atingido para esta secção';
  end if;
  return new;
end $$;
