-- ============================================================
--  «Вместе проще» — миграция v2
--  Статусы и обложки статей, заявки читателей, RLS-политики.
--  Выполните этот файл в Supabase → SQL Editor после schema.sql.
--  Скрипт идемпотентен: повторный запуск безопасен.
-- ============================================================

-- ---------- Новые поля статей ----------

alter table public.posts
  add column if not exists status text not null default 'published';

alter table public.posts
  add column if not exists cover_variant text not null default 'default';

-- В исходной схеме is_featured уже есть; добавляем на случай старой базы.
alter table public.posts
  add column if not exists is_featured boolean not null default false;

-- Ограничение на статус добавляем отдельно, чтобы миграция не падала,
-- если колонка уже существовала без проверки.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_status_check'
  ) then
    alter table public.posts
      add constraint posts_status_check
      check (status in ('draft', 'published'));
  end if;
end $$;

comment on column public.posts.status is 'draft = черновик, published = опубликовано на сайте';
comment on column public.posts.cover_variant is 'Стиль обложки без картинки: default, coral, ink, mint, sand, grid';
comment on column public.posts.is_featured is 'Закрепить материал в главном блоке на первой странице';

-- ---------- Заявки читателей «Предложить тему» ----------

create table if not exists public.topic_suggestions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category   text,
  topic      text not null check (char_length(topic) between 3 and 1000),
  contact    text
);

comment on table public.topic_suggestions is 'Идеи и вопросы читателей из формы «Предложить тему»';
comment on column public.topic_suggestions.category is 'Желаемая рубрика: money, home, docs, relationships (может быть пустой)';
comment on column public.topic_suggestions.contact is 'Необязательный контакт для ответа';

-- ---------- Индексы ----------

create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_featured_idx on public.posts (is_featured);
create index if not exists topic_suggestions_created_at_idx
  on public.topic_suggestions (created_at desc);

-- ---------- Права на уровне таблиц ----------

grant usage on schema public to anon, authenticated;

-- Публичное чтение статей и вставка заявок.
grant select on public.posts to anon, authenticated;
grant insert on public.topic_suggestions to anon;

-- Редактор управляет статьями и модерирует заявки.
grant insert, update, delete on public.posts to authenticated;
grant select, delete on public.topic_suggestions to authenticated;

-- ---------- RLS ----------

alter table public.posts enable row level security;
alter table public.topic_suggestions enable row level security;

-- Анонимный посетитель видит только опубликованные статьи.
drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read"
  on public.posts
  for select
  to anon
  using (status = 'published');

-- Авторизованный редактор видит все статьи, включая черновики.
drop policy if exists "posts_authenticated_read" on public.posts;
create policy "posts_authenticated_read"
  on public.posts
  for select
  to authenticated
  using (true);

drop policy if exists "posts_authenticated_insert" on public.posts;
create policy "posts_authenticated_insert"
  on public.posts
  for insert
  to authenticated
  with check (true);

drop policy if exists "posts_authenticated_update" on public.posts;
create policy "posts_authenticated_update"
  on public.posts
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "posts_authenticated_delete" on public.posts;
create policy "posts_authenticated_delete"
  on public.posts
  for delete
  to authenticated
  using (true);

-- Читатели могут только отправлять заявки.
drop policy if exists "topic_suggestions_anon_insert" on public.topic_suggestions;
create policy "topic_suggestions_anon_insert"
  on public.topic_suggestions
  for insert
  to anon
  with check (true);

-- Редактор читает и удаляет заявки, но не может их подменять.
drop policy if exists "topic_suggestions_authenticated_read" on public.topic_suggestions;
create policy "topic_suggestions_authenticated_read"
  on public.topic_suggestions
  for select
  to authenticated
  using (true);

drop policy if exists "topic_suggestions_authenticated_delete" on public.topic_suggestions;
create policy "topic_suggestions_authenticated_delete"
  on public.topic_suggestions
  for delete
  to authenticated
  using (true);
