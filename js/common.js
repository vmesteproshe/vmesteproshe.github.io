/* ============================================================
   «Вместе проще» — общие функции и клиент Supabase
   ============================================================ */
(function () {
  "use strict";

  var rawConfig = window.APP_CONFIG || {};
  var config = {
    SUPABASE_URL: String(rawConfig.SUPABASE_URL || "").trim(),
    SUPABASE_ANON_KEY: String(rawConfig.SUPABASE_ANON_KEY || "").trim(),
    MEDIA_BUCKET: String(rawConfig.MEDIA_BUCKET || "media").trim() || "media"
  };

  var hasPlaceholders = /YOUR-PROJECT|YOUR_SUPABASE|YOUR_ANON|PLACEHOLDER|PASTE_/i.test(
    config.SUPABASE_URL + " " + config.SUPABASE_ANON_KEY
  );
  var isConfigured = Boolean(
    config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    /^https?:\/\//i.test(config.SUPABASE_URL) &&
    !hasPlaceholders
  );

  var client = null;
  if (isConfigured && window.supabase && typeof window.supabase.createClient === "function") {
    try {
      client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });
    } catch (error) {
      console.error("Не удалось создать клиент Supabase:", error);
    }
  }

  var CATEGORIES = [
    { id: "money", label: "Деньги", description: "Про бюджет, траты и общие финансовые цели." },
    { id: "home", label: "Быт", description: "Про дом, порядок и договорённости, которые облегчают жизнь." },
    { id: "docs", label: "Документы", description: "Про бумаги, которые важно не потерять, и спокойные чек-листы." },
    { id: "relationships", label: "Отношения", description: "Про разговоры, границы и внимание друг к другу." }
  ];

  var CATEGORY_MAP = {};
  CATEGORIES.forEach(function (category) {
    CATEGORY_MAP[category.id] = category;
  });

  var MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];
  var MONTHS_SHORT = [
    "янв", "фев", "мар", "апр", "мая", "июн",
    "июл", "авг", "сен", "окт", "ноя", "дек"
  ];

  var DEFAULT_OG_IMAGE = "assets/og-cover.png";

  function getCategory(id) {
    return CATEGORY_MAP[id] || { id: id || "", label: "Материалы", description: "" };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value, short) {
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    if (short) {
      return date.getDate() + " " + MONTHS_SHORT[date.getMonth()] + " " + date.getFullYear();
    }
    return date.getDate() + " " + MONTHS[date.getMonth()] + " " + date.getFullYear();
  }

  function toIsoDate(value) {
    var date = value ? new Date(value) : new Date();
    if (isNaN(date.getTime())) return "";
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function getReadingTime(markdown) {
    var text = String(markdown || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_`~|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return "1 мин чтения";
    var words = text.split(" ").length;
    return Math.max(1, Math.ceil(words / 170)) + " мин чтения";
  }

  function plural(count, forms) {
    var number = Math.abs(Number(count)) % 100;
    var last = number % 10;
    if (number > 10 && number < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
  }

  function fallbackText(markdown) {
    return "<p>" + escapeHtml(markdown || "")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>") + "</p>";
  }

  function renderMarkdown(markdown) {
    if (!window.marked || typeof window.marked.parse !== "function") {
      return fallbackText(markdown);
    }

    var dirty;
    try {
      dirty = window.marked.parse(String(markdown || ""), { gfm: true, breaks: true });
    } catch (error) {
      console.error("Ошибка разбора Markdown:", error);
      return fallbackText(markdown);
    }

    var clean = dirty;
    if (window.DOMPurify && typeof window.DOMPurify.sanitize === "function") {
      clean = window.DOMPurify.sanitize(dirty, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target", "rel"]
      });
    }

    var template = document.createElement("template");
    template.innerHTML = clean;

    template.content.querySelectorAll("img").forEach(function (img) {
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", "async");

      var alt = (img.getAttribute("alt") || "").trim();
      var showCaption = alt && alt !== "Иллюстрация к статье" && alt !== "Иллюстрация";

      var figure = document.createElement("figure");
      img.replaceWith(figure);
      figure.appendChild(img);

      if (showCaption) {
        var caption = document.createElement("figcaption");
        caption.textContent = alt;
        figure.appendChild(caption);
      }
    });

    template.content.querySelectorAll("a[href]").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (/^https?:\/\//i.test(href)) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });

    return template.innerHTML;
  }

  function coverMarkup(post, options) {
    options = options || {};
    var category = getCategory(post && post.category);
    var title = post && post.title ? post.title : "";
    var cover = post && post.cover_url ? post.cover_url : "";
    var alt = options.alt == null ? title : options.alt;
    var loading = options.eager
      ? 'loading="eager" fetchpriority="high"'
      : 'loading="lazy"';

    return (
      '<div class="media ' + escapeHtml(options.className || "") + '">' +
        '<div class="media__fallback" aria-hidden="true">' +
          "<span>Вместе проще</span>" +
          "<strong>" + escapeHtml(category.label) + "</strong>" +
        "</div>" +
        (cover
          ? '<img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(alt) + '" ' + loading + ' decoding="async" data-cover>'
          : "") +
      "</div>"
    );
  }

  // Если картинка не загрузилась, остаётся типографическая заглушка.
  document.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target.tagName === "IMG" && target.hasAttribute("data-cover")) {
      target.remove();
    }
  }, true);

  function setActiveCategory(categoryId) {
    document.querySelectorAll(".rubrics a[data-category]").forEach(function (link) {
      if (categoryId && link.getAttribute("data-category") === categoryId) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function postUrl(id) {
    return "post.html?id=" + encodeURIComponent(id);
  }

  function isDevHost() {
    return (
      location.protocol === "file:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "0.0.0.0"
    );
  }

  function setMeta(selector, value) {
    var element = document.querySelector(selector);
    if (element && value) element.setAttribute("content", value);
  }

  function updateArticleMeta(data) {
    if (!data) return;
    var title = data.title + " — Вместе проще";
    var description = data.excerpt || "Онлайн-гид для молодых семей.";
    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:image"]', data.cover_url || DEFAULT_OG_IMAGE);
    setMeta('meta[property="og:url"]', location.href);
    setMeta('meta[property="og:type"]', "article");
  }

  function initChrome() {
    var dateElement = document.getElementById("headerDate");
    if (dateElement) {
      dateElement.textContent = formatDate(new Date());
      dateElement.setAttribute("datetime", toIsoDate(new Date()));
    }

    var yearElement = document.getElementById("copyrightYear");
    if (yearElement) {
      yearElement.textContent = String(new Date().getFullYear());
    }

    document.addEventListener("keydown", function (event) {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        (event.code === "KeyE" || String(event.key).toLowerCase() === "e")
      ) {
        event.preventDefault();
        window.location.href = "admin.html";
      }
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        ok ? resolve() : reject(new Error("Не удалось скопировать"));
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  initChrome();

  window.VP = {
    config: config,
    isConfigured: isConfigured,
    supabase: client,
    categories: CATEGORIES,
    getCategory: getCategory,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    toIsoDate: toIsoDate,
    getReadingTime: getReadingTime,
    plural: plural,
    renderMarkdown: renderMarkdown,
    coverMarkup: coverMarkup,
    setActiveCategory: setActiveCategory,
    postUrl: postUrl,
    isDevHost: isDevHost,
    updateArticleMeta: updateArticleMeta,
    copyText: copyText,
    DEFAULT_OG_IMAGE: DEFAULT_OG_IMAGE
  };
})();
