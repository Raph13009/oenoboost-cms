-- IntelliJ-style fuzzy search over public.communes_full.
-- The search is case- and accent-insensitive and matches the query letters as
-- a subsequence in the commune name (so "SaEti" matches "Saint-Étienne").
--
-- Usage from Supabase JS:
--   supabase.rpc('search_communes_full', { p_query: 'saeti', p_limit: 50 })

create extension if not exists unaccent;

create or replace function public.search_communes_full(
  p_query text,
  p_limit int default 50
)
returns table (code_insee text, name text)
language plpgsql
stable
as $$
declare
  q_normalized text;
  pattern text;
  effective_limit int;
begin
  effective_limit := greatest(1, least(coalesce(p_limit, 50), 200));
  q_normalized := lower(public.unaccent(coalesce(p_query, '')));
  q_normalized := regexp_replace(q_normalized, '[^a-z0-9]', '', 'g');

  if q_normalized = '' then
    return query
    select cf.code_insee::text, cf.name::text
    from public.communes_full cf
    order by cf.name asc
    limit effective_limit;
    return;
  end if;

  pattern := '%' || array_to_string(string_to_array(q_normalized, null), '%') || '%';

  return query
  select cf.code_insee::text, cf.name::text
  from public.communes_full cf
  where lower(public.unaccent(cf.name)) like pattern
  order by
    case
      when lower(public.unaccent(cf.name)) like q_normalized || '%' then 0
      when lower(public.unaccent(cf.name)) like '%' || q_normalized || '%' then 1
      else 2
    end,
    length(cf.name),
    cf.name
  limit effective_limit;
end;
$$;

grant execute on function public.search_communes_full(text, int) to anon, authenticated, service_role;
