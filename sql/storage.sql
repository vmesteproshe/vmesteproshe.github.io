-- ============================================================
--  «Вместе проще» — публичный bucket media и политики Storage
--  Выполните этот файл в Supabase → SQL Editor после schema.sql.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 МБ
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Читать картинки может любой посетитель сайта
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Загружать, заменять и удалять файлы может только авторизованный редактор
drop policy if exists "media_authenticated_insert" on storage.objects;
create policy "media_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'media');

drop policy if exists "media_authenticated_update" on storage.objects;
create policy "media_authenticated_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

drop policy if exists "media_authenticated_delete" on storage.objects;
create policy "media_authenticated_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'media');
