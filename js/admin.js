/* ============================================================
   Редакционная панель «Вместе проще»
   ============================================================ */
(function () {
  "use strict";

  var VP = window.VP || {};
  var supabase = VP.supabase || null;

  function $(id) {
    return document.getElementById(id);
  }

  var els = {
    loginView: $("loginView"),
    configNotice: $("configNotice"),
    loginForm: $("loginForm"),
    loginEmail: $("loginEmail"),
    loginPassword: $("loginPassword"),
    loginError: $("loginError"),
    loginSubmit: $("loginSubmit"),
    appView: $("appView"),
    adminSession: $("adminSession"),
    adminEmail: $("adminEmail"),
    logoutBtn: $("logoutBtn"),
    adminLoading: $("adminLoading"),
    adminWorkspace: $("adminWorkspace"),
    adminTabs: $("adminTabs"),
    tabPosts: $("tabPosts"),
    tabSuggestions: $("tabSuggestions"),
    tabAbout: $("tabAbout"),
    postsPanel: $("postsPanel"),
    suggestionsPanel: $("suggestionsPanel"),
    editorPanel: $("editorPanel"),
    aboutPanel: $("aboutPanel"),
    postsCount: $("postsCount"),
    postsList: $("postsList"),
    statusFilter: $("statusFilter"),
    newPostBtn: $("newPostBtn"),
    suggestionsCount: $("suggestionsCount"),
    suggestionsList: $("suggestionsList"),
    reloadSuggestionsBtn: $("reloadSuggestionsBtn"),
    editorTitle: $("editorTitle"),
    editorSaveStatus: $("editorSaveStatus"),
    savePostBtn: $("savePostBtn"),
    savePostBtnBottom: $("savePostBtnBottom"),
    backToListBtn: $("backToListBtn"),
    postForm: $("postForm"),
    postTitle: $("postTitle"),
    postExcerpt: $("postExcerpt"),
    excerptCounter: $("excerptCounter"),
    postContent: $("postContent"),
    editorToolbar: $("editorToolbar"),
    postPreviewWrap: $("postPreviewWrap"),
    postPreview: $("postPreview"),
    previewToggleBtn: $("previewToggleBtn"),
    inlineImageInput: $("inlineImageInput"),
    inlineImageBtn: $("inlineImageBtn"),
    inlineUploadStatus: $("inlineUploadStatus"),
    coverInput: $("coverInput"),
    coverChooseBtn: $("coverChooseBtn"),
    coverRemoveBtn: $("coverRemoveBtn"),
    coverPreview: $("coverPreview"),
    coverVariants: $("coverVariants"),
    cardPreview: $("cardPreview"),
    coverUrl: $("coverUrl"),
    coverStatus: $("coverStatus"),
    postCategory: $("postCategory"),
    postFeatured: $("postFeatured"),
    postFormError: $("postFormError"),
    cancelEditBtn: $("cancelEditBtn"),
    deletePostBtn: $("deletePostBtn"),
    aboutForm: $("aboutForm"),
    aboutTitleInput: $("aboutTitleInput"),
    aboutContentInput: $("aboutContentInput"),
    aboutPreview: $("aboutPreview"),
    aboutFormError: $("aboutFormError"),
    saveAboutBtn: $("saveAboutBtn"),
    aboutSaveStatus: $("aboutSaveStatus"),
    confirmDialog: $("confirmDialog"),
    confirmTitle: $("confirmTitle"),
    confirmText: $("confirmText"),
    confirmActionBtn: $("confirmActionBtn"),
    toast: $("toast")
  };

  var state = {
    userId: null,
    posts: [],
    editingId: null,
    aboutLoaded: false,
    aboutLoading: false,
    editorDirty: false,
    statusFilter: "all",
    coverVariant: "default",
    suggestions: [],
    suggestionsLoaded: false,
    suggestionsLoading: false,
    editorStatus: "published"
  };

  var confirmResolve = null;
  var toastTimer = null;
  var postPreviewTimer = null;
  var aboutPreviewTimer = null;

  /* ---------- Служебное ---------- */

  function toast(message, isError) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.toggle("is-error", Boolean(isError));
    els.toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.hidden = true;
    }, 3800);
  }

  function setStatus(element, text, isError) {
    if (!element) return;
    element.textContent = text || "";
    element.classList.toggle("is-error", Boolean(isError));
  }

  function apiErrorMessage(error) {
    var message = error && error.message ? String(error.message) : "";
    if (/row-level security|42501/i.test(message)) {
      return "Нет прав на это действие. Проверьте RLS-политики и войдите заново.";
    }
    if (/42703|column .* does not exist|PGRST204/i.test(message)) {
      return "В базе нет новых полей. Выполните sql/migration_v2.sql в Supabase.";
    }
    if (/schema cache|does not exist|42P01/i.test(message)) {
      return "Таблица не найдена. Выполните SQL-скрипты из папки sql.";
    }
    if (/invalid api key|apikey|jwt/i.test(message)) {
      return "Проблема с ключом или сессией. Проверьте config.js и войдите заново.";
    }
    if (/failed to fetch|network|load failed/i.test(message)) {
      return "Не удалось связаться с Supabase. Проверьте интернет и настройки.";
    }
    return message || "Неизвестная ошибка. Попробуйте ещё раз.";
  }

  function storageErrorMessage(error) {
    var message = error && error.message ? String(error.message) : "";
    if (/bucket not found/i.test(message)) {
      return "Бакет media не найден. Создайте его по инструкции из README.";
    }
    if (/row-level security|unauthorized|not allowed/i.test(message)) {
      return "Нет прав на загрузку. Проверьте политики Storage и войдите заново.";
    }
    if (/payload too large|maximum allowed size|too large/i.test(message)) {
      return "Файл слишком большой. Максимум — 8 МБ.";
    }
    if (/mime|content type/i.test(message)) {
      return "Этот формат изображения не разрешён.";
    }
    return message || "Не удалось загрузить файл.";
  }

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function triggerInput(element) {
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* ---------- Модальное подтверждение ---------- */

  function askConfirm(options) {
    if (!els.confirmDialog || typeof els.confirmDialog.showModal !== "function") {
      return Promise.resolve(window.confirm(options.title + "\n\n" + options.text));
    }

    return new Promise(function (resolve) {
      confirmResolve = resolve;
      els.confirmTitle.textContent = options.title;
      els.confirmText.textContent = options.text || "";
      els.confirmActionBtn.textContent = options.confirmLabel || "Удалить";
      els.confirmDialog.returnValue = "cancel";
      els.confirmDialog.showModal();
    });
  }

  if (els.confirmDialog) {
    els.confirmDialog.addEventListener("close", function () {
      var resolve = confirmResolve;
      confirmResolve = null;
      if (resolve) resolve(els.confirmDialog.returnValue === "confirm");
    });
  }

  /* ---------- Конфигурация и вход ---------- */

  function disableLogin() {
    els.loginEmail.disabled = true;
    els.loginPassword.disabled = true;
    els.loginSubmit.disabled = true;
  }

  function setupConfiguration() {
    if (!VP.isConfigured) {
      els.configNotice.hidden = false;
      disableLogin();
      return;
    }

    if (!supabase) {
      els.configNotice.hidden = false;
      els.configNotice.textContent = "Не удалось загрузить библиотеку Supabase. Проверьте соединение с интернетом и обновите страницу.";
      disableLogin();
    }
  }

  function showLogin() {
    els.loginView.hidden = false;
    els.appView.hidden = true;
    els.adminSession.hidden = true;
    els.adminEmail.textContent = "";
    els.adminLoading.hidden = true;
    els.adminWorkspace.hidden = true;
    els.loginError.hidden = true;
    state.posts = [];
    state.editingId = null;
    state.aboutLoaded = false;
    state.editorDirty = false;
    state.suggestions = [];
    state.suggestionsLoaded = false;
    state.suggestionsLoading = false;
  }

  function showApp(user) {
    els.loginView.hidden = true;
    els.appView.hidden = false;
    els.adminSession.hidden = false;
    els.adminEmail.textContent = user.email || "";
    els.loginError.hidden = true;
    loadWorkspace();
  }

  function handleSession(session) {
    if (session && session.user) {
      if (state.userId === session.user.id) return;
      state.userId = session.user.id;
      showApp(session.user);
      return;
    }

    if (state.userId !== null) {
      state.userId = null;
      showLogin();
    }
  }

  function loginErrorMessage(error) {
    var message = error && error.message ? String(error.message) : "";
    if (/invalid login credentials/i.test(message)) return "Неверная почта или пароль.";
    if (/email not confirmed/i.test(message)) return "Почта не подтверждена. Подтвердите пользователя в Supabase.";
    if (/invalid api key/i.test(message)) return "Неверный anon-ключ в config.js.";
    if (/failed to fetch|network/i.test(message)) return "Не удалось связаться с Supabase. Проверьте интернет.";
    return message || "Не удалось войти. Попробуйте ещё раз.";
  }

  function showLoginError(message) {
    els.loginError.textContent = message;
    els.loginError.hidden = false;
  }

  function initAuth() {
    if (!supabase) return;

    supabase.auth.onAuthStateChange(function (_event, session) {
      window.setTimeout(function () {
        handleSession(session);
      }, 0);
    });

    supabase.auth.getSession().then(function (response) {
      if (response.error) {
        console.error("Не удалось получить сессию:", response.error);
        return;
      }
      handleSession(response.data ? response.data.session : null);
    }).catch(function (error) {
      console.error("Ошибка авторизации:", error);
    });
  }

  els.loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!supabase) return;

    els.loginError.hidden = true;
    var email = els.loginEmail.value.trim();
    var password = els.loginPassword.value;

    if (!email || email.indexOf("@") === -1) {
      showLoginError("Введите почту.");
      els.loginEmail.focus();
      return;
    }

    if (!password) {
      showLoginError("Введите пароль.");
      els.loginPassword.focus();
      return;
    }

    els.loginSubmit.disabled = true;
    els.loginSubmit.textContent = "Входим…";

    try {
      var response = await supabase.auth.signInWithPassword({ email: email, password: password });
      if (response.error) {
        showLoginError(loginErrorMessage(response.error));
        els.loginPassword.select();
        return;
      }
      els.loginForm.reset();
      handleSession(response.data ? response.data.session : null);
    } catch (error) {
      console.error("Ошибка входа:", error);
      showLoginError(loginErrorMessage(error));
    } finally {
      els.loginSubmit.disabled = false;
      els.loginSubmit.textContent = "Войти";
    }
  });

  els.logoutBtn.addEventListener("click", async function () {
    if (!supabase) return;
    els.logoutBtn.disabled = true;
    try {
      var response = await supabase.auth.signOut();
      if (response.error) throw response.error;
      state.userId = null;
      showLogin();
    } catch (error) {
      console.error("Ошибка выхода:", error);
      toast("Не удалось выйти. Попробуйте ещё раз.", true);
    } finally {
      els.logoutBtn.disabled = false;
    }
  });

  /* ---------- Оболочка панели ---------- */

  function setActiveTab(name) {
    [els.tabPosts, els.tabSuggestions, els.tabAbout].forEach(function (tab) {
      if (!tab) return;
      var active = tab.getAttribute("data-tab") === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function showPanel(name) {
    els.postsPanel.hidden = name !== "posts";
    els.editorPanel.hidden = name !== "editor";
    els.aboutPanel.hidden = name !== "about";
    els.suggestionsPanel.hidden = name !== "suggestions";
    els.adminTabs.hidden = name === "editor";
    if (name === "posts" || name === "suggestions" || name === "about") setActiveTab(name);
  }

  async function fetchPosts() {
    var response = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (response.error) throw response.error;
    state.posts = (Array.isArray(response.data) ? response.data : []).map(function (post) {
      var normalized = VP.normalizePost ? VP.normalizePost(post) : post;
      normalized.status = normalized.status === "draft" ? "draft" : "published";
      normalized.cover_variant = VP.normalizeCoverVariant
        ? VP.normalizeCoverVariant(normalized.cover_variant)
        : normalized.cover_variant || "default";
      return normalized;
    });
    renderPosts();
  }

  async function loadWorkspace() {
    els.adminWorkspace.hidden = true;
    els.adminLoading.hidden = false;
    els.adminLoading.textContent = "Загружаем материалы…";

    try {
      await fetchPosts();
      els.adminLoading.hidden = true;
      els.adminWorkspace.hidden = false;
      showPanel("posts");
    } catch (error) {
      console.error("Ошибка загрузки статей:", error);
      els.adminLoading.hidden = true;
      els.adminWorkspace.hidden = false;
      els.postsCount.textContent = "";
      els.postsList.innerHTML =
        '<div class="admin-empty">' +
          "<p>" + VP.escapeHtml(apiErrorMessage(error)) + "</p>" +
          '<button class="btn btn--secondary" type="button" data-reload-posts>Повторить</button>' +
        "</div>";
      showPanel("posts");
      toast("Не удалось загрузить статьи.", true);
    }
  }

  /* ---------- Список статей ---------- */

  function thumbnailMarkup(post) {
    var category = VP.getCategory(post.category);
    return (
      '<div class="admin-post__thumb">' +
        '<div class="media__fallback" aria-hidden="true"><span>ВП</span><strong>' +
          VP.escapeHtml(category.label) + "</strong></div>" +
        (post.cover_url
          ? '<img src="' + VP.escapeHtml(post.cover_url) + '" alt="" loading="lazy" data-cover>'
          : "") +
      "</div>"
    );
  }

  function postRowMarkup(post) {
    var category = VP.getCategory(post.category);
    var isDraft = post.status === "draft";
    return (
      '<article class="admin-post">' +
        thumbnailMarkup(post) +
        "<div>" +
          '<div class="admin-post__meta">' +
            '<span class="tag">' + VP.escapeHtml(category.label) + "</span>" +
            '<time datetime="' + VP.escapeHtml(VP.toIsoDate(post.created_at)) + '">' +
              VP.escapeHtml(VP.formatDate(post.created_at, true)) + "</time>" +
            '<span class="admin-status ' + (isDraft ? "admin-status--draft" : "admin-status--published") + '">' +
              (isDraft ? "Черновик" : "Опубликовано") + "</span>" +
            (post.is_featured ? '<span class="admin-featured-badge">Главная</span>' : "") +
          "</div>" +
          '<h3 class="admin-post__title">' +
            '<button type="button" data-edit="' + VP.escapeHtml(post.id) + '">' +
              VP.escapeHtml(post.title || "Без заголовка") +
            "</button>" +
          "</h3>" +
          (post.excerpt ? '<p class="admin-post__excerpt">' + VP.escapeHtml(post.excerpt) + "</p>" : "") +
        "</div>" +
        '<div class="admin-post__actions">' +
          '<button class="text-btn" type="button" data-edit="' + VP.escapeHtml(post.id) + '">Редактировать</button>' +
          '<button class="text-btn text-btn--danger" type="button" data-delete="' + VP.escapeHtml(post.id) + '">Удалить</button>' +
        "</div>" +
      "</article>"
    );
  }

  function renderPosts() {
    var total = state.posts.length;
    var drafts = state.posts.filter(function (post) { return post.status === "draft"; }).length;
    var published = total - drafts;

    els.postsCount.textContent = total
      ? total + " " + VP.plural(total, ["материал", "материала", "материалов"]) +
        " · " + published + " " + VP.plural(published, ["опубликован", "опубликовано", "опубликовано"]) +
        " · " + drafts + " " + VP.plural(drafts, ["черновик", "черновика", "черновиков"])
      : "Пока ни одной статьи";

    var posts = state.statusFilter === "all"
      ? state.posts
      : state.posts.filter(function (post) {
          return post.status === state.statusFilter;
        });

    if (!total) {
      els.postsList.innerHTML =
        '<div class="admin-empty">' +
          "<p>Здесь появятся статьи. Начните с первой — она сразу окажется на главной.</p>" +
          '<button class="btn" type="button" data-new-post>Новая статья</button>' +
        "</div>";
      return;
    }

    if (!posts.length) {
      els.postsList.innerHTML =
        '<div class="admin-empty"><p>Нет материалов с таким статусом.</p></div>';
      return;
    }

    els.postsList.innerHTML = posts.map(postRowMarkup).join("");
  }

  els.postsList.addEventListener("click", function (event) {
    var editTrigger = event.target.closest("[data-edit]");
    var deleteTrigger = event.target.closest("[data-delete]");
    var newTrigger = event.target.closest("[data-new-post]");
    var reloadTrigger = event.target.closest("[data-reload-posts]");

    if (reloadTrigger) {
      loadWorkspace();
      return;
    }

    if (newTrigger) {
      openEditor(null);
      return;
    }

    if (editTrigger) {
      var postId = editTrigger.getAttribute("data-edit");
      var post = state.posts.find(function (item) { return item.id === postId; });
      if (post) openEditor(post);
      return;
    }

    if (deleteTrigger) {
      var deleteId = deleteTrigger.getAttribute("data-delete");
      var targetPost = state.posts.find(function (item) { return item.id === deleteId; });
      if (targetPost) deletePost(targetPost);
    }
  });

  els.newPostBtn.addEventListener("click", function () {
    openEditor(null);
  });

  els.tabPosts.addEventListener("click", function () {
    showPanel("posts");
  });

  els.tabSuggestions.addEventListener("click", function () {
    showSuggestions();
  });

  els.tabAbout.addEventListener("click", function () {
    showAbout();
  });

  if (els.statusFilter) {
    els.statusFilter.addEventListener("change", function () {
      state.statusFilter = els.statusFilter.value;
      renderPosts();
    });
  }

  /* ---------- Редактор статьи ---------- */

  function updateExcerptCounter() {
    els.excerptCounter.textContent = els.postExcerpt.value.length + " / 240";
  }

  function resetPreview() {
    els.postPreviewWrap.hidden = true;
    els.previewToggleBtn.textContent = "Показать предпросмотр статьи";
    if (els.postPreview) els.postPreview.innerHTML = "";
  }

  function getEditorStatus() {
    var checked = document.querySelector('input[name="postStatus"]:checked');
    return checked && checked.value === "draft" ? "draft" : "published";
  }

  function setEditorStatus(status) {
    state.editorStatus = status === "draft" ? "draft" : "published";
    document.querySelectorAll('input[name="postStatus"]').forEach(function (radio) {
      radio.checked = radio.value === state.editorStatus;
    });
  }

  function editorDraftPost() {
    return {
      id: "preview",
      title: els.postTitle ? els.postTitle.value.trim() : "",
      excerpt: els.postExcerpt ? els.postExcerpt.value.trim() : "",
      content: els.postContent ? els.postContent.value : "",
      category: els.postCategory ? els.postCategory.value : "money",
      cover_url: els.coverUrl ? els.coverUrl.value.trim() : "",
      cover_variant: state.coverVariant,
      status: getEditorStatus(),
      is_featured: Boolean(els.postFeatured && els.postFeatured.checked),
      created_at: new Date().toISOString()
    };
  }

  function renderCoverVariants() {
    if (!els.coverVariants) return;

    els.coverVariants.innerHTML = VP.coverVariants.map(function (variant) {
      return (
        '<button class="cover-variant" type="button" role="radio" aria-checked="false" data-variant="' +
          VP.escapeHtml(variant.id) + '" title="' + VP.escapeHtml(variant.label) + '">' +
          '<span class="cover-variant__swatch" data-variant="' + VP.escapeHtml(variant.id) + '"></span>' +
          '<span class="cover-variant__label">' + VP.escapeHtml(variant.label) + "</span>" +
        "</button>"
      );
    }).join("");

    els.coverVariants.addEventListener("click", function (event) {
      var button = event.target.closest("[data-variant]");
      if (!button) return;
      setCoverVariant(button.getAttribute("data-variant"));
      state.editorDirty = true;
    });
  }

  function setCoverVariant(variant) {
    state.coverVariant = VP.normalizeCoverVariant(variant);

    if (els.coverVariants) {
      els.coverVariants.querySelectorAll("[data-variant]").forEach(function (button) {
        var active = button.getAttribute("data-variant") === state.coverVariant;
        button.setAttribute("aria-checked", active ? "true" : "false");
        button.classList.toggle("is-active", active);
      });
    }

    renderCoverPreview();
    updateCardPreview();
  }

  function renderCoverPreview() {
    if (!els.coverPreview) return;
    els.coverPreview.innerHTML = VP.coverMarkup(editorDraftPost(), { className: "media--preview" });
  }

  function updateCardPreview() {
    if (!els.cardPreview) return;

    var post = editorDraftPost();
    var category = VP.getCategory(post.category);
    var title = post.title || "Заголовок статьи";
    var date = VP.formatDate(post.created_at);

    els.cardPreview.innerHTML =
      '<article class="card card--preview">' +
        '<div class="card__media">' + VP.coverMarkup(post, { className: "media--card" }) + "</div>" +
        '<div class="card__body">' +
          '<div class="card__preview-badges">' +
            (post.status === "draft"
              ? '<span class="admin-status admin-status--draft">Черновик</span>'
              : '<span class="admin-status admin-status--published">Опубликовано</span>') +
            (post.is_featured ? '<span class="admin-featured-badge">Главная</span>' : "") +
          "</div>" +
          '<span class="tag">' + VP.escapeHtml(category.label) + "</span>" +
          '<h3 class="card__title">' + VP.escapeHtml(title) + "</h3>" +
          (post.excerpt ? '<p class="card__excerpt">' + VP.escapeHtml(post.excerpt) + "</p>" : "") +
          '<div class="card__date"><time datetime="' + VP.escapeHtml(VP.toIsoDate(post.created_at)) + '">' +
            VP.escapeHtml(date) + "</time><span>" + VP.escapeHtml(VP.getReadingTime(post.content, true)) + "</span></div>" +
        "</div>" +
      "</article>";
  }

  function updatePostPreview() {
    if (!els.postPreview) return;

    var post = editorDraftPost();
    var category = VP.getCategory(post.category);
    var content = String(post.content || "").trim();
    var body = content
      ? VP.renderMarkdown(content)
      : '<p class="field-hint">Начните печатать — здесь появится готовая статья.</p>';

    els.postPreview.innerHTML =
      '<article class="article-preview">' +
        '<div class="article-preview__head">' +
          '<div class="card__preview-badges">' +
            (post.status === "draft"
              ? '<span class="admin-status admin-status--draft">Черновик</span>'
              : '<span class="admin-status admin-status--published">Опубликовано</span>') +
            (post.is_featured ? '<span class="admin-featured-badge">Главная</span>' : "") +
          "</div>" +
          '<span class="tag">' + VP.escapeHtml(category.label) + "</span>" +
          '<h1 class="article-preview__title">' + VP.escapeHtml(post.title || "Заголовок статьи") + "</h1>" +
          (post.excerpt ? '<p class="article-dek">' + VP.escapeHtml(post.excerpt) + "</p>" : "") +
          '<div class="article-meta"><time datetime="' + VP.escapeHtml(VP.toIsoDate(post.created_at)) + '">' +
            VP.escapeHtml(VP.formatDate(post.created_at)) + "</time><span>" +
            VP.escapeHtml(VP.getReadingTime(post.content, true)) + "</span></div>" +
        "</div>" +
        '<div class="article-preview__cover">' + VP.coverMarkup(post, { eager: true }) + "</div>" +
        '<div class="article-body admin-preview">' + body + "</div>" +
      "</article>";
  }

  function updatePreviews() {
    renderCoverPreview();
    updateCardPreview();
    if (!els.postPreviewWrap.hidden) updatePostPreview();
  }

  function setCover(url) {
    els.coverUrl.value = url || "";
    els.coverRemoveBtn.hidden = !url;
    renderCoverPreview();
    updateCardPreview();
  }

  function setSaving(isSaving) {
    els.savePostBtn.disabled = isSaving;
    els.savePostBtnBottom.disabled = isSaving;
    els.savePostBtn.textContent = isSaving ? "Сохраняем…" : "Сохранить";
    els.savePostBtnBottom.textContent = isSaving ? "Сохраняем…" : "Сохранить статью";
    els.editorSaveStatus.textContent = isSaving ? "Идёт сохранение…" : "";
  }

  function openEditor(post) {
    state.editingId = post ? post.id : null;
    state.editorDirty = false;
    els.postForm.reset();
    els.postFormError.hidden = true;
    els.postFormError.textContent = "";
    setSaving(false);
    setStatus(els.coverStatus, "");
    setStatus(els.inlineUploadStatus, "");

    els.editorTitle.textContent = post ? "Редактирование статьи" : "Новая статья";
    els.postTitle.value = post ? post.title || "" : "";
    els.postExcerpt.value = post ? post.excerpt || "" : "";
    els.postContent.value = post ? post.content || "" : "";
    els.postCategory.value = post && post.category ? post.category : "money";
    els.postFeatured.checked = Boolean(post && post.is_featured);
    els.deletePostBtn.hidden = !post;

    setEditorStatus(post && post.status === "draft" ? "draft" : "published");
    state.coverVariant = VP.normalizeCoverVariant(post ? post.cover_variant : "default");
    setCover(post ? post.cover_url || "" : "");
    setCoverVariant(state.coverVariant);
    updateExcerptCounter();
    resetPreview();
    updatePreviews();
    showPanel("editor");
    window.scrollTo({ top: 0, behavior: "auto" });
    window.setTimeout(function () {
      els.postTitle.focus();
    }, 40);
  }

  async function requestCloseEditor() {
    if (state.editorDirty) {
      var leave = await askConfirm({
        title: "Выйти без сохранения?",
        text: "Изменения в статье не сохранятся.",
        confirmLabel: "Выйти"
      });
      if (!leave) return;
    }

    state.editorDirty = false;
    state.editingId = null;
    setSaving(false);
    showPanel("posts");
  }

  els.backToListBtn.addEventListener("click", requestCloseEditor);
  els.cancelEditBtn.addEventListener("click", requestCloseEditor);

  els.postForm.addEventListener("input", function () {
    state.editorDirty = true;
  });

  els.postExcerpt.addEventListener("input", function () {
    updateExcerptCounter();
    updatePreviews();
  });

  els.postTitle.addEventListener("input", updatePreviews);

  els.postCategory.addEventListener("change", function () {
    state.editorDirty = true;
    updatePreviews();
  });

  document.querySelectorAll('input[name="postStatus"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (radio.checked) {
        state.editorStatus = radio.value;
        state.editorDirty = true;
        updatePreviews();
      }
    });
  });

  els.postFeatured.addEventListener("change", updatePreviews);

  function postPayload() {
    var title = els.postTitle.value.trim();
    var excerpt = els.postExcerpt.value.trim();
    var content = els.postContent.value.trim();
    var category = els.postCategory.value;

    els.postFormError.hidden = true;
    els.postFormError.textContent = "";

    if (!title) {
      els.postFormError.textContent = "Добавьте заголовок статьи.";
      els.postFormError.hidden = false;
      els.postTitle.focus();
      return null;
    }

    if (!excerpt) {
      els.postFormError.textContent = "Добавьте короткое описание — оно показывается на карточках.";
      els.postFormError.hidden = false;
      els.postExcerpt.focus();
      return null;
    }

    if (!content) {
      els.postFormError.textContent = "Добавьте текст статьи.";
      els.postFormError.hidden = false;
      els.postContent.focus();
      return null;
    }

    var categoryExists = VP.categories.some(function (item) {
      return item.id === category;
    });
    if (!categoryExists) {
      els.postFormError.textContent = "Выберите рубрику.";
      els.postFormError.hidden = false;
      els.postCategory.focus();
      return null;
    }

    return {
      title: title,
      category: category,
      excerpt: excerpt,
      content: content,
      cover_url: els.coverUrl.value.trim() || null,
      cover_variant: state.coverVariant,
      status: getEditorStatus(),
      is_featured: els.postFeatured.checked
    };
  }

  async function performPostSave(payload) {
    if (state.editingId) {
      return await supabase
        .from("posts")
        .update(payload)
        .eq("id", state.editingId)
        .select("id")
        .maybeSingle();
    }
    return await supabase
      .from("posts")
      .insert(payload)
      .select("id")
      .maybeSingle();
  }

  async function savePost() {
    if (!supabase) return;
    var payload = postPayload();
    if (!payload) return;

    setSaving(true);
    els.editorSaveStatus.textContent = "Идёт сохранение…";

    try {
      var response = await performPostSave(payload);
      var usedLegacy = false;

      // Если миграция ещё не применена, сохраняем без новых колонок.
      if (response.error && VP.isMissingColumnError && VP.isMissingColumnError(response.error)) {
        var legacyPayload = Object.assign({}, payload);
        delete legacyPayload.status;
        delete legacyPayload.cover_variant;

        var retry = await performPostSave(legacyPayload);
        if (!retry.error) {
          response = retry;
          usedLegacy = true;
        }
      }

      if (response.error) throw response.error;

      var savedId = response.data ? response.data.id : state.editingId;

      if (payload.status === "published" && payload.is_featured && savedId) {
        var clearOthers = await supabase
          .from("posts")
          .update({ is_featured: false })
          .neq("id", savedId)
          .eq("is_featured", true);
        if (clearOthers.error) {
          console.warn("Не удалось снять отметку «Главная» с других статей:", clearOthers.error);
        }
      }

      var wasEditing = Boolean(state.editingId);
      var isDraft = payload.status === "draft";
      state.editorDirty = false;
      state.editingId = null;

      if (usedLegacy) {
        toast("Сохранено. Чтобы включить статусы и стили обложек, выполните sql/migration_v2.sql.", true);
      } else if (wasEditing) {
        toast(isDraft ? "Черновик обновлён." : "Статья обновлена.");
      } else {
        toast(isDraft ? "Черновик создан." : "Статья опубликована.");
      }

      try {
        await fetchPosts();
      } catch (refreshError) {
        console.error("Ошибка обновления списка:", refreshError);
      }

      showPanel("posts");
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      console.error("Ошибка сохранения статьи:", error);
      els.postFormError.textContent = apiErrorMessage(error);
      els.postFormError.hidden = false;
    } finally {
      setSaving(false);
    }
  }

  els.postForm.addEventListener("submit", function (event) {
    event.preventDefault();
    savePost();
  });

  document.addEventListener("keydown", function (event) {
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      String(event.key).toLowerCase() === "s" &&
      !els.editorPanel.hidden
    ) {
      event.preventDefault();
      if (!els.savePostBtn.disabled) savePost();
    }
  });

  window.addEventListener("beforeunload", function (event) {
    if (!els.editorPanel.hidden && state.editorDirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  /* ---------- Удаление ---------- */

  async function deletePost(post) {
    if (!supabase) return;

    var confirmed = await askConfirm({
      title: "Удалить статью?",
      text: "«" + (post.title || "Без заголовка") + "» исчезнет с сайта. Это действие нельзя отменить.",
      confirmLabel: "Удалить"
    });
    if (!confirmed) return;

    try {
      var response = await supabase.from("posts").delete().eq("id", post.id);
      if (response.error) throw response.error;

      if (state.editingId === post.id) {
        state.editingId = null;
        state.editorDirty = false;
      }

      toast("Статья удалена.");
      try {
        await fetchPosts();
      } catch (refreshError) {
        console.error("Ошибка обновления списка:", refreshError);
      }
      showPanel("posts");
    } catch (error) {
      console.error("Ошибка удаления статьи:", error);
      toast(apiErrorMessage(error), true);
    }
  }

  els.deletePostBtn.addEventListener("click", function () {
    var post = state.posts.find(function (item) { return item.id === state.editingId; });
    if (post) deletePost(post);
  });

  /* ---------- Markdown-редактор ---------- */

  function renderPreviewInto(target, markdown) {
    if (!target) return;
    if (!String(markdown || "").trim()) {
      target.innerHTML = '<p class="field-hint">Начните печатать — здесь появится предпросмотр.</p>';
      return;
    }
    target.innerHTML = VP.renderMarkdown(markdown);
  }

  function prefixLines(prefix) {
    var textarea = els.postContent;
    var value = textarea.value;
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    var lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;

    var chunk = value.slice(lineStart, lineEnd);
    var updated = chunk.split("\n").map(function (line) {
      return prefix + line;
    }).join("\n");

    textarea.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineStart + updated.length);
    triggerInput(textarea);
  }

  function wrapSelection(before, after, placeholder) {
    var textarea = els.postContent;
    var value = textarea.value;
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var selected = value.slice(start, end) || placeholder;
    var replacement = before + selected + after;

    textarea.value = value.slice(0, start) + replacement + value.slice(end);
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    triggerInput(textarea);
  }

  els.editorToolbar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-action]");
    if (!button) return;

    var action = button.getAttribute("data-action");
    if (action === "h2") prefixLines("## ");
    else if (action === "ol") prefixLines("1. ");
    else if (action === "check") prefixLines("- [ ] ");
    else if (action === "quote") prefixLines("> ");
    else if (action === "callout") insertAtCursor(els.postContent, "\n\n> **Важно:** \n\n");
    else if (action === "list") prefixLines("- ");
    else if (action === "bold") wrapSelection("**", "**", "текст");
    else if (action === "italic") wrapSelection("_", "_", "текст");
    else if (action === "link") wrapSelection("[", "](https://)", "текст ссылки");
  });

  els.postContent.addEventListener("input", function () {
    window.clearTimeout(postPreviewTimer);
    postPreviewTimer = window.setTimeout(function () {
      updateCardPreview();
      if (!els.postPreviewWrap.hidden) updatePostPreview();
    }, 180);
  });

  els.previewToggleBtn.addEventListener("click", function () {
    var willShow = els.postPreviewWrap.hidden;
    els.postPreviewWrap.hidden = !willShow;
    els.previewToggleBtn.textContent = willShow ? "Скрыть предпросмотр статьи" : "Показать предпросмотр статьи";
    if (willShow) updatePostPreview();
  });

  /* ---------- Загрузка изображений ---------- */

  function validateImage(file, statusElement) {
    var allowed = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (!file.type || allowed.indexOf(file.type) === -1) {
      setStatus(statusElement, "Поддерживаются JPG, PNG, WebP, AVIF и GIF.", true);
      return false;
    }
    if (file.size > 8 * 1024 * 1024) {
      setStatus(statusElement, "Файл больше 8 МБ. Уменьшите изображение.", true);
      return false;
    }
    setStatus(statusElement, "");
    return true;
  }

  function compressImage(file) {
    var MAX_W = 1400;
    var QUALITY = 0.82;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth;
          var h = img.naturalHeight;
          if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(function (blob) {
            if (!blob) { reject(new Error('Не удалось сжать изображение')); return; }
            resolve(blob);
          }, 'image/webp', QUALITY);
        };
        img.onerror = function () { reject(new Error('Не удалось загрузить изображение')); };
        img.src = e.target.result;
      };
      reader.onerror = function () { reject(new Error('Не удалось прочитать файл')); };
      reader.readAsDataURL(file);
    });
  }

  async function uploadImage(file, folder) {
    if (!supabase) throw new Error("Supabase не подключён.");
    var bucket = VP.config.MEDIA_BUCKET;
    var blob = await compressImage(file);
    var path = folder + "/" + Date.now() + "-" + randomId() + ".webp";

    var response = await supabase.storage.from(bucket).upload(path, blob, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false
    });

    if (response.error) throw response.error;

    var publicUrl = supabase.storage.from(bucket).getPublicUrl(path);
    if (!publicUrl.data || !publicUrl.data.publicUrl) {
      throw new Error("Не удалось получить публичную ссылку на файл.");
    }
    return publicUrl.data.publicUrl;
  }

  els.coverChooseBtn.addEventListener("click", function () {
    els.coverInput.click();
  });

  els.coverInput.addEventListener("change", async function () {
    var file = els.coverInput.files && els.coverInput.files[0];
    if (!file) return;

    if (!validateImage(file, els.coverStatus)) {
      els.coverInput.value = "";
      return;
    }

    els.coverChooseBtn.disabled = true;
    els.coverChooseBtn.textContent = "Загружаем…";
    setStatus(els.coverStatus, "Загружаем обложку…");

    try {
      var url = await uploadImage(file, "covers");
      setCover(url);
      state.editorDirty = true;
      setStatus(els.coverStatus, "Обложка загружена.");
    } catch (error) {
      console.error("Ошибка загрузки обложки:", error);
      setStatus(els.coverStatus, storageErrorMessage(error), true);
    } finally {
      els.coverChooseBtn.disabled = false;
      els.coverChooseBtn.textContent = "Загрузить обложку";
      els.coverInput.value = "";
    }
  });

  els.coverRemoveBtn.addEventListener("click", function () {
    setCover("");
    state.editorDirty = true;
    setStatus(els.coverStatus, "Обложка убрана.");
  });

  function insertAtCursor(textarea, text) {
    var value = textarea.value;
    var start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : value.length;
    var end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : value.length;
    textarea.value = value.slice(0, start) + text + value.slice(end);
    var position = start + text.length;
    textarea.focus();
    textarea.setSelectionRange(position, position);
    triggerInput(textarea);
  }

  els.inlineImageBtn.addEventListener("click", function () {
    els.inlineImageInput.click();
  });

  els.inlineImageInput.addEventListener("change", async function () {
    var file = els.inlineImageInput.files && els.inlineImageInput.files[0];
    if (!file) return;

    if (!validateImage(file, els.inlineUploadStatus)) {
      els.inlineImageInput.value = "";
      return;
    }

    var suggested = String(file.name || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);

    var caption = window.prompt("Подпись к картинке (необязательно):", suggested);
    if (caption === null) {
      els.inlineImageInput.value = "";
      return;
    }

    caption = caption.trim().replace(/[\[\]]/g, "");
    els.inlineImageBtn.disabled = true;
    els.inlineImageBtn.textContent = "Загружаем…";
    setStatus(els.inlineUploadStatus, "Загружаем картинку…");

    try {
      var url = await uploadImage(file, "inline");
      var alt = caption || "Иллюстрация к статье";
      var prefix = els.postContent.value.trim() ? "\n\n" : "";
      insertAtCursor(els.postContent, prefix + "![" + alt + "](" + url + ")\n");
      setStatus(els.inlineUploadStatus, "Картинка вставлена в текст.");
      toast("Картинка загружена.");
    } catch (error) {
      console.error("Ошибка загрузки картинки:", error);
      setStatus(els.inlineUploadStatus, storageErrorMessage(error), true);
    } finally {
      els.inlineImageBtn.disabled = false;
      els.inlineImageBtn.textContent = "Вставить картинку";
      els.inlineImageInput.value = "";
    }
  });

  /* ---------- Предложенные темы ---------- */

  function suggestionRowMarkup(suggestion) {
    var category = suggestion.category ? VP.getCategory(suggestion.category) : null;
    var created = suggestion.created_at
      ? '<time datetime="' + VP.escapeHtml(VP.toIsoDate(suggestion.created_at)) + '">' +
        VP.escapeHtml(VP.formatDate(suggestion.created_at)) + "</time>"
      : "";

    return (
      '<article class="suggestion">' +
        '<div class="suggestion__meta">' +
          '<span class="tag">' + VP.escapeHtml(category ? category.label : "Без рубрики") + "</span>" +
          created +
        "</div>" +
        '<p class="suggestion__topic">' + VP.escapeHtml(suggestion.topic || "") + "</p>" +
        (suggestion.contact
          ? '<p class="suggestion__contact">Контакт: ' + VP.escapeHtml(suggestion.contact) + "</p>"
          : "") +
        '<div class="suggestion__actions">' +
          '<button class="btn btn--secondary btn--small" type="button" data-suggest-draft="' +
            VP.escapeHtml(suggestion.id) + '">Создать черновик</button>' +
          '<button class="text-btn text-btn--danger" type="button" data-suggest-delete="' +
            VP.escapeHtml(suggestion.id) + '">Удалить</button>' +
        "</div>" +
      "</article>"
    );
  }

  function renderSuggestions() {
    var count = state.suggestions.length;
    els.suggestionsCount.textContent = count
      ? count + " " + VP.plural(count, ["заявка", "заявки", "заявок"]) + " от читателей"
      : "Заявок пока нет";

    if (!count) {
      els.suggestionsList.innerHTML =
        '<div class="admin-empty"><p>Пока никто не предложил тему. Форма есть в подвале сайта.</p></div>';
      return;
    }

    els.suggestionsList.innerHTML = state.suggestions.map(suggestionRowMarkup).join("");
  }

  async function fetchSuggestions() {
    if (!supabase) return;

    state.suggestionsLoading = true;
    els.suggestionsCount.textContent = "Загружаем заявки…";

    try {
      var response = await supabase
        .from("topic_suggestions")
        .select("id,created_at,category,topic,contact")
        .order("created_at", { ascending: false });

      if (response.error) throw response.error;

      state.suggestions = Array.isArray(response.data) ? response.data : [];
      state.suggestionsLoaded = true;
      renderSuggestions();
    } catch (error) {
      console.error("Ошибка загрузки предложенных тем:", error);
      state.suggestionsLoaded = false;
      els.suggestionsCount.textContent = "";
      els.suggestionsList.innerHTML =
        '<div class="admin-empty">' +
          "<p>" + VP.escapeHtml(apiErrorMessage(error)) + "</p>" +
          '<button class="btn btn--secondary" type="button" data-reload-suggestions>Повторить</button>' +
        "</div>";
    } finally {
      state.suggestionsLoading = false;
    }
  }

  function showSuggestions() {
    showPanel("suggestions");
    if (state.suggestionsLoaded || state.suggestionsLoading) return;
    fetchSuggestions();
  }

  function createDraftFromSuggestion(suggestion) {
    var topic = String(suggestion.topic || "").trim();
    var categoryExists = VP.categories.some(function (category) {
      return category.id === suggestion.category;
    });

    openEditor(null);

    els.postTitle.value = topic.slice(0, 200);
    els.postCategory.value = categoryExists ? suggestion.category : "money";
    setEditorStatus("draft");
    els.postExcerpt.value = "";
    els.postContent.value = topic ? "> " + topic.replace(/\s+/g, " ") + "\n\n" : "";

    updateExcerptCounter();
    state.editorDirty = true;
    updatePreviews();
    toast("Тема подставлена в новый черновик.");

    window.setTimeout(function () {
      els.postTitle.focus();
      els.postTitle.select();
    }, 60);
  }

  async function deleteSuggestion(suggestion) {
    if (!supabase) return;

    var confirmed = await askConfirm({
      title: "Удалить заявку?",
      text: "«" + (suggestion.topic || "Без темы") + "» исчезнет из списка предложенных тем.",
      confirmLabel: "Удалить"
    });
    if (!confirmed) return;

    try {
      var response = await supabase
        .from("topic_suggestions")
        .delete()
        .eq("id", suggestion.id);

      if (response.error) throw response.error;

      state.suggestions = state.suggestions.filter(function (item) {
        return item.id !== suggestion.id;
      });
      renderSuggestions();
      toast("Заявка удалена.");
    } catch (error) {
      console.error("Ошибка удаления заявки:", error);
      toast(apiErrorMessage(error), true);
    }
  }

  if (els.suggestionsList) {
    els.suggestionsList.addEventListener("click", function (event) {
      var reload = event.target.closest("[data-reload-suggestions]");
      if (reload) {
        fetchSuggestions();
        return;
      }

      var draftTrigger = event.target.closest("[data-suggest-draft]");
      if (draftTrigger) {
        var forDraft = state.suggestions.find(function (item) {
          return item.id === draftTrigger.getAttribute("data-suggest-draft");
        });
        if (forDraft) createDraftFromSuggestion(forDraft);
        return;
      }

      var deleteTrigger = event.target.closest("[data-suggest-delete]");
      if (deleteTrigger) {
        var forDelete = state.suggestions.find(function (item) {
          return item.id === deleteTrigger.getAttribute("data-suggest-delete");
        });
        if (forDelete) deleteSuggestion(forDelete);
      }
    });
  }

  if (els.reloadSuggestionsBtn) {
    els.reloadSuggestionsBtn.addEventListener("click", function () {
      state.suggestionsLoaded = false;
      fetchSuggestions();
    });
  }

  /* ---------- Страница «О проекте» ---------- */

  async function aboutPreviewRender() {
    renderPreviewInto(els.aboutPreview, els.aboutContentInput.value);
  }

  async function loadAbout() {
    state.aboutLoading = true;
    els.aboutFormError.hidden = true;
    els.saveAboutBtn.disabled = true;
    els.aboutSaveStatus.textContent = "Загружаем…";

    try {
      var response = await supabase
        .from("pages")
        .select("title,content,updated_at")
        .eq("slug", "about")
        .maybeSingle();

      if (response.error) throw response.error;

      var page = response.data;
      els.aboutTitleInput.value = page ? page.title || "" : "О проекте";
      els.aboutContentInput.value = page ? page.content || "" : "";
      els.aboutSaveStatus.textContent = page
        ? "Обновлено: " + VP.formatDate(page.updated_at)
        : "Страница ещё не создана — сохраните текст, чтобы добавить её.";
      state.aboutLoaded = true;
      aboutPreviewRender();
    } catch (error) {
      console.error("Ошибка загрузки страницы «О проекте»:", error);
      els.aboutFormError.textContent = apiErrorMessage(error);
      els.aboutFormError.hidden = false;
      els.aboutSaveStatus.textContent = "";
    } finally {
      state.aboutLoading = false;
      els.saveAboutBtn.disabled = false;
    }
  }

  function showAbout() {
    showPanel("about");
    if (state.aboutLoaded || state.aboutLoading) return;
    loadAbout();
  }

  els.aboutContentInput.addEventListener("input", function () {
    window.clearTimeout(aboutPreviewTimer);
    aboutPreviewTimer = window.setTimeout(aboutPreviewRender, 180);
  });

  els.aboutForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!supabase) return;

    els.aboutFormError.hidden = true;
    var title = els.aboutTitleInput.value.trim();
    var content = els.aboutContentInput.value.trim();

    if (!title) {
      els.aboutFormError.textContent = "Добавьте заголовок страницы.";
      els.aboutFormError.hidden = false;
      els.aboutTitleInput.focus();
      return;
    }

    if (!content) {
      els.aboutFormError.textContent = "Добавьте текст страницы.";
      els.aboutFormError.hidden = false;
      els.aboutContentInput.focus();
      return;
    }

    els.saveAboutBtn.disabled = true;
    els.saveAboutBtn.textContent = "Сохраняем…";
    els.aboutSaveStatus.textContent = "";

    try {
      var response = await supabase
        .from("pages")
        .upsert({ slug: "about", title: title, content: content }, { onConflict: "slug" });

      if (response.error) throw response.error;

      state.aboutLoaded = true;
      els.aboutSaveStatus.textContent = "Сохранено " + new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      });
      toast("Страница «О проекте» обновлена.");
    } catch (error) {
      console.error("Ошибка сохранения страницы:", error);
      els.aboutFormError.textContent = apiErrorMessage(error);
      els.aboutFormError.hidden = false;
    } finally {
      els.saveAboutBtn.disabled = false;
      els.saveAboutBtn.textContent = "Сохранить страницу";
    }
  });

  /* ---------- Запуск ---------- */

  renderCoverVariants();
  setCoverVariant("default");
  setupConfiguration();
  showLogin();
  initAuth();
})();
