/* Страница статьи */
(function () {
  "use strict";

  var root = document.getElementById("articleRoot");
  if (!root) return;

  var initialMarkup = root.innerHTML;
  var progress = document.getElementById("readingProgress");
  var progressTicking = false;

  function updateProgress() {
    if (!progress) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progress.style.transform = "scaleX(" + ratio + ")";
    progressTicking = false;
  }

  window.addEventListener("scroll", function () {
    if (progressTicking) return;
    progressTicking = true;
    window.requestAnimationFrame(updateProgress);
  }, { passive: true });

  window.addEventListener("resize", updateProgress);

  function errorMarkup(options) {
    options = options || {};
    var devHint = "";
    if (window.VP.isDevHost() && !window.VP.isConfigured) {
      devHint = '<p class="state__hint">Укажите ключи Supabase в <code>config.js</code> и выполните SQL из папки <code>sql</code>.</p>';
    }

    return (
      '<div class="container">' +
        '<div class="article-state">' +
          '<p class="eyebrow">' + window.VP.escapeHtml(options.eyebrow || "Материал") + "</p>" +
          '<h1>' + window.VP.escapeHtml(options.title || "Статья не найдена") + "</h1>" +
          '<p>' + window.VP.escapeHtml(options.text || "Возможно, ссылка устарела или материал был удалён.") + "</p>" +
          '<a class="btn" href="./">Все материалы</a>' +
          devHint +
        "</div>" +
      "</div>"
    );
  }

  function cardMarkup(post) {
    var category = window.VP.getCategory(post.category);
    var url = window.VP.postUrl(post.id);
    var date = post.created_at
      ? '<time datetime="' + window.VP.escapeHtml(window.VP.toIsoDate(post.created_at)) + '">' +
        window.VP.escapeHtml(window.VP.formatDate(post.created_at)) + "</time>"
      : "";
    var reading = window.VP.getReadingTime(post.content, true);
    var author = post.author
      ? "<span>" + window.VP.escapeHtml(post.author) + "</span>"
      : "";
    return (
      '<article class="card">' +
        '<a class="card__media" href="' + window.VP.escapeHtml(url) + '" tabindex="-1" aria-hidden="true">' +
          window.VP.coverMarkup(post, { className: "media--card" }) +
        "</a>" +
        '<div class="card__body">' +
          '<a class="tag" href="' + window.VP.escapeHtml(window.VP.categoryUrl(category.id)) + '">' +
            window.VP.escapeHtml(category.label) + "</a>" +
          '<h2 class="card__title"><a href="' + window.VP.escapeHtml(url) + '">' +
            window.VP.escapeHtml(post.title || "Без заголовка") + "</a></h2>" +
          (post.excerpt ? '<p class="card__excerpt">' + window.VP.escapeHtml(post.excerpt) + "</p>" : "") +
          '<div class="card__date">' + date + author + "<span>" + window.VP.escapeHtml(reading) + "</span></div>" +
        "</div>" +
      "</article>"
    );
  }

  function articleMarkup(post) {
    var category = window.VP.getCategory(post.category);
    var date = window.VP.formatDate(post.created_at);
    var isoDate = window.VP.toIsoDate(post.created_at);
    var readingTime = window.VP.getReadingTime(post.content, true);
    var content = window.VP.renderMarkdown(post.content, { toc: true });
    var author = post.author
      ? '<span class="article-author">' + window.VP.escapeHtml(post.author) + "</span>"
      : "";

    return (
      '<article class="article">' +
        '<header class="container article-header">' +
          '<nav class="breadcrumbs" aria-label="Вы находитесь здесь">' +
            '<a href="./">Главная</a>' +
            '<span aria-hidden="true">/</span>' +
            '<a href="' + window.VP.escapeHtml(window.VP.categoryUrl(category.id)) + '">' + window.VP.escapeHtml(category.label) + "</a>" +
          "</nav>" +
          '<a class="tag" href="' + window.VP.escapeHtml(window.VP.categoryUrl(category.id)) + '">' + window.VP.escapeHtml(category.label) + "</a>" +
          '<h1 class="article-title">' + window.VP.escapeHtml(post.title || "Без заголовка") + "</h1>" +
          (post.excerpt ? '<p class="article-dek">' + window.VP.escapeHtml(post.excerpt) + "</p>" : "") +
          '<div class="article-meta">' +
            (date ? '<time datetime="' + window.VP.escapeHtml(isoDate) + '">' + window.VP.escapeHtml(date) + "</time>" : "") +
            author +
            "<span>" + window.VP.escapeHtml(readingTime) + "</span>" +
          "</div>" +
        "</header>" +
        '<div class="container"><div class="article-cover">' +
          window.VP.coverMarkup(post, { eager: true }) +
        "</div></div>" +
        '<div class="container">' +
          '<div class="article-body">' + content + "</div>" +
          '<div class="article-footer">' +
            '<button class="text-btn" type="button" id="shareBtn">Поделиться ссылкой</button>' +
            '<div class="article-footer__side">' +
              '<a class="text-btn" href="' + window.VP.escapeHtml(window.VP.categoryUrl(category.id)) + '">Ещё в рубрике</a>' +
              '<a class="text-btn" href="#top">Наверх</a>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div id="relatedSlot"></div>' +
      "</article>"
    );
  }

  function bindShare() {
    var button = document.getElementById("shareBtn");
    if (!button) return;
    button.addEventListener("click", async function () {
      var original = button.textContent;
      try {
        await window.VP.copyText(location.href);
        button.textContent = "Ссылка скопирована";
      } catch (error) {
        window.prompt("Скопируйте ссылку на статью:", location.href);
        return;
      }
      window.setTimeout(function () {
        button.textContent = original;
      }, 2200);
    });
  }

  async function loadRelated(post) {
    var slot = document.getElementById("relatedSlot");
    if (!slot || !window.VP.supabase) return;

    var result = await window.VP.fetchPublishedPosts({ excludeId: post.id, limit: 7 });
    if (result.error || !Array.isArray(result.data) || !result.data.length) return;

    var sorted = result.data.slice().sort(function (a, b) {
      return Number(b.category === post.category) - Number(a.category === post.category);
    });
    var items = sorted.slice(0, 3);

    slot.innerHTML =
      '<div class="container">' +
        '<section class="related" aria-labelledby="relatedTitle">' +
          '<div class="section-bar">' +
            '<h2 class="eyebrow" id="relatedTitle">Читайте также</h2>' +
          "</div>" +
          '<div class="post-grid">' + items.map(cardMarkup).join("") + "</div>" +
        "</section>" +
      "</div>";
  }

  async function load() {
    root.setAttribute("aria-busy", "true");
    root.innerHTML = initialMarkup;

    var params = new URLSearchParams(location.search);
    var id = params.get("id");

    if (!id) {
      root.setAttribute("aria-busy", "false");
      root.innerHTML = errorMarkup({
        eyebrow: "404",
        title: "Статья не найдена",
        text: "В ссылке нет идентификатора материала. Вернитесь на главную и выберите статью."
      });
      return;
    }

    if (!window.VP.supabase) {
      root.setAttribute("aria-busy", "false");
      root.innerHTML = errorMarkup({
        eyebrow: "Нет соединения",
        title: "Статья временно недоступна",
        text: "Сайт пока не подключён к базе данных. Попробуйте зайти позже."
      });
      return;
    }

    var response = await window.VP.fetchPostById(id);

    if (response.error) {
      console.error("Ошибка загрузки статьи:", response.error);
      var isInvalidId = response.error.code === "22P02";
      root.setAttribute("aria-busy", "false");
      root.innerHTML = errorMarkup({
        eyebrow: isInvalidId ? "404" : "Ошибка",
        title: isInvalidId ? "Статья не найдена" : "Не удалось загрузить статью",
        text: isInvalidId
          ? "Ссылка выглядит неверной. Откройте материал с главной страницы."
          : "Проверьте соединение и обновите страницу."
      });
      return;
    }

    if (!response.data || response.data.status === "draft") {
      root.setAttribute("aria-busy", "false");
      root.innerHTML = errorMarkup({
        eyebrow: "404",
        title: "Статья не найдена",
        text: "Возможно, материал был удалён или ещё не опубликован."
      });
      return;
    }

    var post = response.data;
    window.VP.updateArticleMeta(post);
    window.VP.setActiveCategory(post.category);

    root.innerHTML = articleMarkup(post);
    root.setAttribute("aria-busy", "false");

    bindShare();
    updateProgress();
    loadRelated(post);
  }

  load();
})();
