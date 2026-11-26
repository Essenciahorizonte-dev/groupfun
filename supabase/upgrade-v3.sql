-- GROUPFUN: ampliar os espaços de imagem da página inicial sem apagar dados.
alter table public.site_images drop constraint if exists site_images_kind_check;
alter table public.site_images add constraint site_images_kind_check check (kind in ('hero','highlight','reference','news','logo'));
create or replace function public.limit_site_images() returns trigger
language plpgsql as $$
declare current_count integer; max_count integer;
begin
  if new.kind = 'logo' then max_count := 1; else max_count := 5; end if;
  select count(*) into current_count from public.site_images where kind = new.kind and id is distinct from new.id;
  if current_count >= max_count then raise exception 'Limite de % imagem(ns) para o espaço %.', max_count, new.kind; end if;
  return new;
end;
$$;
