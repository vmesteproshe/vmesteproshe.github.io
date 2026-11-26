/* Калькуляторы совместного бюджета и финансовой подушки.
   Все расчёты выполняются локально, без обращений к базе данных. */
(function () {
  "use strict";

  var MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];

  var MAX_AMOUNT = 1e12;

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setHint(id, message, isWarning) {
    var element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-warning", Boolean(isWarning));
  }

  function parseAmount(input) {
    if (!input) return 0;
    var raw = String(input.value == null ? "" : input.value)
      .replace(/[\s\u00a0]/g, "")
      .replace(",", ".");
    var value = Number(raw);
    if (!isFinite(value) || value < 0) return 0;
    return Math.min(value, MAX_AMOUNT);
  }

  function formatMoney(value) {
    var rounded = Math.round(value);
    var formatted;
    try {
      formatted = new Intl.NumberFormat("ru-RU").format(rounded);
    } catch (error) {
      formatted = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }
    return formatted + " ₽";
  }

  function formatCount(value) {
    try {
      return new Intl.NumberFormat("ru-RU").format(value);
    } catch (error) {
      return String(value);
    }
  }

  function formatPercent(value) {
    var rounded = Math.round(value * 10) / 10;
    return String(rounded).replace(".", ",") + " %";
  }

  function monthWord(count) {
    var lastTwo = count % 100;
    var last = count % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return "месяцев";
    if (last === 1) return "месяц";
    if (last >= 2 && last <= 4) return "месяца";
    return "месяцев";
  }

  function calcBudget() {
    var income1 = parseAmount(document.getElementById("budgetIncome1"));
    var income2 = parseAmount(document.getElementById("budgetIncome2"));
    var expenses = parseAmount(document.getElementById("budgetExpenses"));
    var totalIncome = income1 + income2;

    var share1 = totalIncome > 0 ? (income1 / totalIncome) * 100 : 0;
    var share2 = totalIncome > 0 ? 100 - share1 : 0;
    var contribution1 = totalIncome > 0 ? (expenses * income1) / totalIncome : 0;
    var contribution2 = totalIncome > 0 ? expenses - contribution1 : 0;
    var personal1 = income1 - contribution1;
    var personal2 = income2 - contribution2;

    setText("budgetShare1", formatPercent(share1));
    setText("budgetShare2", formatPercent(share2));
    setText("budgetContribution1", formatMoney(contribution1));
    setText("budgetContribution2", formatMoney(contribution2));
    setText("budgetPersonal1", formatMoney(personal1));
    setText("budgetPersonal2", formatMoney(personal2));

    if (totalIncome <= 0) {
      setHint("budgetHint", "Укажите доход хотя бы одного партнёра — доли и взносы рассчитаются автоматически.", false);
    } else if (personal1 < 0 || personal2 < 0) {
      setHint("budgetHint", "Общие расходы больше дохода пары: часть взноса придётся покрыть из накоплений. Доли при этом остаются пропорциональными.", true);
    } else if (expenses <= 0) {
      setHint("budgetHint", "Доли посчитаны. Укажите общие расходы, чтобы увидеть взносы и личные деньги.", false);
    } else {
      setHint("budgetHint", "Взносы распределены пропорционально доходу. Личные деньги — то, что остаётся каждому после взноса.", false);
    }
  }

  function selectedMonths() {
    var checked = document.querySelector('input[name="fundMonths"]:checked');
    var value = checked ? Number(checked.value) : 6;
    return value === 3 || value === 6 || value === 12 ? value : 6;
  }

  function calcFund() {
    var monthlyExpenses = parseAmount(document.getElementById("fundExpenses"));
    var saving = parseAmount(document.getElementById("fundSaving"));
    var months = selectedMonths();
    var goal = monthlyExpenses * months;

    setText("fundGoal", formatMoney(goal));

    if (goal <= 0) {
      setText("fundTerm", "0 " + monthWord(0));
      setHint("fundHint", "Укажите обязательные траты семьи, чтобы увидеть цель накоплений.", false);
      return;
    }

    if (saving <= 0) {
      setText("fundTerm", "—");
      setHint("fundHint", "Укажите сумму, которую пара откладывает в месяц, чтобы узнать срок.", false);
      return;
    }

    var term = Math.ceil(goal / saving);
    setText("fundTerm", formatCount(term) + " " + monthWord(term));
    setHint(
      "fundHint",
      "Цель = обязательные траты × " + months + " мес. Последний взнос может быть меньше: срок округлён в большую сторону.",
      false
    );
  }

  function initChrome() {
    var now = new Date();
    var dateElement = document.getElementById("headerDate");
    if (dateElement) {
      dateElement.textContent = now.getDate() + " " + MONTHS[now.getMonth()] + " " + now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, "0");
      var day = String(now.getDate()).padStart(2, "0");
      dateElement.setAttribute("datetime", now.getFullYear() + "-" + month + "-" + day);
    }

    var yearElement = document.getElementById("copyrightYear");
    if (yearElement) yearElement.textContent = String(now.getFullYear());
  }

  function bindForm(formId, handler) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener("input", handler);
    form.addEventListener("change", handler);
  }

  initChrome();
  bindForm("budgetForm", calcBudget);
  bindForm("fundForm", calcFund);
  calcBudget();
  calcFund();
})();
