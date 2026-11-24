-- ============================================================
--  «Вместе проще» — схема базы данных и политики RLS
--  Выполните этот файл в Supabase → SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Рубрики ----------
create table if not exists public.categories (
  id         serial primary key,
  name       text unique not null,
  sort_order int default 0
);

insert into public.categories (name, sort_order) values
  ('Деньги', 1),
  ('Быт', 2),
  ('Документы', 3),
  ('Отношения', 4)
on conflict (name) do nothing;

comment on table public.categories is 'Справочник рубрик, которыми управляет редакция';
comment on column public.categories.name is 'Название рубрики, показываемое на сайте';
comment on column public.categories.sort_order is 'Порядок рубрик в фильтрах и формах';

-- ---------- Статьи ----------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 200),
  category    text not null,
  excerpt     text not null default '',
  content     text not null default '',
  cover_url   text,
  author      text,
  helpful_yes int not null default 0,
  helpful_no  int not null default 0,
  views_count int not null default 0,
  is_featured boolean not null default false,
  status      text not null default 'published' check (status in ('draft', 'published')),
  publish_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.posts is 'Статьи гида «Вместе проще»';
comment on column public.posts.category is 'Идентификатор рубрики из public.categories (для базовых рубрик: money, home, docs, relationships)';
comment on column public.posts.author is 'Автор материала (необязательно)';
comment on column public.posts.helpful_yes is 'Количество оценок «Помогло»';
comment on column public.posts.helpful_no is 'Количество оценок «Не хватило деталей»';
comment on column public.posts.views_count is 'Количество просмотров опубликованной статьи (увеличивается RPC increment_post_views)';
comment on column public.posts.is_featured is 'Главный материал на первой странице';
comment on column public.posts.status is 'draft = черновик, published = опубликовано';
comment on column public.posts.publish_at is 'Дата и время публикации: null — сразу, будущее значение — отложенный выход материала';

-- Повторное выполнение schema.sql на существующей БД не должно терять счётчик.
alter table public.posts add column if not exists views_count int not null default 0;

-- ---------- Страницы ----------
create table if not exists public.pages (
  slug       text primary key,
  title      text not null,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.pages is 'Редактируемые страницы сайта (сейчас — «О проекте»)';

-- ---------- Индексы ----------
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_category_idx on public.posts (category);
create index if not exists posts_status_idx on public.posts (status);

-- ---------- Автоматическое обновление updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- ---------- Права на уровне таблиц ----------
grant usage on schema public to anon, authenticated;

grant select on public.posts, public.pages, public.categories to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant insert, update, delete on public.pages to authenticated;
grant insert, update, delete on public.categories to authenticated;

-- ---------- RLS ----------
alter table public.posts enable row level security;
alter table public.pages enable row level security;
alter table public.categories enable row level security;

-- Чтение открыто всем (анонимы — только опубликованные, authenticated — все)
drop policy if exists "posts_public_read" on public.posts;
drop policy if exists "posts_anon_read" on public.posts;
drop policy if exists "posts_auth_read" on public.posts;

create policy "posts_anon_read"
  on public.posts
  for select
  to anon
  using (status = 'published' and (publish_at is null or publish_at <= now()));

create policy "posts_auth_read"
  on public.posts
  for select
  to authenticated
  using (true);

drop policy if exists "pages_public_read" on public.pages;
create policy "pages_public_read"
  on public.pages
  for select
  to anon, authenticated
  using (true);

-- Добавлять, менять и удалять статьи может только authenticated
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

-- Страницы «О проекте»: читают все, меняют только авторизованные редакторы
drop policy if exists "pages_authenticated_insert" on public.pages;
create policy "pages_authenticated_insert"
  on public.pages
  for insert
  to authenticated
  with check (true);

drop policy if exists "pages_authenticated_update" on public.pages;
create policy "pages_authenticated_update"
  on public.pages
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "pages_authenticated_delete" on public.pages;
create policy "pages_authenticated_delete"
  on public.pages
  for delete
  to authenticated
  using (true);

-- Рубрики: читают все, меняют только авторизованные редакторы
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
  on public.categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "categories_authenticated_insert" on public.categories;
create policy "categories_authenticated_insert"
  on public.categories
  for insert
  to authenticated
  with check (true);

drop policy if exists "categories_authenticated_update" on public.categories;
create policy "categories_authenticated_update"
  on public.categories
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "categories_authenticated_delete" on public.categories;
create policy "categories_authenticated_delete"
  on public.categories
  for delete
  to authenticated
  using (true);

-- ---------- Короткая оценка статьи ----------
-- Прямой UPDATE таблицы posts для anon не открыт: счётчики меняет только функция.

create or replace function public.vote_post(p_post_id uuid, p_vote text)
returns table (helpful_yes int, helpful_no int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_vote is null or p_vote not in ('yes', 'no') then
    raise exception 'Недопустимое значение голоса: %', p_vote;
  end if;

  return query
    update public.posts as p
       set helpful_yes = case when p_vote = 'yes' then p.helpful_yes + 1 else p.helpful_yes end,
           helpful_no  = case when p_vote = 'no'  then p.helpful_no  + 1 else p.helpful_no  end
     where p.id = p_post_id
       and p.status = 'published'
    returning p.helpful_yes, p.helpful_no;
end;
$$;

revoke all on function public.vote_post(uuid, text) from public;
grant execute on function public.vote_post(uuid, text) to anon, authenticated;

-- ---------- Учёт просмотров статьи ----------
-- Прямой UPDATE таблицы posts для anon не открыт: счётчик меняет только функция.

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

-- ---------- Ограничения для заявок «Предложить тему» ----------
-- Таблица topic_suggestions создаётся в sql/migration_v2.sql, поэтому
-- ограничения накладываются только если таблица уже присутствует в БД
-- (например, при повторном выполнении schema.sql после миграций).

do $$
begin
  if to_regclass('public.topic_suggestions') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.topic_suggestions'::regclass
        and conname = 'topic_suggestions_topic_length_check'
    ) then
      alter table public.topic_suggestions
        add constraint topic_suggestions_topic_length_check
        check (char_length(btrim(topic)) between 5 and 500);
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.topic_suggestions'::regclass
        and conname = 'topic_suggestions_contact_length_check'
    ) then
      alter table public.topic_suggestions
        add constraint topic_suggestions_contact_length_check
        check (char_length(contact) <= 120);
    end if;
  end if;
end $$;
