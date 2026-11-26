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
          '<div class="card__date">' + date + author + "<span>" + window.VP.escapeHtml(reading) + "</span>" +
            window.VP.bookmarkButtonMarkup(post.id) + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function articleMarkup(post) {
    var category = window.VP.getCategory(post.category);
    var date = window.VP.formatDate(post.created_at);
    var isoDate = window.VP.toIsoDate(post.created_at);
    var readingTime = window.VP.getReadingTime(post.content, true);
    var content = window.VP.renderMarkdown(post.content, { toc: true, postId: post.id });
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
            '<button class="text-btn article-print" type="button" data-print>Распечатать</button>' +
            window.VP.bookmarkButtonMarkup(post.id) +
          "</div>" +
        "</header>" +
        '<div class="container"><div class="article-cover">' +
          window.VP.coverMarkup(post, { eager: true }) +
        "</div></div>" +
        '<div class="container">' +
          '<div class="article-body">' + content + "</div>" +
          '<div class="article-footer">' +
            '<button class="text-btn" type="button" data-share-post data-share-title="' +
              window.VP.escapeHtml(post.title || "") + '">Поделиться</button>' +
            '<div class="article-footer__side">' +
              '<a class="text-btn" href="' + window.VP.escapeHtml(window.VP.categoryUrl(category.id)) + '">Ещё в рубрике</a>' +
              '<a class="text-btn" href="#top">Наверх</a>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="article-vote" id="articleVote">' +
          '<p class="article-vote__title">Статья помогла?</p>' +
          '<div class="article-vote__actions">' +
            '<button class="vote-btn" type="button" data-vote="yes" aria-pressed="false">' +
              "<span>Помогло</span>" +
              '<span class="vote-btn__count" data-vote-count="yes">' +
                (Number(post.helpful_yes) || 0) + "</span>" +
            "</button>" +
            '<button class="vote-btn" type="button" data-vote="no" aria-pressed="false">' +
              "<span>Не хватило деталей</span>" +
              '<span class="vote-btn__count" data-vote-count="no">' +
                (Number(post.helpful_no) || 0) + "</span>" +
            "</button>" +
          "</div>" +
          '<p class="article-vote__status" id="voteStatus" role="status" aria-live="polite"></p>' +
        "</div>" +
        '<div id="relatedSlot"></div>' +
      "</article>"
    );
  }

  function voteStorageKey(id) {
    return "vp_vote_" + id;
  }

  function readStoredVote(id) {
    try {
      return window.localStorage.getItem(voteStorageKey(id));
    } catch (error) {
      console.warn("Не удалось прочитать голос:", error);
      return null;
    }
  }

  function storeVote(id, vote) {
    try {
      window.localStorage.setItem(voteStorageKey(id), vote);
    } catch (error) {
      console.warn("Не удалось сохранить голос:", error);
    }
  }

  function bindVote(post) {
    var block = document.getElementById("articleVote");
    if (!block || !window.VP.supabase || !post || !post.id) return;

    var buttons = Array.prototype.slice.call(block.querySelectorAll("[data-vote]"));
    var status = block.querySelector(".article-vote__status");
    var stored = readStoredVote(post.id);
    var chosen = stored === "yes" || stored === "no" ? stored : "";
    var busy = false;

    function setStatus(text) {
      if (status) status.textContent = text || "";
    }

    function render() {
      buttons.forEach(function (button) {
        var active = button.getAttribute("data-vote") === chosen;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.disabled = Boolean(chosen) || busy;
      });
    }

    function setCounts(row) {
      if (!row) return;
      [["yes", "helpful_yes"], ["no", "helpful_no"]].forEach(function (pair) {
        var element = block.querySelector('[data-vote-count="' + pair[0] + '"]');
        var value = Number(row[pair[1]]);
        if (element && isFinite(value)) element.textContent = String(value);
      });
    }

    render();

    block.addEventListener("click", async function (event) {
      var button = event.target.closest("[data-vote]");
      if (!button || button.disabled || busy || chosen) return;

      var vote = button.getAttribute("data-vote");
      if (vote !== "yes" && vote !== "no") return;

      busy = true;
      render();
      setStatus("Отправляем оценку…");

      try {
        var response = await window.VP.supabase.rpc("vote_post", {
          p_post_id: post.id,
          p_vote: vote
        });
        if (response.error) throw response.error;

        var row = Array.isArray(response.data) ? response.data[0] : response.data;
        if (!row) throw new Error("Статья недоступна для голосования");
        setCounts(row);
        chosen = vote;
        storeVote(post.id, vote);
        setStatus("Спасибо! Оценка учтена.");
      } catch (error) {
        console.error("Ошибка сохранения оценки статьи:", error);
        setStatus("Не удалось сохранить оценку. Попробуйте позже.");
      } finally {
        busy = false;
        render();
      }
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

    if (!response.data || response.data.status === "draft" ||
        (typeof window.VP.isPubliclyVisible === "function" &&
          !window.VP.isPubliclyVisible(response.data))) {
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

    window.VP.trackPostView(post);
    bindVote(post);
    updateProgress();
    loadRelated(post);
  }

  load();
})();
