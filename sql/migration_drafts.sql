-- ============================================================
--  Миграция: поддержка черновиков (status) для таблицы posts
--  Применять на уже существующей БД через Supabase → SQL Editor.
-- ============================================================

-- Безопасно добавляем колонку status
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'
  CHECK (status IN ('draft', 'published'));

-- Добавляем индекс
CREATE INDEX IF NOT EXISTS posts_status_idx ON public.posts (status);

-- Обновляем RLS: анонимы видят только опубликованные
DROP POLICY IF EXISTS "posts_public_read" ON public.posts;
DROP POLICY IF EXISTS "posts_anon_read" ON public.posts;
DROP POLICY IF EXISTS "posts_auth_read" ON public.posts;

CREATE POLICY "posts_anon_read"
  ON public.posts
  FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "posts_auth_read"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (true);
