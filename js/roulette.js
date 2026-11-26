/* ============================================================
   «Вместе проще» — рулетка для пары
   Колесо на Canvas + requestAnimationFrame, звук через Web Audio API.
   ============================================================ */
(function () {
  "use strict";

  var SIZE = 560;
  var TAU = Math.PI * 2;
  var DEFAULT_NAMES = ["Джейсон", "Люсия"];

  var TASKS = [
    "вынести мусор",
    "помыть посуду",
    "закупиться продуктами",
    "пропылесосить",
    "оплатить коммуналку",
    "приготовить завтрак",
    "разобрать стирку"
  ];

  var DINNER = [
    { label: "Паста с морепродуктами", short: "Паста", time: "25 мин" },
    { label: "Тако", short: "Тако", time: "20 мин" },
    { label: "Пицца", short: "Пицца", time: "30 мин" },
    { label: "Домашние бургеры", short: "Бургеры", time: "35 мин" },
    { label: "Вок с курицей", short: "Вок", time: "20 мин" },
    { label: "Том-ям", short: "Том-ям", time: "40 мин" },
    { label: "Шаурма", short: "Шаурма", time: "15 мин" },
    { label: "Запечённая курица", short: "Курица", time: "45 мин" },
    { label: "Сырники", short: "Сырники", time: "20 мин" },
    { label: "Заказать доставку", short: "Доставка", time: "0 мин" }
  ];

  var EVENING = [
    { label: "Ночная поездка по городу под музыку", short: "Поездка" },
    { label: "Настольная игра", short: "Настолка" },
    { label: "Прогулка у воды", short: "Прогулка" },
    { label: "Новый рецепт вдвоём", short: "Рецепт" },
    { label: "Киномарафон", short: "Кино" },
    { label: "Разбор фотоархива", short: "Фотоархив" },
    { label: "Пикник", short: "Пикник" },
    { label: "Домашний спа-вечер", short: "Спа-вечер" }
  ];

  var MODE_LABELS = {
    chore: "Кто идёт на дело",
    dinner: "Ужин в Вайс-Сити",
    evening: "Вечер без экранов"
  };

  var PALETTE = [
    { fill: "#2B1055", text: "#FFFFFF" },
    { fill: "#FF4E88", text: "#210A1F" },
    { fill: "#FF9A5A", text: "#2B1055" },
    { fill: "#00F5D4", text: "#06222A" },
    { fill: "#6B2FB3", text: "#FFFFFF" },
    { fill: "#FF7BAC", text: "#210A1F" },
    { fill: "#FFC46B", text: "#2B1055" }
  ];

  var elements = {};
  var ctx = null;
  var mode = "chore";
  var selectedTask = TASKS[0];
  var rotation = 0;
  var spinning = false;
  var soundEnabled = true;
  var audioCtx = null;
  var history = [];
  var lastResult = null;
  var lastBoundary = 0;
  var lastClickAt = 0;

  function init() {
    elements.root = document.documentElement;
    elements.canvas = document.getElementById("rouletteCanvas");
    elements.spinButton = document.getElementById("spinButton");
    elements.spinAgain = document.getElementById("spinAgain");
    elements.soundToggle = document.getElementById("soundToggle");
    elements.copyButton = document.getElementById("copyResult");
    elements.copyStatus = document.getElementById("copyStatus");
    elements.nameInputs = [
      document.getElementById("partnerOneName"),
      document.getElementById("partnerTwoName")
    ];
    elements.tabs = Array.prototype.slice.call(document.querySelectorAll("[data-mode]"));
    elements.panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
    elements.chips = document.getElementById("choreChips");
    elements.customTask = document.getElementById("customTask");
    elements.result = document.getElementById("rouletteResult");
    elements.empty = document.getElementById("rouletteEmpty");
    elements.resultTitle = document.getElementById("resultTitle");
    elements.resultPick = document.getElementById("resultPick");
    elements.resultWho = document.getElementById("resultWho");
    elements.resultQuote = document.getElementById("resultQuote");
    elements.history = document.getElementById("rouletteHistory");

    if (!elements.canvas || !elements.spinButton || !ctxReady()) return;

    setupCanvas();
    buildChips();
    renderOptionList(elements.dinnerOptions = document.getElementById("dinnerOptions"), DINNER, true);
    renderOptionList(elements.eveningOptions = document.getElementById("eveningOptions"), EVENING, false);
    bindEvents();
    applyMode("chore");
    watchAccessibility();
  }

  function ctxReady() {
    return typeof elements.canvas.getContext === "function";
  }

  function setupCanvas() {
    var ratio = 1;
    if (window.devicePixelRatio) ratio = Math.min(window.devicePixelRatio, 2);
    elements.canvas.width = Math.round(SIZE * ratio);
    elements.canvas.height = Math.round(SIZE * ratio);
    ctx = elements.canvas.getContext("2d");
    if (ctx && typeof ctx.setTransform === "function") {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  }

  function buildChips() {
    if (!elements.chips) return;
    TASKS.forEach(function (task) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "roulette-option-btn";
      button.setAttribute("aria-pressed", task === selectedTask ? "true" : "false");
      button.textContent = task;
      button.addEventListener("click", function () {
        selectedTask = task;
        if (elements.customTask) elements.customTask.value = "";
        syncChips();
      });
      elements.chips.appendChild(button);
    });
  }

  function syncChips() {
    if (!elements.chips) return;
    var buttons = elements.chips.querySelectorAll(".roulette-option-btn");
    var custom = elements.customTask ? elements.customTask.value.trim() : "";
    Array.prototype.forEach.call(buttons, function (button) {
      var active = !custom && button.textContent === selectedTask;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderOptionList(container, items, withTime) {
    if (!container) return;
    container.innerHTML = "";
    items.forEach(function (item) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.className = "roulette-option-list__name";
      name.textContent = item.label;
      li.appendChild(name);
      if (withTime) {
        var time = document.createElement("span");
        time.className = "roulette-option-list__time";
        time.textContent = item.time;
        li.appendChild(time);
      }
      container.appendChild(li);
    });
  }

  function bindEvents() {
    elements.tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        if (spinning) return;
        applyMode(tab.getAttribute("data-mode"));
      });
    });

    elements.spinButton.addEventListener("click", spin);
    if (elements.spinAgain) elements.spinAgain.addEventListener("click", spin);
    if (elements.soundToggle) elements.soundToggle.addEventListener("click", toggleSound);
    if (elements.copyButton) elements.copyButton.addEventListener("click", copyForPartner);

    elements.nameInputs.forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", drawWheel);
    });

    if (elements.customTask) {
      elements.customTask.addEventListener("input", syncChips);
    }

    document.addEventListener("keydown", function (event) {
      if (spinning || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code !== "Space" && event.key !== " ") return;

      var target = event.target;
      var tag = target && target.tagName ? String(target.tagName).toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button") return;
      if (target && target.isContentEditable) return;

      event.preventDefault();
      spin();
    });
  }

  function applyMode(nextMode) {
    if (!MODE_LABELS[nextMode]) nextMode = "chore";
    mode = nextMode;

    elements.tabs.forEach(function (tab) {
      tab.setAttribute("aria-selected", tab.getAttribute("data-mode") === mode ? "true" : "false");
    });
    elements.panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== mode;
    });

    if (elements.result) elements.result.hidden = true;
    if (elements.empty) elements.empty.hidden = false;
    setWheelLabel();
    drawWheel();
  }

  function setWheelLabel() {
    if (!elements.canvas) return;
    if (mode === "chore") {
      elements.canvas.setAttribute(
        "aria-label",
        "Колесо рулетки: " + partnerName(0) + " и " + partnerName(1) + ". Задача: " + currentTask() + "."
      );
    } else {
      elements.canvas.setAttribute("aria-label", "Колесо рулетки: " + MODE_LABELS[mode]);
    }
  }

  function partnerName(index) {
    var input = elements.nameInputs[index];
    var value = input ? String(input.value || "").trim() : "";
    return value || DEFAULT_NAMES[index];
  }

  function currentTask() {
    var custom = elements.customTask ? String(elements.customTask.value || "").trim() : "";
    return custom || selectedTask;
  }

  function currentEntries() {
    if (mode === "chore") {
      return [
        { label: partnerName(0) },
        { label: partnerName(1) }
      ];
    }
    var source = mode === "dinner" ? DINNER : EVENING;
    return source.map(function (item) {
      return {
        label: item.short,
        detail: item.time || "",
        result: item.label
      };
    });
  }

  function isAccessible() {
    return elements.root.hasAttribute("data-vp-a11y") || elements.root.classList.contains("vp-a11y");
  }

  function rootColor(name, fallback) {
    var value = "";
    try {
      value = window.getComputedStyle(elements.root).getPropertyValue(name).trim();
    } catch (error) {
      value = "";
    }
    return value || fallback;
  }

  function sectorStyle(index, accessible) {
    if (accessible) {
      var bg = rootColor("--bg", "#ffffff");
      var text = rootColor("--text", "#111111");
      return index % 2 === 0
        ? { fill: bg, text: text }
        : { fill: text, text: bg };
    }
    return PALETTE[index % PALETTE.length];
  }

  function normalizeAngle(angle) {
    var value = angle % TAU;
    return value < 0 ? value + TAU : value;
  }

  function drawWheel() {
    if (!ctx) return;
    var entries = currentEntries();
    var count = Math.max(1, entries.length);
    var slice = TAU / count;
    var radius = 236;
    var accessible = isAccessible();
    var line = accessible ? rootColor("--text", "#111111") : "rgba(255, 255, 255, 0.62)";
    var hubFill = accessible ? rootColor("--text", "#111111") : "#140728";
    var hubStroke = accessible ? rootColor("--text", "#111111") : "#00F5D4";
    var hubCenter = accessible ? rootColor("--bg", "#ffffff") : "#FF4E88";
    var rim = accessible ? rootColor("--text", "#111111") : "rgba(0, 245, 212, 0.9)";
    var fontSize = count <= 2 ? 24 : count <= 8 ? 17 : 14;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(rotation);

    for (var index = 0; index < count; index += 1) {
      var centerAngle = -Math.PI / 2 + index * slice;
      var start = centerAngle - slice / 2;
      var end = centerAngle + slice / 2;
      var style = sectorStyle(index, accessible);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = style.fill;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(start) * radius, Math.sin(start) * radius);
      ctx.strokeStyle = line;
      ctx.lineWidth = accessible ? 2 : 1.6;
      ctx.stroke();

      var screenAngle = normalizeAngle(centerAngle + rotation);
      ctx.save();
      ctx.rotate(centerAngle + Math.PI / 2);
      if (screenAngle > Math.PI / 2 && screenAngle < Math.PI * 1.5) {
        ctx.rotate(Math.PI);
      }
      ctx.translate(0, -radius * 0.58);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = style.text;
      ctx.font = "700 " + fontSize + 'px "Onest", Arial, sans-serif';
      ctx.fillText(entries[index].label, 0, entries[index].detail ? -8 : 0, radius * 0.94);
      if (entries[index].detail) {
        ctx.font = "600 " + Math.max(11, fontSize - 4) + 'px "Onest", Arial, sans-serif';
        ctx.fillText(entries[index].detail, 0, 11, radius * 0.8);
      }
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius + 7, 0, TAU);
    ctx.strokeStyle = rim;
    ctx.lineWidth = 9;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, TAU);
    ctx.fillStyle = hubFill;
    ctx.fill();
    ctx.strokeStyle = hubStroke;
    ctx.lineWidth = accessible ? 3 : 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, TAU);
    ctx.fillStyle = hubCenter;
    ctx.fill();
    ctx.fillStyle = accessible ? rootColor("--bg", "#ffffff") : "#00F5D4";
    ctx.font = '800 10px "Onest", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VP", 0, 1);
    ctx.restore();
  }

  function watchAccessibility() {
    if (!window.MutationObserver) return;
    var observer = new window.MutationObserver(function () {
      drawWheel();
    });
    observer.observe(elements.root, {
      attributes: true,
      attributeFilter: ["data-vp-a11y", "data-vp-scheme", "data-vp-font", "data-vp-images"]
    });
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    if (elements.soundToggle) {
      elements.soundToggle.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
      elements.soundToggle.textContent = soundEnabled ? "Звук: вкл" : "Звук: выкл";
    }
  }

  function playClick() {
    if (!soundEnabled) return;
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === "suspended" && typeof audioCtx.resume === "function") {
        audioCtx.resume();
      }
      var now = audioCtx.currentTime;
      var oscillator = audioCtx.createOscillator();
      var gain = audioCtx.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(1000 + Math.random() * 260, now);
      oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.04);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.06);
    } catch (error) {
      soundEnabled = false;
      if (elements.soundToggle) {
        elements.soundToggle.setAttribute("aria-pressed", "false");
        elements.soundToggle.textContent = "Звук: выкл";
      }
    }
  }

  function spin() {
    if (spinning) return;
    var entries = currentEntries();
    if (!entries.length) return;

    var count = entries.length;
    var slice = TAU / count;
    var target = Math.floor(Math.random() * count);
    var jitter = (Math.random() - 0.5) * slice * 0.62;
    var turns = 5 + Math.floor(Math.random() * 3);
    var currentNormalized = normalizeAngle(rotation);
    var base = -target * slice;
    var delta = normalizeAngle(base - currentNormalized);
    var startRotation = rotation;
    var endRotation = rotation + turns * TAU + delta + jitter;
    var duration = 5400 + Math.random() * 1400;
    var startTime = null;

    spinning = true;
    elements.spinButton.disabled = true;
    if (elements.spinAgain) elements.spinAgain.disabled = true;
    if (elements.result) elements.result.hidden = true;
    if (elements.empty) elements.empty.hidden = true;
    if (elements.copyStatus) elements.copyStatus.textContent = "";
    lastBoundary = Math.floor(startRotation / slice);
    lastClickAt = 0;

    function frame(timestamp) {
      if (startTime === null) startTime = timestamp;
      var progress = Math.min(1, (timestamp - startTime) / duration);
      var eased = 1 - Math.pow(1 - progress, 4);
      rotation = startRotation + (endRotation - startRotation) * eased;

      var boundary = Math.floor(rotation / slice);
      if (boundary !== lastBoundary) {
        lastBoundary = boundary;
        var now = window.performance && window.performance.now
          ? window.performance.now()
          : Date.now();
        if (now - lastClickAt > 32) {
          playClick();
          lastClickAt = now;
        }
      }

      drawWheel();
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        rotation = endRotation;
        drawWheel();
        finishSpin(entries, target);
      }
    }

    window.requestAnimationFrame(frame);
  }

  function lowerFirst(value) {
    var text = String(value || "");
    return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
  }

  function finishSpin(entries, target) {
    spinning = false;
    elements.spinButton.disabled = false;
    if (elements.spinAgain) elements.spinAgain.disabled = false;
    setWheelLabel();

    var chosen = entries[target];
    var executorIndex = mode === "chore" ? target : Math.floor(Math.random() * 2);
    var name = partnerName(executorIndex);
    var result = {
      headline: mode === "chore" ? "ДЕЛО НАЗНАЧЕНО" : "ПЛАН НА ВЕЧЕР",
      title: "",
      executor: name,
      quote: "",
      modeLabel: MODE_LABELS[mode]
    };

    if (mode === "chore") {
      var task = currentTask();
      result.title = task;
      result.quote = executorIndex === 0
        ? name + " берёт удар на себя — " + task + " сегодня на нём."
        : name + " спросила «Доверие?» — значит, " + task + " сегодня на ней.";
    } else if (mode === "dinner") {
      result.title = chosen.result + " · " + chosen.detail;
      result.quote = executorIndex === 0
        ? name + " ставит на плите: " + lowerFirst(chosen.result) + " — быть ужину."
        : name + " сказала «Доверие?» — и выбрала ужин: " + lowerFirst(chosen.result) + ".";
    } else {
      result.title = chosen.result;
      result.quote = executorIndex === 0
        ? name + " заводит вечер: " + lowerFirst(chosen.result) + "."
        : name + " предлагает " + lowerFirst(chosen.result) + " — и это похоже на Вайс-Сити.";
    }

    lastResult = result;
    showResult(result);
    pushHistory(result);
  }

  function showResult(result) {
    if (!elements.result) return;
    if (elements.resultTitle) elements.resultTitle.textContent = result.headline;
    if (elements.resultPick) elements.resultPick.textContent = "Выпало: " + result.title;
    if (elements.resultWho) elements.resultWho.textContent = "Исполнитель: " + result.executor;
    if (elements.resultQuote) elements.resultQuote.textContent = "«" + result.quote + "»";
    elements.result.hidden = false;
    if (elements.empty) elements.empty.hidden = true;
  }

  function pushHistory(result) {
    history.unshift({
      modeLabel: result.modeLabel,
      title: result.title,
      executor: result.executor
    });
    history = history.slice(0, 5);
    renderHistory();
  }

  function renderHistory() {
    if (!elements.history) return;
    elements.history.innerHTML = "";

    if (!history.length) {
      var empty = document.createElement("li");
      empty.className = "roulette-history__empty";
      empty.textContent = "Пока пусто — крутите колесо.";
      elements.history.appendChild(empty);
      return;
    }

    history.forEach(function (item, index) {
      var li = document.createElement("li");
      var number = document.createElement("span");
      number.className = "roulette-history__index";
      number.textContent = String(index + 1).padStart(2, "0");
      var text = document.createElement("span");
      text.textContent = item.modeLabel + " · " + item.title + " — " + item.executor;
      li.appendChild(number);
      li.appendChild(text);
      elements.history.appendChild(li);
    });
  }

  function copyText(text) {
    if (window.VP && typeof window.VP.copyText === "function") {
      return window.VP.copyText(text);
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(area);
        ok ? resolve() : reject(new Error("Не удалось скопировать"));
      } catch (error) {
        document.body.removeChild(area);
        reject(error);
      }
    });
  }

  function copyForPartner() {
    if (!lastResult) return;
    var message = [
      "Рулетка для пары · Вместе проще",
      lastResult.headline,
      "Режим: " + lastResult.modeLabel,
      "Выпало: " + lastResult.title,
      "Исполнитель: " + lastResult.executor,
      lastResult.quote,
      window.location.href
    ].join("\n");

    copyText(message).then(function () {
      if (elements.copyStatus) elements.copyStatus.textContent = "Готово — сообщение скопировано для партнёра.";
    }).catch(function () {
      if (window.prompt) {
        window.prompt("Скопируйте сообщение для партнёра:", message);
      } else if (elements.copyStatus) {
        elements.copyStatus.textContent = "Не удалось скопировать автоматически.";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
