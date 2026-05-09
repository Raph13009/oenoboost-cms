-- Search over public.communes_full scoped to a wine region.
-- Both query and commune name are normalized (lowercased, accents stripped,
-- non-alphanumerics removed) before a plain `like '%query%'` substring match,
-- so "tetien" matches "Saint-Étienne" and "saint etienne" matches the same.
--
-- The result set is restricted to communes that belong to a subregion of the
-- given wine region (via `communes_full_subregion_link` → `subregions`).
-- When `p_region_id` is null the entire `communes_full` table is searched.
--
-- Usage from Supabase JS:
--   supabase.rpc('search_communes_full', {
--     p_query: 'tetien',
--     p_region_id: '<wine_regions.id>',
--     p_limit: 50,
--   })

create extension if not exists unaccent;

drop function if exists public.search_communes_full(text, int);
drop function if exists public.search_communes_full(text, uuid, int);

create or replace function public.search_communes_full(
  p_query text,
  p_region_id uuid default null,
  p_limit int default 50
)
returns table (code_insee text, name text)
language sql
stable
as $$
  with q as (
    select regexp_replace(
             lower(public.unaccent(coalesce(p_query, ''))),
             '[^a-z0-9]', '', 'g'
           ) as norm
  ),
  allowed as (
    select cfsl.commune_code_insee
    from public.communes_full_subregion_link cfsl
    join public.subregions sr on sr.id = cfsl.subregion_id
    where p_region_id is not null and sr.region_id = p_region_id
  )
  select cf.code_insee::text, cf.name::text
  from public.communes_full cf, q
  where (
      p_region_id is null
      or cf.code_insee in (select commune_code_insee from allowed)
    )
    and (
      q.norm = ''
      or regexp_replace(lower(public.unaccent(cf.name)), '[^a-z0-9]', '', 'g')
           like '%' || q.norm || '%'
    )
  order by length(cf.name), cf.name
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

grant execute on function public.search_communes_full(text, uuid, int)
  to anon, authenticated, service_role;
