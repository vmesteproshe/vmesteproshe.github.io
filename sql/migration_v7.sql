-- ============================================================
--  Миграция v7: отложенная публикация статей
--  Применять на уже существующей БД через Supabase → SQL Editor.
--  Скрипт идемпотентен: повторный запуск безопасен.
-- ============================================================

-- ---------- Дата публикации ----------

alter table public.posts add column if not exists publish_at timestamptz null;

comment on column public.posts.publish_at is
  'Дата и время публикации: null — сразу, будущее значение — отложенный выход материала';

-- ---------- Публичное чтение ----------
-- Убираем обе версии старой политики: в schema.sql она называлась
-- posts_anon_read, а в migration_v2.sql — posts_public_read.

drop policy if exists "posts_anon_read" on public.posts;
drop policy if exists "posts_public_read" on public.posts;

create policy "posts_anon_read"
  on public.posts
  for select
  to anon
  using (status = 'published' and (publish_at is null or publish_at <= now()));
