/* Конструктор бланков: сборка и расчёты целиком в браузере, без запросов к базе. */
(function () {
  "use strict";

  var VP = window.VP || {};
  var MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];

  var SITUATIONS = {
    marriage: {
      label: "Смена фамилии после свадьбы",
      docs: [
        "Свидетельство о браке",
        "Свидетельство о рождении",
        "Паспорт с новой фамилией",
        "СНИЛС",
        "ИНН",
        "Полис ОМС",
        "Водительское удостоверение",
        "Банковские карты и договоры",
        "Документы на недвижимость"
      ]
    },
    rent: {
      label: "Аренда квартиры",
      docs: [
        "Паспорта всех жильцов",
        "СНИЛС",
        "ИНН",
        "Справка о доходах",
        "Трудовой договор или выписка из него",
        "Рекомендации от прошлого арендодателя",
        "Согласие на проверку кредитной истории",
        "Проект договора найма",
        "Акт приёма-передачи имущества",
        "Квитанции по предыдущему адресу"
      ]
    },
    purchase: {
      label: "Покупка жилья",
      docs: [
        "Паспорта супругов",
        "Свидетельство о браке",
        "Справки о доходах за 2 года",
        "Выписки с банковских счетов",
        "СНИЛС",
        "ИНН",
        "Документы на первоначальный взнос",
        "Отчёт об оценке недвижимости",
        "Выписка из ЕГРН",
        "Согласие супруга на сделку"
      ]
    }
  };

  var currentTab = "payments";
  var docsCustomized = false;
  var statusTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    if (typeof VP.escapeHtml === "function") return VP.escapeHtml(value);
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fieldValue(id) {
    var element = byId(id);
    return element ? String(element.value || "").trim() : "";
  }

  function todayIso() {
    if (typeof VP.toIsoDate === "function") return VP.toIsoDate(new Date());
    var now = new Date();
    return now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");
  }

  function formatDate(value) {
    var raw = String(value || "").trim();
    if (!raw) return "—";
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!parts) return raw;
    var month = Number(parts[2]);
    if (month < 1 || month > 12) return raw;
    return parts[3] + " " + MONTHS[month - 1] + " " + parts[1];
  }

  function parseAmount(value) {
    var raw = String(value == null ? "" : value)
      .replace(/[\s\u00a0]/g, "")
      .replace(",", ".");
    var amount = Number(raw);
    if (!isFinite(amount) || amount < 0) return 0;
    return Math.min(amount, 1e12);
  }

  function formatMoney(value) {
    var formatted;
    try {
      formatted = new Intl.NumberFormat("ru-RU").format(Math.round(value));
    } catch (error) {
      formatted = String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }
    return formatted + " ₽";
  }

  function rowValue(row, field) {
    var input = row.querySelector('[data-field="' + field + '"]');
    if (!input) return "";
    if (input.type === "checkbox") return input.checked;
    return String(input.value || "").trim();
  }

  function itemLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  }

  function partnerNames() {
    return [fieldValue("partner1") || "Партнёр 1", fieldValue("partner2") || "Партнёр 2"];
  }

  function payerOptions(selected) {
    var names = partnerNames();
    var options = ['<option value="">Не указано</option>'];
    names.forEach(function (name) {
      options.push(
        '<option value="' + escapeHtml(name) + '"' + (name === selected ? " selected" : "") + ">" +
          escapeHtml(name) + "</option>"
      );
    });
    options.push('<option value="Оба"' + (selected === "Оба" ? " selected" : "") + ">Оба</option>");
    return options.join("");
  }

  function syncPayerOptions() {
    var selects = Array.prototype.slice.call(
      document.querySelectorAll('#paymentsRows select[data-field="payer"]')
    );
    if (!selects.length) return;

    var names = partnerNames();
    var previousNames = ["Партнёр 1", "Партнёр 2"];
    if (selects[0].options[1]) previousNames[0] = selects[0].options[1].value;
    if (selects[0].options[2]) previousNames[1] = selects[0].options[2].value;

    selects.forEach(function (select) {
      var previous = select.value;
      if (previous === previousNames[0]) previous = names[0];
      else if (previous === previousNames[1]) previous = names[1];
      select.innerHTML = payerOptions(previous);
    });
  }

  /* ---------- Строки форм ---------- */

  function rowHead(label) {
    return (
      '<div class="tpl-row__head">' +
        '<span class="tpl-row__index">' + escapeHtml(label) + "</span>" +
        '<button class="text-btn text-btn--danger text-btn--compact" type="button" data-remove-row ' +
          'aria-label="Удалить строку">Удалить</button>' +
      "</div>"
    );
  }

  function paymentRow(item) {
    item = item || {};
    return (
      '<div class="tpl-row" data-row>' +
        rowHead("Регулярная трата") +
        '<div class="tpl-row__grid tpl-row__grid--payments">' +
          '<label class="tpl-field"><span>Название</span>' +
            '<input class="field-input" type="text" data-field="name" maxlength="80" placeholder="Аренда" ' +
              'aria-label="Название траты" value="' + escapeHtml(item.name || "") + '"></label>' +
          '<label class="tpl-field"><span>Сумма, ₽</span>' +
            '<input class="field-input" type="number" data-field="amount" min="0" step="1" inputmode="decimal" ' +
              'placeholder="0" aria-label="Сумма траты" value="' + escapeHtml(item.amount || "") + '"></label>' +
          '<label class="tpl-field"><span>Дата списания</span>' +
            '<input class="field-input" type="text" data-field="date" maxlength="40" placeholder="1 числа" ' +
              'aria-label="Дата списания" value="' + escapeHtml(item.date || "") + '"></label>' +
          '<label class="tpl-field"><span>Кто платит</span>' +
            '<select class="field-input" data-field="payer" aria-label="Кто платит">' +
              payerOptions(item.payer || "") + "</select></label>" +
        "</div>" +
      "</div>"
    );
  }

  function boxRow(item) {
    item = item || {};
    return (
      '<div class="tpl-row" data-row>' +
        rowHead("Коробка") +
        '<div class="tpl-row__grid tpl-row__grid--boxes">' +
          '<label class="tpl-field"><span>Номер</span>' +
            '<input class="field-input" type="text" data-field="number" maxlength="10" placeholder="1" ' +
              'aria-label="Номер коробки" value="' + escapeHtml(item.number || "") + '"></label>' +
          '<label class="tpl-field"><span>Комната</span>' +
            '<input class="field-input" type="text" data-field="room" maxlength="60" placeholder="Гостиная" ' +
              'aria-label="Комната" value="' + escapeHtml(item.room || "") + '"></label>' +
          '<label class="tpl-field tpl-field--wide"><span>Вещи</span>' +
            '<textarea class="field-input field-textarea tpl-textarea" data-field="items" rows="2" ' +
              'placeholder="По одной вещи на строку" aria-label="Список вещей">' +
              escapeHtml(item.items || "") + "</textarea></label>" +
          '<label class="checkbox tpl-check">' +
            '<input type="checkbox" data-field="fragile" aria-label="Хрупкое"' + (item.fragile ? " checked" : "") + ">" +
            " Хрупкое</label>" +
        "</div>" +
      "</div>"
    );
  }

  function docRow(item) {
    item = item || {};
    return (
      '<div class="tpl-row tpl-row--doc" data-row>' +
        '<label class="tpl-doc-check">' +
          '<input type="checkbox" data-field="done" aria-label="Документ собран"' + (item.done ? " checked" : "") + ">" +
          '<span class="visually-hidden">Собран</span>' +
        "</label>" +
        '<input class="field-input" type="text" data-field="name" maxlength="120" ' +
          'placeholder="Название документа" aria-label="Название документа" ' +
          'value="' + escapeHtml(item.name || "") + '">' +
        '<button class="text-btn text-btn--danger text-btn--compact" type="button" data-remove-row ' +
          'aria-label="Удалить документ">Удалить</button>' +
      "</div>"
    );
  }

  function seedDocs(key) {
    var situation = SITUATIONS[key] || SITUATIONS.marriage;
    var list = byId("docsRows");
    if (!list) return;
    list.innerHTML = situation.docs.map(function (name) {
      return docRow({ name: name, done: false });
    }).join("");
  }

  function seedRows() {
    var payments = byId("paymentsRows");
    if (payments) {
      payments.innerHTML =
        paymentRow({ name: "Аренда", amount: "45000", date: "1 числа", payer: "Оба" }) +
        paymentRow({ name: "Интернет", amount: "900", date: "15 числа", payer: "Партнёр 1" });
    }

    var boxes = byId("boxesRows");
    if (boxes) {
      boxes.innerHTML =
        boxRow({ number: "1", room: "Гостиная", items: "Книги\nПосуда", fragile: false }) +
        boxRow({ number: "2", room: "Кухня", items: "Тарелки и чашки", fragile: true });
    }

    seedDocs("marriage");
    syncPayerOptions();
  }

  /* ---------- Сбор данных ---------- */

  function collectPayments() {
    var names = partnerNames();
    var rows = [];
    var total = 0;
    var byPartner = [0, 0, 0];

    document.querySelectorAll("#paymentsRows [data-row]").forEach(function (row) {
      var name = rowValue(row, "name");
      var amount = parseAmount(rowValue(row, "amount"));
      var date = rowValue(row, "date");
      var payer = rowValue(row, "payer");
      if (!name && !date && amount === 0) return;

      rows.push({ name: name, amount: amount, date: date, payer: payer });
      total += amount;
      if (payer === names[0]) byPartner[0] += amount;
      else if (payer === names[1]) byPartner[1] += amount;
      else if (payer === "Оба") byPartner[2] += amount;
    });

    return { names: names, date: fieldValue("paymentsDate"), rows: rows, total: total, byPartner: byPartner };
  }

  function collectBoxes() {
    var rows = [];
    document.querySelectorAll("#boxesRows [data-row]").forEach(function (row) {
      var number = rowValue(row, "number");
      var room = rowValue(row, "room");
      var items = itemLines(rowValue(row, "items"));
      var fragile = rowValue(row, "fragile") === true;
      if (!number && !room && !items.length) return;
      rows.push({ number: number, room: room, items: items, fragile: fragile });
    });

    return {
      address: fieldValue("boxesAddress"),
      date: fieldValue("boxesDate"),
      rows: rows,
      fragileCount: rows.filter(function (row) { return row.fragile; }).length
    };
  }

  function collectDocs() {
    var select = byId("docsSituation");
    var key = select && SITUATIONS[select.value] ? select.value : "marriage";
    var rows = [];

    document.querySelectorAll("#docsRows [data-row]").forEach(function (row) {
      var name = rowValue(row, "name");
      if (!name) return;
      rows.push({ name: name, done: rowValue(row, "done") === true });
    });

    return {
      situation: SITUATIONS[key].label,
      fio: fieldValue("docsFio"),
      date: fieldValue("docsDate"),
      rows: rows,
      doneCount: rows.filter(function (row) { return row.done; }).length
    };
  }

  /* ---------- Предпросмотр ---------- */

  function metaItem(label, value) {
    return (
      "<span>" + escapeHtml(label) + ": <strong>" +
        escapeHtml(value ? String(value) : "—") + "</strong></span>"
    );
  }

  function docHead(kicker, title, subtitle, meta) {
    return (
      '<div class="doc-head">' +
        '<p class="doc-kicker">' + escapeHtml(kicker) + "</p>" +
        '<h2 class="doc-title">' + escapeHtml(title) + "</h2>" +
        '<p class="doc-subtitle">' + escapeHtml(subtitle) + "</p>" +
      "</div>" +
      '<div class="doc-meta">' + meta.join("") + "</div>"
    );
  }

  function signatures(first, second) {
    return (
      '<div class="doc-signatures">' +
        '<div class="doc-signature"><span>' + escapeHtml(first) + "</span><i></i></div>" +
        '<div class="doc-signature"><span>' + escapeHtml(second) + "</span><i></i></div>" +
      "</div>"
    );
  }

  function renderPayments(data) {
    var body = data.rows.map(function (row, index) {
      return (
        "<tr>" +
          '<td class="num">' + (index + 1) + "</td>" +
          "<td>" + escapeHtml(row.name || "—") + "</td>" +
          '<td class="amount">' + formatMoney(row.amount) + "</td>" +
          "<td>" + escapeHtml(row.date || "—") + "</td>" +
          "<td>" + escapeHtml(row.payer || "—") + "</td>" +
        "</tr>"
      );
    }).join("");

    if (!body) {
      body = '<tr><td class="doc-empty" colspan="5">Заполните хотя бы одну регулярную трату.</td></tr>';
    }

    var summary = data.names.map(function (name, index) {
      return "<li><span>" + escapeHtml(name) + "</span><strong>" +
        formatMoney(data.byPartner[index]) + "</strong></li>";
    }).join("");

    if (data.byPartner[2] > 0) {
      summary += "<li><span>Оба (общие траты)</span><strong>" +
        formatMoney(data.byPartner[2]) + "</strong></li>";
    }

    return (
      docHead("Памятка", "Распределение платежей", "Договорённость о регулярных тратах", [
        metaItem("Дата", formatDate(data.date)),
        metaItem("Участников", data.names.length)
      ]) +
      '<section class="doc-section"><h3>Участники</h3>' +
        '<ol class="doc-partners">' +
          '<li><span>1</span><strong>' + escapeHtml(data.names[0]) + "</strong></li>" +
          '<li><span>2</span><strong>' + escapeHtml(data.names[1]) + "</strong></li>" +
        "</ol>" +
      "</section>" +
      '<section class="doc-section"><h3>Регулярные траты</h3>' +
        '<table class="doc-table">' +
          "<thead><tr><th>№</th><th>Трата</th><th>Сумма</th><th>Дата списания</th><th>Кто платит</th></tr></thead>" +
          "<tbody>" + body + "</tbody>" +
          "<tfoot><tr><th colspan=\"2\">Итого в месяц</th>" +
            '<td class="amount" colspan="3">' + formatMoney(data.total) + "</td></tr></tfoot>" +
        "</table>" +
      "</section>" +
      '<section class="doc-section doc-summary"><h3>Итоги по партнёрам</h3><ul>' + summary + "</ul></section>" +
      signatures("Подпись " + data.names[0], "Подпись " + data.names[1]) +
      '<p class="doc-footnote">Памятка составляется для договорённости между партнёрами. Суммы и даты можно уточнять по мере изменения расходов.</p>'
    );
  }

  function renderBoxes(data) {
    var body = data.rows.map(function (row, index) {
      var items = row.items.length
        ? row.items.map(function (line) { return escapeHtml(line); }).join("<br>")
        : "—";
      var fragile = row.fragile
        ? '<span class="doc-flag">Хрупкое</span>'
        : "—";
      return (
        "<tr>" +
          '<td class="num">' + escapeHtml(row.number || String(index + 1)) + "</td>" +
          "<td>" + escapeHtml(row.room || "—") + "</td>" +
          "<td>" + items + "</td>" +
          "<td>" + fragile + "</td>" +
        "</tr>"
      );
    }).join("");

    if (!body) {
      body = '<tr><td class="doc-empty" colspan="4">Добавьте хотя бы одну коробку.</td></tr>';
    }

    return (
      docHead("Опись", "Коробки при переезде", "Что и где лежит — чтобы не искать после переезда", [
        metaItem("Адрес", data.address),
        metaItem("Дата переезда", formatDate(data.date))
      ]) +
      '<section class="doc-section">' +
        '<table class="doc-table">' +
          "<thead><tr><th>№</th><th>Комната</th><th>Вещи</th><th>Отметка</th></tr></thead>" +
          "<tbody>" + body + "</tbody>" +
          '<tfoot><tr><th colspan="3">Всего коробок</th><td class="num">' +
            data.rows.length + "</td></tr></tfoot>" +
        "</table>" +
      "</section>" +
      '<section class="doc-section doc-summary"><h3>Итого</h3><ul>' +
        "<li><span>Коробок</span><strong>" + data.rows.length + "</strong></li>" +
        "<li><span>Из них хрупких</span><strong>" + data.fragileCount + "</strong></li>" +
      "</ul></section>" +
      signatures("Кто упаковал", "Кто принял") +
      '<p class="doc-footnote">Отметьте хрупкие коробки и при переезде ставьте их отдельно — так проще сохранить вещи целыми.</p>'
    );
  }

  function renderDocs(data) {
    var list = data.rows.map(function (row) {
      var check = row.done
        ? '<span class="doc-check is-done" aria-hidden="true">✓</span>'
        : '<span class="doc-check" aria-hidden="true"></span>';
      return "<li>" + check + "<span>" + escapeHtml(row.name) + "</span></li>";
    }).join("");

    if (!list) {
      list = '<li><span class="doc-empty">Добавьте документы в список.</span></li>';
    }

    return (
      docHead("План", "Сбор документов", "Пошаговый список — ничего не забудется", [
        metaItem("Ситуация", data.situation),
        metaItem("ФИО", data.fio),
        metaItem("Дата", formatDate(data.date))
      ]) +
      '<section class="doc-section">' +
        '<p class="doc-progress">Собрано <strong>' + data.doneCount + "</strong> из <strong>" +
          data.rows.length + "</strong></p>" +
        '<ul class="doc-check-list">' + list + "</ul>" +
      "</section>" +
      signatures("Кто собрал", "Дата проверки") +
      '<p class="doc-footnote">Требования могут отличаться в разных городах и банках — уточняйте точный перечень перед визитом.</p>'
    );
  }

  function render() {
    var container = byId("previewContent");
    if (!container) return;

    if (currentTab === "boxes") container.innerHTML = renderBoxes(collectBoxes());
    else if (currentTab === "docs") container.innerHTML = renderDocs(collectDocs());
    else container.innerHTML = renderPayments(collectPayments());
  }

  /* ---------- Текстовая версия ---------- */

  function plainMeta(items) {
    return items.map(function (item) { return item[0] + ": " + (item[1] || "—"); }).join(" · ");
  }

  function separator() {
    return "----------------------------------------";
  }

  function plainPayments(data) {
    var lines = [
      "ПАМЯТКА РАСПРЕДЕЛЕНИЯ ПЛАТЕЖЕЙ",
      "Дата: " + formatDate(data.date),
      "Участники: " + data.names.join("; "),
      "",
      "Регулярные траты:"
    ];

    if (!data.rows.length) {
      lines.push("— траты не заполнены");
    } else {
      data.rows.forEach(function (row, index) {
        lines.push(
          (index + 1) + ". " + (row.name || "Без названия") +
            " | " + formatMoney(row.amount) +
            " | " + (row.date || "дата не указана") +
            " | " + (row.payer || "кто платит не указан")
        );
      });
    }

    lines.push("", "Итого в месяц: " + formatMoney(data.total), "Итого по партнёрам:");
    data.names.forEach(function (name, index) {
      lines.push(name + " — " + formatMoney(data.byPartner[index]));
    });
    if (data.byPartner[2] > 0) {
      lines.push("Оба (общие траты) — " + formatMoney(data.byPartner[2]));
    }

    lines.push("", separator(), "Подписи: ____________________ / ____________________");
    return lines.join("\n");
  }

  function plainBoxes(data) {
    var lines = [
      "ОПИСЬ КОРОБОК ПРИ ПЕРЕЕЗДЕ",
      "Адрес: " + (data.address || "—"),
      "Дата переезда: " + formatDate(data.date),
      "",
      "Коробки:"
    ];

    if (!data.rows.length) {
      lines.push("— коробки не добавлены");
    } else {
      data.rows.forEach(function (row, index) {
        lines.push(
          (row.number || String(index + 1)) + ". " + (row.room || "комната не указана") +
            " | " + (row.items.length ? row.items.join("; ") : "вещи не указаны") +
            (row.fragile ? " | ХРУПКОЕ" : "")
        );
      });
    }

    lines.push(
      "",
      "Всего коробок: " + data.rows.length + "; хрупких: " + data.fragileCount,
      separator(),
      "Кто упаковал: ____________________  Кто принял: ____________________"
    );
    return lines.join("\n");
  }

  function plainDocs(data) {
    var lines = [
      "ПЛАН СБОРА ДОКУМЕНТОВ",
      plainMeta([
        ["Ситуация", data.situation],
        ["ФИО", data.fio],
        ["Дата", formatDate(data.date)]
      ]),
      "",
      "Собрано " + data.doneCount + " из " + data.rows.length + ":"
    ];

    if (!data.rows.length) {
      lines.push("— документы не добавлены");
    } else {
      data.rows.forEach(function (row) {
        lines.push((row.done ? "[x] " : "[ ] ") + row.name);
      });
    }

    lines.push("", separator(), "Подпись: ____________________  Дата проверки: ____________________");
    return lines.join("\n");
  }

  function plainText() {
    if (currentTab === "boxes") return plainBoxes(collectBoxes());
    if (currentTab === "docs") return plainDocs(collectDocs());
    return plainPayments(collectPayments());
  }

  function copyText(text) {
    if (typeof VP.copyText === "function") return VP.copyText(text);
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        var copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        copied ? resolve() : reject(new Error("Не удалось скопировать"));
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  function setStatus(message) {
    var element = byId("templateCopyStatus");
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("is-success", Boolean(message));
    window.clearTimeout(statusTimer);
    if (message) {
      statusTimer = window.setTimeout(function () {
        element.textContent = "";
        element.classList.remove("is-success");
      }, 3000);
    }
  }

  /* ---------- События ---------- */

  function selectTab(key) {
    if (["payments", "boxes", "docs"].indexOf(key) === -1) return;

    currentTab = key;
    document.querySelectorAll("[data-template]").forEach(function (button) {
      button.setAttribute("aria-selected", button.getAttribute("data-template") === key ? "true" : "false");
    });
    document.querySelectorAll("[data-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== key;
    });
    setStatus("");
    render();
  }

  function bindTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-template]"));

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        selectTab(tab.getAttribute("data-template"));
      });

      tab.addEventListener("keydown", function (event) {
        var target = null;
        if (event.key === "ArrowRight") target = tabs[(index + 1) % tabs.length];
        else if (event.key === "ArrowLeft") target = tabs[(index - 1 + tabs.length) % tabs.length];
        else if (event.key === "Home") target = tabs[0];
        else if (event.key === "End") target = tabs[tabs.length - 1];
        if (!target) return;

        event.preventDefault();
        target.focus();
        selectTab(target.getAttribute("data-template"));
      });
    });
  }

  function addRow(type) {
    var list = byId(type + "Rows");
    if (!list) return;
    var markup = type === "boxes" ? boxRow() : type === "docs" ? docRow() : paymentRow();
    list.insertAdjacentHTML("beforeend", markup);
    if (type === "docs") docsCustomized = true;
    var last = list.lastElementChild;
    var input = last && last.querySelector("input");
    if (input && typeof input.focus === "function") input.focus();
    render();
  }

  function bindRows() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== "function") return;

      var add = target.closest("[data-add-row]");
      if (add) {
        event.preventDefault();
        addRow(add.getAttribute("data-add-row"));
        return;
      }

      var remove = target.closest("[data-remove-row]");
      if (remove) {
        event.preventDefault();
        var row = remove.closest("[data-row]");
        if (row) {
          if (row.closest("#docsRows")) docsCustomized = true;
          row.remove();
          render();
        }
        return;
      }

      var print = target.closest("[data-template-print]");
      if (print) {
        event.preventDefault();
        window.print();
        return;
      }

      var copy = target.closest("[data-template-copy]");
      if (copy) {
        event.preventDefault();
        copyText(plainText()).then(function () {
          setStatus("Текст бланка скопирован");
        }).catch(function () {
          setStatus("Не удалось скопировать — попробуйте ещё раз");
        });
      }
    });
  }

  function bindForms() {
    var payments = byId("paymentsForm");
    if (payments) {
      payments.addEventListener("input", function (event) {
        if (event.target.id === "partner1" || event.target.id === "partner2") syncPayerOptions();
        render();
      });
      payments.addEventListener("change", render);
    }

    var boxes = byId("boxesForm");
    if (boxes) {
      boxes.addEventListener("input", render);
      boxes.addEventListener("change", render);
    }

    var docs = byId("docsForm");
    if (docs) {
      docs.addEventListener("input", function (event) {
        if (event.target && event.target.closest && event.target.closest("#docsRows")) docsCustomized = true;
        render();
      });
      docs.addEventListener("change", function (event) {
        if (event.target && event.target.id === "docsSituation") {
          if (!docsCustomized) seedDocs(event.target.value);
        } else if (event.target && event.target.closest && event.target.closest("#docsRows")) {
          docsCustomized = true;
        }
        render();
      });
    }
  }

  function initChrome() {
    var dateElement = byId("headerDate");
    if (dateElement) {
      var iso = todayIso();
      dateElement.textContent = formatDate(iso);
      dateElement.setAttribute("datetime", iso);
    }

    var yearElement = byId("copyrightYear");
    if (yearElement) yearElement.textContent = String(new Date().getFullYear());

    ["paymentsDate", "boxesDate", "docsDate"].forEach(function (id) {
      var input = byId(id);
      if (input && !input.value) input.value = todayIso();
    });
  }

  function init() {
    initChrome();
    seedRows();
    bindTabs();
    bindRows();
    bindForms();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
