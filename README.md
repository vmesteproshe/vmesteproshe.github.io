# «Вместе проще»

Онлайн-гид для молодых семей: короткие практичные статьи о деньгах, быте, документах и отношениях. Чистый HTML, CSS и JavaScript. Без сборки и фреймворков — проект готов к загрузке на GitHub Pages.

## Что внутри

```
index.html        главная: главный материал + сетка карточек + фильтры
post.html         статья (открывается как post.html?id=<uuid>)
about.html        страница «О проекте» из таблицы pages
admin.html        скрытая редакционная панель (noindex)
config.js         SUPABASE_URL, SUPABASE_ANON_KEY, бакет
style.css         все стили, включая адаптив и панель
js/common.js      клиент Supabase, утилиты, Markdown, общая шапка
js/home.js        загрузка и фильтрация статей
js/post.js        статья, прогресс чтения, похожие материалы
js/about.js       загрузка страницы «О проекте»
js/admin.js       авторизация и CRUD в панели
sql/schema.sql    таблицы posts и pages, RLS, гранты
sql/seed.sql      4 тестовые статьи и текст «О проекте»
sql/storage.sql   публичный бакет media и политики Storage
assets/favicon.svg
assets/og-cover.png  картинка для соцсетей
assets/covers/    локальные обложки тестовых статей (SVG)
```

## Быстрый старт

1. Создайте проект на [supabase.com](https://supabase.com).
2. Откройте **SQL Editor** и выполните по очереди:
   - `sql/schema.sql`;
   - `sql/seed.sql` (тестовые материалы — по желанию);
   - `sql/storage.sql`.
3. В **Project Settings → API** скопируйте **Project URL** и **anon public key** в `config.js`:

   ```js
   window.APP_CONFIG = {
     SUPABASE_URL: "https://ваш-проект.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi...",
     MEDIA_BUCKET: "media"
   };
   ```

4. Создайте редактора: **Authentication → Users → Add user**. Укажите почту и пароль и включите **Auto Confirm User** (если поле есть).
5. Чтобы никто не мог зарегистрироваться сам, отключите публичную регистрацию: **Authentication → Providers → Email → Allow new users to sign up** — выключить. Аккаунты, созданные вручную, продолжат работать.
6. Запустите локально из папки проекта:

   ```
   py -m http.server 8080
   ```

   Откройте `http://localhost:8080`.

7. Загрузите все файлы в репозиторий GitHub. В **Settings → Pages** выберите **Deploy from a branch → main / (root)**. Сайт будет доступен по адресу вида `https://username.github.io/repository/`.

> Публичный anon-ключ Supabase можно хранить в клиентском коде: запись защищена RLS. Ключ `service_role` в браузер вставлять нельзя.

## Публичный бакет и права Storage

Вариант через SQL (рекомендуется): выполните `sql/storage.sql` — он создаёт бакет `media` с публичным чтением и разрешает загрузку только роли `authenticated`.

Вариант через панель:

1. **Storage → New bucket** → имя `media` → включить **Public bucket**.
2. **Storage → Policies** для бакета `media`:
   - `SELECT` — все (`true`) — чтение картинок;
   - `INSERT` — роль `authenticated` — загрузка;
   - `UPDATE` — роль `authenticated` — замена;
   - `DELETE` — роль `authenticated` — удаление.
3. В настройках бакета можно ограничить размер файла и типы: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`.

Если бакет называется иначе, поменяйте `MEDIA_BUCKET` в `config.js`.

## Вход в редакцию

- Прямой адрес: `/admin.html`.
- На компьютере также работает сочетание **Ctrl + Shift + E**.
- Никаких ссылок на панель в шапке и подвале нет.
- Регистрация в интерфейсе отсутствует: пользователи создаются в Supabase.
- В панели можно создавать, редактировать и удалять статьи, загружать обложки и картинки в текст, отмечать главный материал и редактировать страницу «О проекте».

Сессия Supabase Auth сохраняется браузером (токен), но **контент сайта не хранится в localStorage** — статьи и страницы всегда загружаются из Supabase.

## Как устроены права

- `SELECT` для `posts` и `pages` открыт роли `anon` — сайт читают все.
- `INSERT`, `UPDATE`, `DELETE` разрешены только роли `authenticated`.
- Политики включаются в `sql/schema.sql`; без них Supabase по умолчанию всё запрещает.
- Картинки в бакете `media` доступны всем на чтение, загружать и удалять их может только авторизованный редактор.

## Категории

Сейчас используются четыре рубрики:

| id | Название |
| --- | --- |
| `money` | Деньги |
| `home` | Быт |
| `docs` | Документы |
| `relationships` | Отношения |

Категория хранится в `posts.category` и проверяется ограничением в SQL. Если добавляете новую рубрику, обновите:

1. `check (category in (...))` в `sql/schema.sql` (или отдельной миграцией);
2. массив `CATEGORIES` в `js/common.js`;
3. пункты меню в `index.html`, `post.html`, `about.html`;
4. `<option>` в `admin.html`.

## Полезно знать

- Тексты статей и страницы хранятся в Markdown. Предпросмотр в панели использует `marked`, HTML очищается через DOMPurify.
- Тестовые обложки лежат в `assets/covers/` и указаны в `sql/seed.sql` относительными путями — они работают и на GitHub Pages с вложенным адресом.
- Для красивого превью в соцсетях после публикации замените относительный путь в `og:image` на полный адрес сайта, например `https://username.github.io/repository/assets/og-cover.png`.
- Загрузка обложки и картинок идёт в Storage, в статью попадает публичный URL.
- Удаление статьи не удаляет физически её файлы из Storage — их можно почистить вручную.
- Если панель пишет «Таблица не найдена», выполните `sql/schema.sql`. Если «Бакет не найден» — `sql/storage.sql` или создайте бакет `media`.
- Для проверки без Supabase в консоли нет ошибок: сайт покажет аккуратное пустое состояние, а панель — подсказку про `config.js`.
