-- ============================================================
--  Миграция v4: управляемые рубрики
--  Применять на уже существующей БД через Supabase → SQL Editor.
--  Скрипт идемпотентен: повторный запуск безопасен.
-- ============================================================

-- ---------- Справочник рубрик ----------

create table if not exists public.categories (
  id         serial primary key,
  name       text unique not null,
  sort_order int default 0
);

comment on table public.categories is 'Справочник рубрик, которыми управляет редакция';
comment on column public.categories.name is 'Название рубрики, показываемое на сайте';
comment on column public.categories.sort_order is 'Порядок рубрик в фильтрах и формах';

insert into public.categories (name, sort_order) values
  ('Деньги', 1),
  ('Быт', 2),
  ('Документы', 3),
  ('Отношения', 4)
on conflict (name) do nothing;

-- ---------- Права и RLS ----------

grant usage on schema public to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

alter table public.categories enable row level security;

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

-- ---------- Снимаем старые CHECK-ограничения на рубрику ----------
-- В старых схемах category в posts и topic_suggestions была жёстко
-- привязана к четырём значениям. Удаляем только такие CHECK'и, не трогая
-- остальные ограничения (например, check на topic или status).

do $$
declare
  category_constraint record;
begin
  for category_constraint in
    select c.conrelid::regclass as table_name, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in (
        to_regclass('public.posts'),
        to_regclass('public.topic_suggestions')
      )
      and pg_get_constraintdef(c.oid) ilike '%category%'
  loop
    execute format(
      'alter table %s drop constraint %I',
      category_constraint.table_name,
      category_constraint.conname
    );
  end loop;
end $$;
