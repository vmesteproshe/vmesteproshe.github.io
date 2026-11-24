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

  // Рабочий список рубрик: начинаем с fallback, затем подменяем данными из БД.
  var categories = CATEGORIES.map(function (category) {
    return Object.assign({}, category);
  });
  var CATEGORY_MAP = {};
  var CATEGORY_CACHE_KEY = "vp_categories_cache";
  var categoriesLoaded = false;
  var categoriesRequest = null;

  function rebuildCategoryMap() {
    CATEGORY_MAP = {};
    categories.forEach(function (category) {
      CATEGORY_MAP[category.id] = category;
    });
  }

  // Рубрики всегда упорядочены по sort_order, затем по id из БД.
  function categorySortValue(item) {
    var value = item && item.sort_order != null ? item.sort_order : item && item.sortOrder;
    return Number(value) || 0;
  }

  function categoryDbId(item) {
    if (!item) return null;
    var value = item.dbId != null ? item.dbId : item.id;
    var number = Number(value);
    return isNaN(number) ? null : number;
  }

  function compareCategories(a, b) {
    var byOrder = categorySortValue(a) - categorySortValue(b);
    if (byOrder) return byOrder;

    var idA = categoryDbId(a);
    var idB = categoryDbId(b);
    if (idA !== null && idB !== null && idA !== idB) return idA - idB;

    var nameA = String((a && (a.name || a.label)) || "");
    var nameB = String((b && (b.name || b.label)) || "");
    return nameA.localeCompare(nameB, "ru");
  }

  rebuildCategoryMap();

  function categoryLabelFromId(id) {
    var known = CATEGORIES.find(function (category) {
      return category.id === id;
    });
    if (known) return known.label;
    return String(id || "")
      .split("-")
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ") || "Материалы";
  }

  function categoryDescription(label, id) {
    var known = CATEGORIES.find(function (category) {
      return category.id === id || category.label.toLowerCase() === String(label || "").toLowerCase();
    });
    return known ? known.description : "Материалы рубрики «" + label + "».";
  }

  function categorySlug(name, dbId) {
    var value = String(name || "").trim();
    var known = CATEGORIES.find(function (category) {
      return category.label.toLowerCase() === value.toLowerCase();
    });
    if (known) return known.id;
    return slugifyHeading(value) || "rubric-" + dbId;
  }

  function persistCategories() {
    var stored = categories.map(function (category) {
      return {
        id: category.id,
        label: category.label,
        description: category.description,
        dbId: category.dbId || null,
        sortOrder: Number(category.sortOrder) || 0
      };
    });

    try {
      window.localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.warn("Не удалось кэшировать рубрики:", error);
    }
  }

  // Применяет новый порядок рубрик к интерфейсу и кэшу (после сохранения в БД).
  function applyCategoryOrder(orderedIds) {
    if (!Array.isArray(orderedIds) || !orderedIds.length) return false;

    var byId = {};
    categories.forEach(function (category) {
      byId[category.id] = category;
    });

    var ordered = [];
    orderedIds.forEach(function (id) {
      var category = byId[id];
      if (category && ordered.indexOf(category) === -1) ordered.push(category);
    });
    categories.forEach(function (category) {
      if (ordered.indexOf(category) === -1) ordered.push(category);
    });
    if (!ordered.length) return false;

    ordered.forEach(function (category, index) {
      category.sortOrder = index;
    });
    categories.splice.apply(categories, [0, categories.length].concat(ordered));
    rebuildCategoryMap();
    persistCategories();
    syncSuggestCategories();
    syncCategoryNav();
    document.dispatchEvent(new CustomEvent("vp:categories", { detail: categories.slice() }));
    return true;
  }

  function applyCategoryRows(rows, persist) {
    if (!Array.isArray(rows) || !rows.length) return false;

    var sorted = rows.slice().sort(compareCategories);

    var used = {};
    var mapped = [];

    sorted.forEach(function (row) {
      var name = String(row.name || "").trim();
      if (!name) return;

      var id = categorySlug(name, row.id);
      if (used[id]) id = id + "-" + row.id;
      used[id] = true;

      mapped.push({
        id: id,
        label: name,
        description: categoryDescription(name, id),
        dbId: row.id,
        sortOrder: Number(row.sort_order) || 0
      });
    });

    if (!mapped.length) return false;

    categories.splice.apply(categories, [0, categories.length].concat(mapped));
    rebuildCategoryMap();

    if (persist) persistCategories();

    document.dispatchEvent(new CustomEvent("vp:categories", { detail: categories.slice() }));
    return true;
  }

  function readCachedCategories() {
    try {
      var raw = window.localStorage.getItem(CATEGORY_CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed)) return false;

      var cached = parsed.filter(function (item) {
        return item && typeof item.id === "string" && typeof item.label === "string";
      }).map(function (item) {
        return {
          id: item.id,
          label: item.label,
          description: item.description || categoryDescription(item.label, item.id),
          dbId: item.dbId || null,
          sortOrder: Number(item.sortOrder) || 0
        };
      });

      if (!cached.length) return false;
      cached.sort(compareCategories);
      categories.splice.apply(categories, [0, categories.length].concat(cached));
      rebuildCategoryMap();
      return true;
    } catch (error) {
      console.warn("Не удалось прочитать кэш рубрик:", error);
      return false;
    }
  }

  function seedCategoryFromLocation() {
    var id = "";
    try {
      id = new URLSearchParams(location.search).get("cat") || "";
    } catch (error) {
      id = "";
    }
    if (!id) {
      var hash = String(location.hash || "").replace(/^#/, "");
      if (hash && hash !== "all" && hash !== "top") id = hash;
    }
    if (!id || id === "all" || CATEGORY_MAP[id]) return;

    var label = categoryLabelFromId(id);
    categories.push({
      id: id,
      label: label,
      description: categoryDescription(label, id),
      dbId: null,
      sortOrder: 0,
      stub: true
    });
    rebuildCategoryMap();
  }

  async function fetchCategories(options) {
    options = options || {};

    if (!client) {
      return { data: categories.slice(), error: null, fallback: true };
    }
    if (categoriesRequest && !options.force) return categoriesRequest;

    var request = (async function () {
      var response = await client
        .from("categories")
        .select("id,name,sort_order")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (response.error) {
        categoriesLoaded = false;
        return { data: categories.slice(), error: response.error, fallback: true };
      }

      var applied = applyCategoryRows(response.data, true);
      categoriesLoaded = applied;
      return { data: categories.slice(), error: null, fallback: !applied };
    })().catch(function (error) {
      categoriesLoaded = false;
      return { data: categories.slice(), error: error, fallback: true };
    });

    categoriesRequest = request;
    try {
      return await request;
    } finally {
      if (categoriesRequest === request) categoriesRequest = null;
    }
  }

  function syncSuggestCategories() {
    var select = document.getElementById("suggestCategory");
    if (!select) return;

    var previous = select.value;
    var options = ['<option value="">Без рубрики</option>'].concat(categories.map(function (category) {
      return '<option value="' + escapeHtml(category.id) + '">' + escapeHtml(category.label) + "</option>";
    }));

    select.innerHTML = options.join("");
    if (categories.some(function (category) { return category.id === previous; })) {
      select.value = previous;
    }
  }

  function syncCategoryNav() {
    document.querySelectorAll(".rubrics").forEach(function (nav) {
      var allLink = nav.querySelector('a[data-category="all"]');
      var aboutLink = nav.querySelector(".rubrics__about");
      var managed = Array.prototype.slice.call(nav.querySelectorAll("a[data-vp-category-link]"));

      categories.forEach(function (category, index) {
        var link = managed[index];
        if (!link) {
          link = document.createElement("a");
          link.setAttribute("data-vp-new", "true");
          nav.insertBefore(link, aboutLink || null);
        }

        link.textContent = category.label;
        link.setAttribute("href", categoryUrl(category.id));
        link.setAttribute("data-category", category.id);
        link.setAttribute("data-vp-category-link", "true");
      });

      managed.slice(categories.length).forEach(function (link) {
        if (link !== allLink && link !== aboutLink) link.remove();
      });
    });

    document.querySelectorAll('.footer-nav[aria-label="Рубрики в подвале"]').forEach(function (nav) {
      nav.innerHTML = categories.map(function (category) {
        return '<a href="' + escapeHtml(categoryUrl(category.id)) +
          '" data-category="' + escapeHtml(category.id) + '">' +
          escapeHtml(category.label) + "</a>";
      }).join("");
    });
  }

  function bindCategoryNavClicks() {
    document.querySelectorAll(".rubrics").forEach(function (nav) {
      if (nav.getAttribute("data-vp-nav-bound")) return;
      nav.setAttribute("data-vp-nav-bound", "true");
      nav.addEventListener("click", function (event) {
        var link = event.target.closest("a[data-vp-new]");
        if (!link) return;
        event.preventDefault();
        window.location.href = categoryUrl(link.getAttribute("data-category"));
      });
    });
  }

  document.addEventListener("vp:categories", function () {
    syncSuggestCategories();
    syncCategoryNav();
  });

  var COVER_VARIANTS = [
    { id: "default", label: "Базовая" },
    { id: "coral", label: "Коралл" },
    { id: "ink", label: "Тёмная" },
    { id: "mint", label: "Мята" },
    { id: "sand", label: "Песок" },
    { id: "grid", label: "Сетка" }
  ];

  var COVER_VARIANT_IDS = COVER_VARIANTS.map(function (variant) {
    return variant.id;
  });

  var WORDS_PER_MINUTE = 150;

  var MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];
  var MONTHS_SHORT = [
    "янв", "фев", "мар", "апр", "мая", "июн",
    "июл", "авг", "сен", "окт", "ноя", "дек"
  ];

  var DEFAULT_OG_IMAGE = "https://vmesteproshe.github.io/assets/og-cover.png";

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

  function plainText(markdown) {
    return String(markdown || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_`~|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function readingMinutes(markdown) {
    var text = plainText(markdown);
    if (!text) return 1;
    var words = text.split(" ").filter(Boolean).length;
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  }

  function getReadingTime(markdown, short) {
    var minutes = readingMinutes(markdown);
    return short ? minutes + " мин" : minutes + " мин чтения";
  }

  function normalizeCoverVariant(value) {
    var variant = String(value || "").trim().toLowerCase();
    return COVER_VARIANT_IDS.indexOf(variant) === -1 ? "default" : variant;
  }

  function normalizePost(post) {
    var normalized = Object.assign({}, post || {});
    normalized.status = normalized.status === "draft" ? "draft" : "published";
    normalized.cover_variant = normalizeCoverVariant(normalized.cover_variant);
    normalized.is_featured = normalized.is_featured === true;
    return normalized;
  }

  function isPublished(post) {
    return !post || !post.status || post.status === "published";
  }

  function isMissingColumnError(error) {
    var message = error && (error.message || error.details || error.hint);
    return /42703|PGRST204|column .* does not exist|schema cache/i.test(String(message || ""));
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

  function renderMarkdown(markdown, options) {
    options = options || {};
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
      if (/^(?:https?:)?\/\//i.test(href)) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });

    // Чек-листы из Markdown остаются кликабельными в статье.
    template.content.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
      checkbox.removeAttribute("disabled");
      checkbox.setAttribute("aria-label", "Отметить пункт чек-листа");
    });

    var toc = options.toc ? buildTableOfContents(template.content) : "";
    return toc + template.innerHTML;
  }

  var TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "",
    "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya"
  };

  function slugifyHeading(value) {
    return String(value || "")
      .toLowerCase()
      .split("")
      .map(function (char) {
        if (Object.prototype.hasOwnProperty.call(TRANSLIT, char)) return TRANSLIT[char];
        if (/[a-z0-9]/.test(char)) return char;
        if (/\s|[-–—]/.test(char)) return "-";
        return "";
      })
      .join("")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  // Оглавление показываем, только если в статье больше трёх подзаголовков h2.
  function buildTableOfContents(container) {
    var headings = Array.prototype.slice.call(container.querySelectorAll("h2"));
    if (headings.length <= 3) return "";

    var used = {};
    var items = headings.map(function (heading) {
      var label = (heading.textContent || "").trim() || "Раздел";
      var base = slugifyHeading(label) || "section";
      var id = base;
      var index = 2;

      while (used[id]) {
        id = base + "-" + index;
        index += 1;
      }
      used[id] = true;
      heading.id = id;

      return '<li><a href="#' + escapeHtml(id) + '">' + escapeHtml(label) + "</a></li>";
    });

    return (
      '<nav class="article-toc" aria-label="Содержание">' +
        '<p class="article-toc__title">Содержание</p>' +
        "<ol>" + items.join("") + "</ol>" +
      "</nav>"
    );
  }

  function coverMarkup(post, options) {
    options = options || {};
    var category = getCategory(post && post.category);
    var title = post && post.title ? post.title : "";
    var cover = post && post.cover_url ? post.cover_url : "";
    var variant = normalizeCoverVariant(post && post.cover_variant);
    var alt = options.alt == null ? title : options.alt;
    var loading = options.eager
      ? 'loading="eager" fetchpriority="high"'
      : 'loading="lazy"';

    return (
      '<div class="media media--variant-' + variant + " " + escapeHtml(options.className || "") + '">' +
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

  function homePostUrl(id) {
    return "./?post=" + encodeURIComponent(id);
  }

  function categoryUrl(id) {
    return !id || id === "all" ? "./" : "./?cat=" + encodeURIComponent(id);
  }

  var POST_FIELDS_FULL =
    "id,title,category,excerpt,content,cover_url,cover_variant,author,status,is_featured,created_at";
  var POST_FIELDS_LEGACY =
    "id,title,category,excerpt,content,cover_url,is_featured,created_at";

  async function fetchPublishedPosts(options) {
    options = options || {};

    if (!client) {
      return { data: [], error: null, legacy: false };
    }

    function buildQuery(fields, filterByStatus) {
      var query = client.from("posts").select(fields);

      if (filterByStatus) query = query.eq("status", "published");
      if (options.excludeId) query = query.neq("id", options.excludeId);
      if (options.category) query = query.eq("category", options.category);

      query = query.order("created_at", { ascending: false });
      if (options.limit) query = query.limit(options.limit);
      return query;
    }

    var response = await buildQuery(POST_FIELDS_FULL, true);
    var legacy = false;

    // Если миграция ещё не применена, читаем старую схему и считаем все статьи опубликованными.
    if (response.error && isMissingColumnError(response.error)) {
      response = await buildQuery(POST_FIELDS_LEGACY, false);
      legacy = true;
    }

    if (response.error) {
      return { data: [], error: response.error, legacy: legacy };
    }

    return {
      data: (Array.isArray(response.data) ? response.data : []).map(normalizePost),
      error: null,
      legacy: legacy
    };
  }

  async function fetchPostById(id) {
    if (!client || !id) return { data: null, error: null };

    var response = await client.from("posts").select("*").eq("id", id).maybeSingle();
    if (response.error) return { data: null, error: response.error };

    return {
      data: response.data ? normalizePost(response.data) : null,
      error: null
    };
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

  function suggestFormMarkup() {
    var options = categories.map(function (category) {
      return '<option value="' + escapeHtml(category.id) + '">' + escapeHtml(category.label) + "</option>";
    }).join("");

    return (
      '<section class="suggest" aria-labelledby="suggestTitle">' +
        '<div class="container suggest__inner">' +
          '<div class="suggest__intro">' +
            '<p class="eyebrow">Обратная связь</p>' +
            '<h2 id="suggestTitle">Предложить тему</h2>' +
            '<p>Расскажите, о чём стоит написать. Вопросы читателей помогают выбрать следующий материал — мы читаем каждую заявку.</p>' +
          "</div>" +
          '<form class="suggest__form" id="suggestForm" novalidate>' +
            '<div class="field">' +
              '<label for="suggestCategory">Рубрика</label>' +
              '<select class="field-input" id="suggestCategory" name="category">' +
                '<option value="">Без рубрики</option>' +
                options +
              "</select>" +
            "</div>" +
            '<div class="field field--wide">' +
              '<label for="suggestTopic">Вопрос или тема</label>' +
              '<textarea class="field-input field-textarea" id="suggestTopic" name="topic" rows="3" maxlength="1000" required placeholder="Например: как делить расходы, если доходы разные?"></textarea>' +
            "</div>" +
            '<div class="field field--wide">' +
              '<label for="suggestContact">Контакт для ответа <span class="field-optional">необязательно</span></label>' +
              '<input class="field-input" id="suggestContact" name="contact" type="text" maxlength="200" autocomplete="email" placeholder="Почта или телеграм">' +
            "</div>" +
            '<p class="form-error" id="suggestError" role="alert" hidden></p>' +
            '<div class="suggest__actions">' +
              '<button class="btn" id="suggestSubmit" type="submit">Отправить тему</button>' +
              '<p class="field-status" id="suggestStatus" role="status" aria-live="polite"></p>' +
            "</div>" +
          "</form>" +
        "</div>" +
      "</section>"
    );
  }

  function initTopicSuggestForm() {
    if (!document.getElementById("suggestForm")) {
      var footer = document.querySelector(".site-footer");
      if (footer) footer.insertAdjacentHTML("afterbegin", suggestFormMarkup());
    }

    var form = document.getElementById("suggestForm");
    if (!form) return;

    var categoryInput = document.getElementById("suggestCategory");
    var topicInput = document.getElementById("suggestTopic");
    var contactInput = document.getElementById("suggestContact");
    var errorElement = document.getElementById("suggestError");
    var statusElement = document.getElementById("suggestStatus");
    var submitButton = document.getElementById("suggestSubmit");

    function showError(message) {
      if (!errorElement) return;
      errorElement.textContent = message || "";
      errorElement.hidden = !message;
    }

    function showStatus(message, isError) {
      if (!statusElement) return;
      statusElement.textContent = message || "";
      statusElement.classList.toggle("is-error", Boolean(isError));
      statusElement.classList.toggle("is-success", Boolean(message) && !isError);
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      showError("");
      showStatus("");

      var topic = topicInput ? topicInput.value.trim() : "";
      var contact = contactInput ? contactInput.value.trim() : "";
      var category = categoryInput ? categoryInput.value : "";

      if (topic.length < 3) {
        showError("Напишите вопрос или тему — хотя бы несколько слов.");
        if (topicInput) topicInput.focus();
        return;
      }

      if (!client) {
        showError("Форма временно недоступна: сайт не подключён к базе данных.");
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Отправляем…";
      }
      showStatus("Отправляем заявку…");

      try {
        var response = await client.from("topic_suggestions").insert({
          category: category || null,
          topic: topic,
          contact: contact || null
        });

        if (response.error) throw response.error;

        form.reset();
        showStatus("Спасибо! Тема отправлена редакции.");
        if (submitButton) submitButton.textContent = "Отправить ещё";
      } catch (error) {
        console.error("Ошибка отправки темы:", error);
        if (isMissingColumnError(error) || /42P01|relation .* does not exist/i.test(String(error.message || ""))) {
          showError("Форма пока не настроена. Выполните sql/migration_v2.sql в Supabase.");
        } else if (/row-level security|42501/i.test(String(error.message || ""))) {
          showError("Не удалось отправить заявку: нет прав на запись. Попробуйте позже.");
        } else if (/failed to fetch|network|load failed/i.test(String(error.message || ""))) {
          showError("Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.");
        } else {
          showError("Не удалось отправить тему. Попробуйте ещё раз чуть позже.");
        }
        showStatus("");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          if (submitButton.textContent === "Отправляем…") submitButton.textContent = "Отправить тему";
        }
      }
    });
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

  readCachedCategories();
  seedCategoryFromLocation();
  bindCategoryNavClicks();
  syncCategoryNav();
  initChrome();
  initTopicSuggestForm();
  syncSuggestCategories();

  if (client) fetchCategories();

  window.VP = {
    config: config,
    isConfigured: isConfigured,
    supabase: client,
    categories: categories,
    fetchCategories: fetchCategories,
    applyCategoryOrder: applyCategoryOrder,
    coverVariants: COVER_VARIANTS,
    getCategory: getCategory,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    toIsoDate: toIsoDate,
    getReadingTime: getReadingTime,
    readingMinutes: readingMinutes,
    plainText: plainText,
    plural: plural,
    renderMarkdown: renderMarkdown,
    coverMarkup: coverMarkup,
    normalizeCoverVariant: normalizeCoverVariant,
    normalizePost: normalizePost,
    isPublished: isPublished,
    isMissingColumnError: isMissingColumnError,
    fetchPublishedPosts: fetchPublishedPosts,
    fetchPostById: fetchPostById,
    setActiveCategory: setActiveCategory,
    postUrl: postUrl,
    homePostUrl: homePostUrl,
    categoryUrl: categoryUrl,
    isDevHost: isDevHost,
    updateArticleMeta: updateArticleMeta,
    copyText: copyText,
    DEFAULT_OG_IMAGE: DEFAULT_OG_IMAGE
  };
})();
