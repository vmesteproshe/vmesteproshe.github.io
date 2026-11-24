-- ============================================================
--  Миграция v8: учёт просмотров статей
--  Применять на уже существующей БД через Supabase → SQL Editor.
--  Скрипт идемпотентен: повторный запуск безопасен.
-- ============================================================

-- ---------- Счётчик просмотров ----------

alter table public.posts add column if not exists views_count int not null default 0;

comment on column public.posts.views_count is
  'Количество просмотров опубликованной статьи (увеличивается RPC increment_post_views)';

-- ---------- Инкремент просмотров ----------
-- Прямой UPDATE таблицы posts для anon не открыт: счётчик меняет только функция.
-- SECURITY DEFINER позволяет увеличить счётчик опубликованной статьи,
-- а проверка status внутри функции не даёт считать просмотры черновиков.

create or replace function public.increment_post_views(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_views integer;
begin
  update public.posts
     set views_count = views_count + 1
   where id = p_post_id
     and status = 'published'
  returning views_count into new_views;

  return new_views;
end;
$$;

revoke all on function public.increment_post_views(uuid) from public;
grant execute on function public.increment_post_views(uuid) to anon, authenticated;
