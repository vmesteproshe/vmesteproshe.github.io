-- ============================================================
--  Миграция v6: ограничения длины для заявок «Предложить тему»
--  Применять на уже существующей БД через Supabase → SQL Editor.
--  Скрипт идемпотентен: повторный запуск безопасен.
-- ============================================================

-- Таблица topic_suggestions создаётся в sql/migration_v2.sql.
-- Добавляем ограничения только если таблица уже существует.
do $$
begin
  if to_regclass('public.topic_suggestions') is not null then
    -- Тема без ведущих и ведомых пробелов: от 5 до 500 символов.
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

    -- Необязательный контакт: не длиннее 120 символов.
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
