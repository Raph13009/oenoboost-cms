-- Supabase Storage setup for CMS news article cover images
-- The column public.news_articles.cover_url already exists in this project.
-- This script creates a public bucket dedicated to cropped 16:9 cover images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'news-article-images',
  'news-article-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access for images
drop policy if exists "Public can read news article images" on storage.objects;
create policy "Public can read news article images"
on storage.objects
for select
to public
using (bucket_id = 'news-article-images');
