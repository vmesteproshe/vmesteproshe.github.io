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
  is_featured boolean not null default false,
  status      text not null default 'published' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.posts is 'Статьи гида «Вместе проще»';
comment on column public.posts.category is 'Идентификатор рубрики из public.categories (для базовых рубрик: money, home, docs, relationships)';
comment on column public.posts.author is 'Автор материала (необязательно)';
comment on column public.posts.is_featured is 'Главный материал на первой странице';
comment on column public.posts.status is 'draft = черновик, published = опубликовано';

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
  using (status = 'published');

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
