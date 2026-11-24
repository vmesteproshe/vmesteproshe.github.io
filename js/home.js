/* Главная страница: лента, рубрики, поиск, статья и история браузера */
(function () {
  "use strict";

  var feed = document.getElementById("homeFeed");
  if (!feed) return;

  var initialMarkup = feed.innerHTML;
  var searchForm = document.getElementById("siteSearchForm");
  var searchInput = document.getElementById("siteSearch");
  var searchClear = document.getElementById("searchClear");
  var searchHint = document.getElementById("searchHint");

  var DEFAULT_TITLE = "Вместе проще — онлайн-гид для молодых семей";
  var DEFAULT_DESCRIPTION = "Короткие практичные статьи о деньгах, быту, документах и отношениях — для тех, кто учится жить вместе.";

  var state = {
    posts: [],
    filter: "all",
    postId: null,
    query: "",
    loaded: false,
    loading: false,
    error: null,
    legacy: false
  };

  var searchTimer = null;

  /* ---------- Адрес и история ---------- */

  function categoryExists(id) {
    return window.VP.categories.some(function (category) {
      return category.id === id;
    });
  }

  function filterFromLocation() {
    var params = new URLSearchParams(location.search);
    var category = params.get("cat");

    if (!category) {
      var hash = String(location.hash || "").replace(/^#/, "");
      if (hash && hash !== "all" && hash !== "top") category = hash;
    }

    if (category === "all") return "all";
    return categoryExists(category) ? category : "all";
  }

  function postIdFromLocation() {
    var id = new URLSearchParams(location.search).get("post");
    return id ? String(id) : null;
  }

  function urlFor(options) {
    options = options || {};
    var params = new URLSearchParams();

    if (options.filter && options.filter !== "all") params.set("cat", options.filter);
    if (options.postId) params.set("post", options.postId);

    var query = params.toString();
    return "./" + (query ? "?" + query : "");
  }

  function historySnapshot() {
    return {
      filter: state.filter,
      postId: state.postId,
      query: state.query
    };
  }

  function writeHistory(replace) {
    var url = urlFor({ filter: state.filter, postId: state.postId });
    try {
      if (replace) {
        history.replaceState(historySnapshot(), "", url);
      } else {
        history.pushState(historySnapshot(), "", url);
      }
    } catch (error) {
      console.warn("Не удалось обновить адрес страницы:", error);
    }
  }

  function navigate(next, replace) {
    next = next || {};

    if (next.filter !== undefined) {
      state.filter = next.filter === "all" || categoryExists(next.filter) ? next.filter : "all";
    }
    if (next.postId !== undefined) state.postId = next.postId || null;
    if (next.query !== undefined) state.query = String(next.query || "").trim();

    syncSearchUi();
    writeHistory(Boolean(replace));
    render({ scroll: true });
  }

  function syncSearchUi() {
    if (searchInput && searchInput.value !== state.query) searchInput.value = state.query;
    if (searchClear) searchClear.hidden = !state.query;
    if (!state.query && searchHint) searchHint.textContent = "";
  }

  /* ---------- Мета страницы ---------- */

  function setMeta(selector, value) {
    var element = document.querySelector(selector);
    if (element && value) element.setAttribute("content", value);
  }

  function resetMeta() {
    document.title = DEFAULT_TITLE;
    setMeta('meta[name="description"]', DEFAULT_DESCRIPTION);
    setMeta('meta[property="og:title"]', DEFAULT_TITLE);
    setMeta('meta[property="og:description"]', DEFAULT_DESCRIPTION);
    setMeta('meta[property="og:type"]', "website");
    setMeta('meta[property="og:image"]', window.VP.DEFAULT_OG_IMAGE);
  }

  /* ---------- Разметка ---------- */

  function countLabel(count) {
    return count + " " + window.VP.plural(count, ["материал", "материала", "материалов"]);
  }

  function categoryLink(categoryId, label) {
    return '<a class="tag" href="' + window.VP.escapeHtml(window.VP.categoryUrl(categoryId)) +
      '" data-category="' + window.VP.escapeHtml(categoryId) + '">' +
      window.VP.escapeHtml(label) + "</a>";
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightText(value, query) {
    var safe = window.VP.escapeHtml(value);
    var needle = String(query || "").trim();
    if (!needle) return safe;

    var safeNeedle = window.VP.escapeHtml(needle);
    try {
      return safe.replace(new RegExp("(" + escapeRegExp(safeNeedle) + ")", "gi"), "<mark>$1</mark>");
    } catch (error) {
      return safe;
    }
  }

  function metaMarkup(post, className) {
    var date = post.created_at
      ? '<time datetime="' + window.VP.escapeHtml(window.VP.toIsoDate(post.created_at)) + '">' +
        window.VP.escapeHtml(window.VP.formatDate(post.created_at)) + "</time>"
      : "";
    var author = post.author
      ? "<span>" + window.VP.escapeHtml(post.author) + "</span>"
      : "";
    var reading = window.VP.getReadingTime(post.content, true);
    var readingMarkup = reading ? "<span>" + window.VP.escapeHtml(reading) + "</span>" : "";

    if (!date && !author && !readingMarkup) return "";
    return '<div class="' + className + '">' + date + author + readingMarkup + "</div>";
  }

  function cardMarkup(post) {
    var category = window.VP.getCategory(post.category);
    var url = window.VP.homePostUrl(post.id);
    var title = highlightText(post.title || "Без заголовка", state.query);
    var excerpt = post.excerpt
      ? '<p class="card__excerpt">' + highlightText(post.excerpt, state.query) + "</p>"
      : "";

    return (
      '<article class="card">' +
        '<a class="card__media" href="' + window.VP.escapeHtml(url) + '" data-post-link="' +
          window.VP.escapeHtml(post.id) + '" tabindex="-1" aria-hidden="true">' +
          window.VP.coverMarkup(post, { className: "media--card" }) +
        "</a>" +
        '<div class="card__body">' +
          categoryLink(category.id, category.label) +
          '<h2 class="card__title"><a href="' + window.VP.escapeHtml(url) + '" data-post-link="' +
            window.VP.escapeHtml(post.id) + '">' + title + "</a></h2>" +
          excerpt +
          metaMarkup(post, "card__date") +
        "</div>" +
      "</article>"
    );
  }

  function leadMarkup(post) {
    var category = window.VP.getCategory(post.category);
    var url = window.VP.homePostUrl(post.id);

    return (
      '<article class="lead">' +
        '<div class="lead__body">' +
          categoryLink(category.id, category.label) +
          '<h1 class="lead__title" id="leadHeading"><a href="' + window.VP.escapeHtml(url) +
            '" data-post-link="' + window.VP.escapeHtml(post.id) + '">' +
            highlightText(post.title || "Без заголовка", state.query) + "</a></h1>" +
          (post.excerpt ? '<p class="lead__excerpt">' + highlightText(post.excerpt, state.query) + "</p>" : "") +
          metaMarkup(post, "lead__meta") +
          '<a class="lead__cta" href="' + window.VP.escapeHtml(url) + '" data-post-link="' +
            window.VP.escapeHtml(post.id) + '">Читать материал →</a>' +
        "</div>" +
        '<a class="lead__media" href="' + window.VP.escapeHtml(url) + '" data-post-link="' +
          window.VP.escapeHtml(post.id) + '" tabindex="-1" aria-hidden="true">' +
          window.VP.coverMarkup(post, { eager: true }) +
        "</a>" +
      "</article>"
    );
  }

  function skeletonCardMarkup() {
    return (
      '<div class="card card--skeleton" aria-hidden="true">' +
        '<div class="card__media skeleton"></div>' +
        '<div class="skeleton skeleton--tag"></div>' +
        '<div class="skeleton skeleton--card-title"></div>' +
        '<div class="skeleton skeleton--line"></div>' +
      "</div>"
    );
  }

  function skeletonMarkup(mode) {
    if (mode === "article") {
      return (
        '<div class="container article-header" aria-hidden="true">' +
          '<div class="skeleton skeleton--tag"></div>' +
          '<div class="skeleton skeleton--article-title"></div>' +
          '<div class="skeleton skeleton--article-title skeleton--title-short"></div>' +
          '<div class="skeleton skeleton--line"></div>' +
          '<div class="skeleton skeleton--line skeleton--line-short"></div>' +
        "</div>" +
        '<div class="container"><div class="article-cover skeleton"></div></div>' +
        '<div class="container"><div class="article-body article-skeleton" aria-hidden="true">' +
          '<div class="skeleton skeleton--line"></div>' +
          '<div class="skeleton skeleton--line"></div>' +
          '<div class="skeleton skeleton--line skeleton--line-short"></div>' +
          '<div class="skeleton skeleton--heading"></div>' +
          '<div class="skeleton skeleton--line"></div>' +
          '<div class="skeleton skeleton--line"></div>' +
        "</div></div>"
      );
    }

    if (mode === "grid") {
      var cards = "";
      for (var index = 0; index < 6; index += 1) cards += skeletonCardMarkup();
      return (
        '<section class="feed" aria-hidden="true">' +
          '<div class="section-bar"><span class="eyebrow">Загружаем материалы</span></div>' +
          '<div class="post-grid">' + cards + "</div>" +
        "</section>"
      );
    }

    return initialMarkup;
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
            '<a class="btn" href="./" data-category="all">Смотреть все материалы</a>' +
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

  function notFoundMarkup() {
    return (
      '<section class="state">' +
        '<p class="eyebrow">404</p>' +
        '<h1 class="state__title">Статья не найдена</h1>' +
        '<p class="state__text">Возможно, материал удалён или ссылка устарела.</p>' +
        '<a class="btn" href="./" data-close-post>Все материалы</a>' +
      "</section>"
    );
  }

  function readerMarkup(post) {
    var category = window.VP.getCategory(post.category);
    var content = window.VP.renderMarkdown(post.content, { toc: true });
    var cover = window.VP.coverMarkup(post, { eager: true });

    return (
      '<article class="article article--inline">' +
        '<header class="container article-header">' +
          '<button class="text-btn reader-back" type="button" data-close-post>← Все материалы</button>' +
          '<nav class="breadcrumbs" aria-label="Вы находитесь здесь">' +
            '<a href="./" data-close-post>Главная</a>' +
            '<span aria-hidden="true">/</span>' +
            '<a href="' + window.VP.escapeHtml(window.VP.categoryUrl(category.id)) + '" data-category="' +
              window.VP.escapeHtml(category.id) + '">' + window.VP.escapeHtml(category.label) + "</a>" +
          "</nav>" +
          categoryLink(category.id, category.label) +
          '<h1 class="article-title">' + window.VP.escapeHtml(post.title || "Без заголовка") + "</h1>" +
          (post.excerpt ? '<p class="article-dek">' + window.VP.escapeHtml(post.excerpt) + "</p>" : "") +
          metaMarkup(post, "article-meta") +
        "</header>" +
        '<div class="container"><div class="article-cover">' + cover + "</div></div>" +
        '<div class="container">' +
          '<div class="article-body">' + content + "</div>" +
          '<div class="article-footer">' +
            '<button class="text-btn" type="button" data-share-post>Поделиться ссылкой</button>' +
            '<div class="article-footer__side">' +
              '<a class="text-btn" href="' + window.VP.escapeHtml(window.VP.categoryUrl(category.id)) +
                '" data-category="' + window.VP.escapeHtml(category.id) + '">Ещё в рубрике</a>' +
              '<a class="text-btn" href="#top">Наверх</a>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  /* ---------- Поиск ---------- */

  function matchesQuery(post, query) {
    var needle = String(query || "").toLowerCase();
    if (!needle) return true;

    return (
      String(post.title || "").toLowerCase().indexOf(needle) !== -1 ||
      String(post.excerpt || "").toLowerCase().indexOf(needle) !== -1 ||
      window.VP.plainText(post.content).toLowerCase().indexOf(needle) !== -1
    );
  }

  function searchResults() {
    return state.posts.filter(function (post) {
      return matchesQuery(post, state.query);
    });
  }

  function updateSearchHint(count) {
    if (!searchHint) return;
    if (!state.query) {
      searchHint.textContent = "";
      return;
    }
    if (!state.loaded) {
      searchHint.textContent = "Ищем…";
      return;
    }
    searchHint.textContent = count
      ? count + " " + window.VP.plural(count, ["результат", "результата", "результатов"])
      : "Ничего не найдено";
  }

  function renderSearch() {
    resetMeta();
    document.title = "Поиск: " + state.query + " — Вместе проще";

    var results = searchResults();
    updateSearchHint(results.length);

    var header =
      '<header class="filter-head">' +
        '<p class="eyebrow">Поиск</p>' +
        '<h1 class="filter-title">Результаты</h1>' +
        '<p class="filter-description">Материалы по запросу «' + window.VP.escapeHtml(state.query) + '».</p>' +
        '<p class="filter-count">' + countLabel(results.length) + "</p>" +
      "</header>";

    if (!results.length) {
      feed.innerHTML =
        '<section class="feed">' + header +
          '<div class="state">' +
            '<h2 class="state__title">Ничего не нашлось</h2>' +
            '<p class="state__text">Попробуйте другое слово или посмотрите все материалы.</p>' +
            '<button class="btn" type="button" data-clear-search>Очистить поиск</button>' +
          "</div>" +
        "</section>";
      return;
    }

    feed.innerHTML =
      '<section class="feed">' + header +
        '<div class="post-grid">' + results.map(cardMarkup).join("") + "</div>" +
      "</section>";
  }

  function applySearch(value) {
    state.query = String(value || "").trim();

    if (state.postId) {
      state.postId = null;
    }

    syncSearchUi();
    writeHistory(true);
    render({ scroll: false });
  }

  /* ---------- Отрисовка ---------- */

  function render(options) {
    options = options || {};
    feed.setAttribute("aria-busy", state.loading ? "true" : "false");

    if (!state.loaded) return;

    if (state.error) {
      resetMeta();
      feed.innerHTML = errorMarkup(state.error);
      return;
    }

    if (state.query) {
      renderSearch();
      return;
    }

    if (state.postId) {
      renderReader();
      return;
    }

    if (!state.posts.length) {
      resetMeta();
      feed.innerHTML = emptyMarkup(state.filter);
      return;
    }

    if (state.filter === "all") {
      renderHome();
    } else {
      renderFilter();
    }

    if (options.scroll) {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
    }
  }

  function renderHome() {
    resetMeta();
    window.VP.setActiveCategory("all");

    var lead = state.posts.find(function (post) {
      return post.is_featured === true;
    }) || state.posts[0];
    var rest = state.posts.filter(function (post) {
      return post.id !== lead.id;
    });

    var html =
      '<section class="lead-section" aria-labelledby="leadHeading">' +
        '<div class="section-bar"><span class="eyebrow">Главное</span></div>' +
        leadMarkup(lead) +
      "</section>";

    if (rest.length) {
      html +=
        '<section class="feed" aria-labelledby="feedTitle">' +
          '<div class="section-bar"><h2 class="eyebrow" id="feedTitle">Ещё в выпуске</h2></div>' +
          '<div class="post-grid">' + rest.map(cardMarkup).join("") + "</div>" +
        "</section>";
    }

    feed.innerHTML = html;
  }

  function renderFilter() {
    var category = window.VP.getCategory(state.filter);
    var posts = state.posts.filter(function (post) {
      return post.category === state.filter;
    });

    resetMeta();
    document.title = category.label + " — Вместе проще";
    window.VP.setActiveCategory(state.filter);

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

  function renderReader() {
    var post = state.posts.find(function (item) {
      return item.id === state.postId;
    });

    if (!post) {
      resetMeta();
      feed.innerHTML = notFoundMarkup();
      return;
    }

    window.VP.setActiveCategory(post.category);
    window.VP.updateArticleMeta(post);
    feed.innerHTML = readerMarkup(post);

    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }

  /* ---------- Загрузка ---------- */

  async function load() {
    state.loading = true;
    state.loaded = false;
    state.error = null;

    feed.setAttribute("aria-busy", "true");
    feed.innerHTML = skeletonMarkup(state.postId ? "article" : (state.filter === "all" ? "home" : "grid"));

    if (!window.VP.supabase) {
      state.loading = false;
      state.loaded = true;
      state.posts = [];
      render({ scroll: false });
      return;
    }

    var result = await window.VP.fetchPublishedPosts();
    state.loading = false;
    state.loaded = true;

    if (result.error) {
      console.error("Ошибка загрузки статей:", result.error);
      state.error = window.VP.isConfigured
        ? "Проверьте соединение и обновите страницу."
        : "Сайт пока не подключён к базе данных.";
      render({ scroll: false });
      return;
    }

    state.posts = result.data;
    state.legacy = result.legacy;
    if (result.legacy) {
      console.info("Статьи загружены по старой схеме: выполните sql/migration_v2.sql, чтобы включить статусы и стили обложек.");
    }

    render({ scroll: false });
  }

  /* ---------- События ---------- */

  document.querySelectorAll(".rubrics a[data-category]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      navigate({ filter: link.getAttribute("data-category"), postId: null, query: "" }, false);
    });
  });

  feed.addEventListener("click", function (event) {
    var retry = event.target.closest("[data-retry]");
    if (retry) {
      load();
      return;
    }

    var closeTrigger = event.target.closest("[data-close-post]");
    if (closeTrigger) {
      event.preventDefault();
      navigate({ postId: null, query: "" }, false);
      return;
    }

    var clearTrigger = event.target.closest("[data-clear-search]");
    if (clearTrigger) {
      applySearch("");
      if (searchInput) searchInput.focus();
      return;
    }

    var shareTrigger = event.target.closest("[data-share-post]");
    if (shareTrigger) {
      var original = shareTrigger.textContent;
      window.VP.copyText(location.href).then(function () {
        shareTrigger.textContent = "Ссылка скопирована";
        window.setTimeout(function () {
          shareTrigger.textContent = original;
        }, 2200);
      }).catch(function () {
        window.prompt("Скопируйте ссылку на статью:", location.href);
      });
      return;
    }

    var postLink = event.target.closest("[data-post-link]");
    if (postLink) {
      event.preventDefault();
      navigate({ postId: postLink.getAttribute("data-post-link"), query: "" }, false);
      return;
    }

    var categoryLinkElement = event.target.closest("[data-category]");
    if (categoryLinkElement) {
      event.preventDefault();
      navigate({ filter: categoryLinkElement.getAttribute("data-category"), postId: null, query: "" }, false);
    }
  });

  if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      window.clearTimeout(searchTimer);
      applySearch(searchInput ? searchInput.value : "");
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      var value = searchInput.value;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function () {
        applySearch(value);
      }, 90);
    });

    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        window.clearTimeout(searchTimer);
        applySearch("");
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", function () {
      applySearch("");
      if (searchInput) searchInput.focus();
    });
  }

  window.addEventListener("popstate", function (event) {
    var saved = event.state;

    if (saved && typeof saved === "object" && ("filter" in saved || "postId" in saved)) {
      state.filter = saved.filter === "all" || categoryExists(saved.filter) ? saved.filter : "all";
      state.postId = saved.postId || null;
      state.query = String(saved.query || "");
    } else {
      state.filter = filterFromLocation();
      state.postId = postIdFromLocation();
      state.query = "";
    }

    syncSearchUi();
    render({ scroll: true });
  });

  // Совместимость со старыми ссылками вида ./#money.
  window.addEventListener("hashchange", function () {
    var hash = String(location.hash || "").replace(/^#/, "");
    if (hash === "all" || categoryExists(hash)) {
      navigate({ filter: hash, postId: null, query: "" }, true);
    }
  });

  /* ---------- Запуск ---------- */

  state.filter = filterFromLocation();
  state.postId = postIdFromLocation();
  state.query = "";
  syncSearchUi();

  try {
    history.replaceState(historySnapshot(), "", urlFor({ filter: state.filter, postId: state.postId }));
  } catch (error) {
    console.warn("Не удалось нормализовать адрес страницы:", error);
  }

  load();
})();
