-- ============================================================
--  Миграция v5: короткая оценка статьи «Помогло / Не хватило деталей»
--  Применять на уже существующей БД через Supabase → SQL Editor.
--  Скрипт идемпотентен: повторный запуск безопасен.
-- ============================================================

-- ---------- Счётчики в статьях ----------

alter table public.posts add column if not exists helpful_yes int not null default 0;
alter table public.posts add column if not exists helpful_no int not null default 0;

comment on column public.posts.helpful_yes is 'Количество оценок «Помогло»';
comment on column public.posts.helpful_no is 'Количество оценок «Не хватило деталей»';

-- ---------- Голосование через RPC ----------
-- Прямой UPDATE таблицы posts для anon не открываем: счётчики меняет только функция.

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
