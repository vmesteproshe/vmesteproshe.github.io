/* Страница «О проекте» */
(function () {
  "use strict";

  var root = document.getElementById("aboutRoot");
  var titleElement = document.getElementById("aboutTitle");
  var contentElement = document.getElementById("aboutContent");
  if (!root || !titleElement || !contentElement) return;

  function setMetaDescription(text) {
    var meta = document.querySelector('meta[name="description"]');
    if (meta && text) meta.setAttribute("content", text.slice(0, 160));
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", document.title);
  }

  function plainText(markdown) {
    return String(markdown || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_`~|-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function renderPage(title, content, options) {
    options = options || {};
    var safeTitle = title || "О проекте";

    titleElement.textContent = safeTitle;
    contentElement.innerHTML = content;

    document.title = safeTitle + " — Вместе проще";
    setMetaDescription(options.description || plainText(contentElement.textContent));

    root.setAttribute("aria-busy", "false");
  }

  function fallbackMarkup() {
    var hint = "";
    if (window.VP.isDevHost() && !window.VP.isConfigured) {
      hint = '<p class="state__hint">Укажите ключи Supabase в <code>config.js</code> и выполните <code>sql/seed.sql</code>.</p>';
    }

    return (
      '<p>«Вместе проще» — онлайн-гид для молодых семей. Мы пишем о деньгах, быте, документах и отношениях коротко и по делу.</p>' +
      '<p>Сейчас страница обновляется. А пока можно вернуться к материалам.</p>' +
      '<p><a class="btn" href="index.html">Все материалы</a></p>' +
      hint
    );
  }

  async function load() {
    root.setAttribute("aria-busy", "true");

    if (!window.VP.supabase) {
      renderPage("О проекте", fallbackMarkup(), {
        description: "Онлайн-гид для молодых семей."
      });
      return;
    }

    var response = await window.VP.supabase
      .from("pages")
      .select("title,content,updated_at")
      .eq("slug", "about")
      .maybeSingle();

    if (response.error) {
      console.error("Ошибка загрузки страницы «О проекте»:", response.error);
      titleElement.textContent = "О проекте";
      contentElement.innerHTML =
        '<p>Не удалось загрузить страницу. Проверьте соединение и обновите её.</p>' +
        '<p><button class="btn" type="button" id="aboutRetry">Попробовать снова</button></p>' +
        (window.VP.isDevHost() && !window.VP.isConfigured
          ? '<p class="state__hint">Ключи Supabase пока не указаны в <code>config.js</code>.</p>'
          : "");
      root.setAttribute("aria-busy", "false");

      var retry = document.getElementById("aboutRetry");
      if (retry) retry.addEventListener("click", function () { load(); });
      return;
    }

    if (!response.data) {
      renderPage("О проекте", fallbackMarkup());
      return;
    }

    var page = response.data;
    renderPage(
      page.title || "О проекте",
      window.VP.renderMarkdown(page.content),
      { description: page.content }
    );
  }

  load();
})();
