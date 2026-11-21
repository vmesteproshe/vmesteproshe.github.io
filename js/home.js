/* Главная страница: загрузка материалов, фильтр по рубрикам */
(function () {
  "use strict";

  var feed = document.getElementById("homeFeed");
  if (!feed) return;

  var initialMarkup = feed.innerHTML;
  var state = {
    posts: [],
    filter: filterFromHash(),
    loaded: false
  };

  function filterFromHash() {
    var hash = String(location.hash || "").replace(/^#/, "");
    var exists = window.VP.categories.some(function (category) {
      return category.id === hash;
    });
    return exists ? hash : "all";
  }

  function countLabel(count) {
    return count + " " + window.VP.plural(count, ["материал", "материала", "материалов"]);
  }

  function categoryLink(categoryId, label) {
    return '<a class="tag" href="index.html#' + window.VP.escapeHtml(categoryId) + '">' +
      window.VP.escapeHtml(label) + "</a>";
  }

  function cardMarkup(post) {
    var category = window.VP.getCategory(post.category);
    var url = window.VP.postUrl(post.id);
    var title = window.VP.escapeHtml(post.title || "Без заголовка");
    var excerpt = post.excerpt
      ? '<p class="card__excerpt">' + window.VP.escapeHtml(post.excerpt) + "</p>"
      : "";
    var date = post.created_at
      ? '<div class="card__date"><time datetime="' + window.VP.escapeHtml(window.VP.toIsoDate(post.created_at)) + '">' +
        window.VP.escapeHtml(window.VP.formatDate(post.created_at)) + "</time></div>"
      : "";

    return (
      '<article class="card">' +
        '<a class="card__media" href="' + window.VP.escapeHtml(url) + '" tabindex="-1" aria-hidden="true">' +
          window.VP.coverMarkup(post, { className: "media--card" }) +
        "</a>" +
        '<div class="card__body">' +
          categoryLink(category.id, category.label) +
          '<h2 class="card__title"><a href="' + window.VP.escapeHtml(url) + '">' + title + "</a></h2>" +
          excerpt +
          date +
        "</div>" +
      "</article>"
    );
  }

  function leadMarkup(post) {
    var category = window.VP.getCategory(post.category);
    var url = window.VP.postUrl(post.id);
    var date = post.created_at
      ? '<time datetime="' + window.VP.escapeHtml(window.VP.toIsoDate(post.created_at)) + '">' +
        window.VP.escapeHtml(window.VP.formatDate(post.created_at)) + "</time>"
      : "";

    return (
      '<article class="lead">' +
        '<div class="lead__body">' +
          categoryLink(category.id, category.label) +
          '<h1 class="lead__title" id="leadHeading"><a href="' + window.VP.escapeHtml(url) + '">' +
            window.VP.escapeHtml(post.title || "Без заголовка") + "</a></h1>" +
          (post.excerpt ? '<p class="lead__excerpt">' + window.VP.escapeHtml(post.excerpt) + "</p>" : "") +
          '<div class="lead__meta">' + date + "</div>" +
          '<a class="lead__cta" href="' + window.VP.escapeHtml(url) + '">Читать материал →</a>' +
        "</div>" +
        '<a class="lead__media" href="' + window.VP.escapeHtml(url) + '" tabindex="-1" aria-hidden="true">' +
          window.VP.coverMarkup(post, { eager: true }) +
        "</a>" +
      "</article>"
    );
  }

  function emptyMarkup(filter) {
    if (filter !== "all") {
      var category = window.VP.getCategory(filter);
      return (
        '<section class="feed" aria-labelledby="filterTitle">' +
          '<header class="filter-head">' +
            '<p class="eyebrow">Рубрика</p>' +
            '<h1 class="filter-title" id="filterTitle">' + window.VP.escapeHtml(category.label) + "</h1>" +
            '<p class="filter-description">' + window.VP.escapeHtml(category.description) + "</p>" +
            '<p class="filter-count">Пока нет материалов</p>' +
          "</header>" +
          '<div class="state">' +
            '<h2 class="state__title">В этой рубрике пока пусто</h2>' +
            '<p class="state__text">Материалы появятся позже. А пока можно посмотреть всё, что уже вышло.</p>' +
            '<a class="btn" href="index.html#all">Смотреть все материалы</a>' +
          "</div>" +
        "</section>"
      );
    }

    var devHint = "";
    if (window.VP.isDevHost() && !window.VP.isConfigured) {
      devHint = '<p class="state__hint">Для локальной проверки укажите ключи Supabase в <code>config.js</code> и выполните SQL из папки <code>sql</code>.</p>';
    }

    return (
      '<section class="state">' +
        '<p class="eyebrow">Главное</p>' +
        '<h1 class="state__title">Здесь скоро появятся материалы</h1>' +
        '<p class="state__text">Редакция готовит первые тексты о деньгах, быте, документах и отношениях. Загляните чуть позже.</p>' +
        devHint +
      "</section>"
    );
  }

  function errorMarkup(message) {
    return (
      '<section class="state">' +
        '<p class="eyebrow">Не удалось загрузить</p>' +
        '<h1 class="state__title">Материалы временно недоступны</h1>' +
        '<p class="state__text">' + window.VP.escapeHtml(message || "Проверьте соединение и попробуйте ещё раз.") + "</p>" +
        '<button class="btn" type="button" data-retry>Попробовать снова</button>' +
        (window.VP.isDevHost() && !window.VP.isConfigured
          ? '<p class="state__hint">Ключи Supabase пока не указаны в <code>config.js</code>.</p>'
          : "") +
      "</section>"
    );
  }

  function render() {
    feed.setAttribute("aria-busy", "false");
    window.VP.setActiveCategory(state.filter);

    if (!state.loaded) return;

    if (!state.posts.length) {
      document.title = "Вместе проще — онлайн-гид для молодых семей";
      feed.innerHTML = emptyMarkup(state.filter);
      return;
    }

    if (state.filter === "all") {
      var lead = state.posts.find(function (post) {
        return post.is_featured === true;
      }) || state.posts[0];
      var rest = state.posts.filter(function (post) {
        return post.id !== lead.id;
      });

      document.title = "Вместе проще — онлайн-гид для молодых семей";

      var html =
        '<section class="lead-section" aria-labelledby="leadHeading">' +
          '<div class="section-bar">' +
            '<span class="eyebrow">Главное</span>' +
            '<span class="feed-count">' + countLabel(state.posts.length) + "</span>" +
          "</div>" +
          leadMarkup(lead) +
        "</section>";

      if (rest.length) {
        html +=
          '<section class="feed" aria-labelledby="feedTitle">' +
            '<div class="section-bar">' +
              '<h2 class="eyebrow" id="feedTitle">Ещё в выпуске</h2>' +
              '<span class="feed-count">' + countLabel(rest.length) + "</span>" +
            "</div>" +
            '<div class="post-grid">' + rest.map(cardMarkup).join("") + "</div>" +
          "</section>";
      }

      feed.innerHTML = html;
      return;
    }

    var category = window.VP.getCategory(state.filter);
    var posts = state.posts.filter(function (post) {
      return post.category === state.filter;
    });

    document.title = category.label + " — Вместе проще";

    if (!posts.length) {
      feed.innerHTML = emptyMarkup(state.filter);
      return;
    }

    feed.innerHTML =
      '<section class="feed" aria-labelledby="filterTitle">' +
        '<header class="filter-head">' +
          '<p class="eyebrow">Рубрика</p>' +
          '<h1 class="filter-title" id="filterTitle">' + window.VP.escapeHtml(category.label) + "</h1>" +
          '<p class="filter-description">' + window.VP.escapeHtml(category.description) + "</p>" +
          '<p class="filter-count">' + countLabel(posts.length) + "</p>" +
        "</header>" +
        '<div class="post-grid">' + posts.map(cardMarkup).join("") + "</div>" +
      "</section>";
  }

  async function load() {
    state.filter = filterFromHash();
    window.VP.setActiveCategory(state.filter);

    if (!window.VP.supabase) {
      state.loaded = true;
      state.posts = [];
      feed.setAttribute("aria-busy", "false");
      render();
      return;
    }

    feed.setAttribute("aria-busy", "true");
    feed.innerHTML = initialMarkup;

    var response = await window.VP.supabase
      .from("posts")
      .select("id,title,category,excerpt,cover_url,is_featured,created_at")
      .order("created_at", { ascending: false });

    if (response.error) {
      console.error("Ошибка загрузки статей:", response.error);
      state.loaded = true;
      state.posts = [];
      feed.setAttribute("aria-busy", "false");
      feed.innerHTML = errorMarkup(
        window.VP.isConfigured
          ? "Проверьте соединение и обновите страницу."
          : "Сайт пока не подключён к базе данных."
      );
      return;
    }

    state.posts = Array.isArray(response.data) ? response.data : [];
    state.loaded = true;
    render();
  }

  feed.addEventListener("click", function (event) {
    var retry = event.target.closest("[data-retry]");
    if (retry) {
      state.loaded = false;
      load();
    }
  });

  window.addEventListener("hashchange", function () {
    state.filter = filterFromHash();

    if (state.loaded) {
      render();
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
    } else {
      load();
    }
  });

  load();
})();
