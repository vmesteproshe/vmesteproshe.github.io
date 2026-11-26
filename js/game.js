(function () {
  "use strict";

  var START_BUDGET = 50000;
  var TOTAL_SCENES = 8;

  var CATEGORY_LABELS = {
    money: "Деньги",
    home: "Быт",
    docs: "Документы",
    love: "Отношения"
  };

  var NAMES = {
    jason: "Джейсон Дюваль",
    lucia: "Люсия Каминос"
  };

  var AVATARS = {
    jason:
      '<svg class="game-avatar game-avatar--jason" viewBox="0 0 56 56" width="56" height="56" role="img" aria-label="Джейсон Дюваль">' +
        '<circle cx="28" cy="28" r="28" fill="#2b1055"></circle>' +
        '<path d="M8 56c1-11 8-17 20-17s19 6 20 17z" fill="#ffffff"></path>' +
        '<path d="M18 39h20v9H18z" fill="#f2e3d5"></path>' +
        '<ellipse cx="28" cy="25" rx="12" ry="14" fill="#d9a17f"></ellipse>' +
        '<path d="M16 21c1-8 6-12 12-12s12 4 12 12c-3-4-7-6-12-6s-9 2-12 6z" fill="#211520"></path>' +
        '<path d="M17 28c2 7 6 10 11 10s9-3 11-10c-2 4-6 6-11 6s-9-2-11-6z" fill="#4a3029" opacity="0.55"></path>' +
        '<path d="M18 22h20v6c-5 2-15 2-20 0z" fill="#111111"></path>' +
        '<path d="M28 24v3" stroke="#111111" stroke-width="2"></path>' +
        '<path d="M22 33c4 2 8 2 12 0" fill="none" stroke="#8d5b48" stroke-width="1.5" stroke-linecap="round"></path>' +
      "</svg>",
    lucia:
      '<svg class="game-avatar game-avatar--lucia" viewBox="0 0 56 56" width="56" height="56" role="img" aria-label="Люсия Каминос">' +
        '<circle cx="28" cy="28" r="28" fill="#75195e"></circle>' +
        '<path d="M7 56c2-11 9-17 21-17s19 6 21 17z" fill="#ff4e88"></path>' +
        '<path d="M11 22c0-10 6-16 17-16s17 6 17 16c0 11-4 20-8 25l-5-12H24l-5 12c-4-5-8-14-8-25z" fill="#241225"></path>' +
        '<ellipse cx="28" cy="25" rx="11" ry="13" fill="#e8b394"></ellipse>' +
        '<path d="M17 21c1-7 5-10 11-10s10 3 11 10c-4-3-8-4-11-4s-7 1-11 4z" fill="#241225"></path>' +
        '<circle cx="16" cy="31" r="3" fill="none" stroke="#ffd36b" stroke-width="2"></circle>' +
        '<circle cx="40" cy="31" r="3" fill="none" stroke="#ffd36b" stroke-width="2"></circle>' +
        '<path d="M22 26h4m4 0h4" stroke="#3a2024" stroke-width="2" stroke-linecap="round"></path>' +
        '<path d="M24 33c3 2 5 2 8 0" fill="none" stroke="#a95f6b" stroke-width="1.5" stroke-linecap="round"></path>' +
      "</svg>"
  };

  var SCENES = [
    {
      title: "Первый общий доход",
      category: "money",
      lines: [
        { who: "jason", text: "Первый доход с нашего общего дела. Машина уже просит тюнинг, Люс. Неделю смотрю на новые диски." },
        { who: "lucia", text: "А у нас ещё нет подушки. Если случится ремонт — останемся без денег. Я уже считаю каждую покупку." }
      ],
      options: [
        {
          label: "Поддержать Джейсона",
          tag: "Вариант 1 · за одного",
          text: "Скажите Люсии, что тюнинг важнее, а подушка безопасности может пока подождать.",
          effects: { trust: -12, calm: -5, budget: -8000 },
          response: [
            { who: "lucia", text: "Вот как. Значит, я опять крайняя, когда надо считать." },
            { who: "jason", text: "Я же не про безрассудство. Просто хочется один раз нормальную машину." }
          ],
          takeaway: "Сначала база безопасности, потом хотелки: подушка и аренда важнее дисков."
        },
        {
          label: "Спустить на тормозах",
          tag: "Вариант 2 · за деньгами",
          text: "Не выбирать вовсе: заплатить и за диски, и за подушку — пусть карта вытянет.",
          effects: { trust: -4, calm: -7, budget: -10000 },
          response: [
            { who: "lucia", text: "Мы даже не решили, сколько откладывать. А деньги уже ушли." },
            { who: "jason", text: "Класс. Теперь ещё и проценты на этой «подушке»." }
          ],
          takeaway: "Если платить за всё сразу, кредитка делает выбор за вас — и всегда не в пользу пары."
        },
        {
          label: "Договор по правилам гида",
          tag: "Вариант 3 · по правилам",
          text: "Разложить доход заранее: обязательные платежи, подушка, затем только небольшой бюджет на машину.",
          effects: { trust: 8, calm: 9, budget: -3000 },
          response: [
            { who: "lucia", text: "Так понятно. Я знаю, что у нас есть запас, и могу не паниковать." },
            { who: "jason", text: "И на диски останется. Меньше, но честно — я согласен." }
          ],
          takeaway: "Общая касса с заранее оговорёнными долями снимает вопрос «кто решил за двоих»."
        }
      ]
    },
    {
      title: "Посуда после тяжёлого дня",
      category: "home",
      lines: [
        { who: "jason", text: "Я на кухне с утра до ночи. После смены просто не могу ещё и мыть посуду." },
        { who: "lucia", text: "Я тоже устала. Но раковина уже второй день — жить так совсем невыносимо." }
      ],
      options: [
        {
          label: "Поддержать Джейсона",
          tag: "Вариант 1 · за одного",
          text: "Сказать Люсии, что она дома больше и справится сама.",
          effects: { trust: -11, calm: -6, budget: 0 },
          response: [
            { who: "lucia", text: "Так я ещё и виновата, что устала? Отличный совет." },
            { who: "jason", text: "Я же про усталость... Но ладно, помолчу." }
          ],
          takeaway: "Домашняя работа не делится по настроению: без договорённости обида растёт быстрее посуды."
        },
        {
          label: "Залить деньгами",
          tag: "Вариант 2 · за деньгами",
          text: "Вызвать уборщицу и сделать вид, что вопрос решён.",
          effects: { trust: -4, calm: -6, budget: -6000 },
          response: [
            { who: "jason", text: "Удобно. Только уборщица не разберёт, кто был должен." },
            { who: "lucia", text: "И не вернёт мне вечер, который я всё равно провела на кухне." }
          ],
          takeaway: "Деньги снимают симптом, но не распределение обязанностей."
        },
        {
          label: "Спокойный договор",
          tag: "Вариант 3 · по правилам",
          text: "Чередовать посуду и договориться о пятнадцати минутах общей уборки перед сном.",
          effects: { trust: 8, calm: 10, budget: 0 },
          response: [
            { who: "lucia", text: "Пятнадцать минут — это я могу. И не буду считать, кто «больше дома»." },
            { who: "jason", text: "Договорились. Сегодня моя очередь, завтра твоя." }
          ],
          takeaway: "Короткий ритуал и чередование снимают спор без нотаций."
        }
      ]
    },
    {
      title: "Аренда и коммуналка в Вайс-Сити",
      category: "money",
      lines: [
        { who: "jason", text: "Давайте делить всё пополам. Так проще и спорить не с чем." },
        { who: "lucia", text: "Но я получаю заметно меньше. Пополам для меня — половина зарплаты, а не «просто»." }
      ],
      options: [
        {
          label: "Поддержать Джейсона",
          tag: "Вариант 1 · за одного",
          text: "Надавить на Люсию: пополам и точка, остальное её проблемы.",
          effects: { trust: -13, calm: -6, budget: 0 },
          response: [
            { who: "lucia", text: "Так я сразу остаюсь без маржи на жизнь. Ты это понимаешь?" },
            { who: "jason", text: "Ну, я думал, так честнее..." }
          ],
          takeaway: "Равные доли не всегда честные: важно сравнивать не суммы, а то, что остаётся после платежа."
        },
        {
          label: "Спустить на тормозах",
          tag: "Вариант 2 · за деньгами",
          text: "Платить по старинке и не открывать квитанции, пока не станет совсем важно.",
          effects: { trust: -5, calm: -7, budget: -7000 },
          response: [
            { who: "jason", text: "Мы не считали коммуналку, а разница уже выросла." },
            { who: "lucia", text: "И теперь платить придётся сразу за несколько месяцев." }
          ],
          takeaway: "Неоткрытые квитанции не отменяют расход — они только откладывают разговор."
        },
        {
          label: "Договор по правилам гида",
          tag: "Вариант 3 · по правилам",
          text: "Доли по доходам, аренда из общей кассы, личные деньги не трогать.",
          effects: { trust: 9, calm: 8, budget: -2000 },
          response: [
            { who: "lucia", text: "Наконец-то цифры, с которыми я могу жить спокойно." },
            { who: "jason", text: "И мне не нужно угадывать, сколько ты реально можешь." }
          ],
          takeaway: "Пропорция по доходам плюс общая касса превращают спор в понятную формулу."
        }
      ]
    },
    {
      title: "Покупка на 15 000 без обсуждения",
      category: "money",
      lines: [
        { who: "lucia", text: "Я купила куртку за пятнадцать тысяч. Не успела себя остановить — сильно скидка была." },
        { who: "jason", text: "Мы даже не обсуждали такую трату. Я теперь не уверен, что хватит на аренду." }
      ],
      options: [
        {
          label: "Поддержать Люсию",
          tag: "Вариант 1 · за одного",
          text: "Объявить, что Джейсон просто жадный, и потратить ещё ради «справедливости».",
          effects: { trust: -12, calm: -5, budget: -15000 },
          response: [
            { who: "jason", text: "Так я ещё и жадный. Отличный способ меня убедить." },
            { who: "lucia", text: "Я и так чувствовала неловкость. Стало только хуже." }
          ],
          takeaway: "Защита покупки ценой чужого голоса превращает разговор о деньгах в спор о характерах."
        },
        {
          label: "Залить деньгами",
          tag: "Вариант 2 · за деньгами",
          text: "Перевести ещё денег на общую карту и не поднимать тему порога трат.",
          effects: { trust: -5, calm: -7, budget: -18000 },
          response: [
            { who: "jason", text: "Деньги ушли, а вопрос остался. Только стало страшнее." },
            { who: "lucia", text: "Я надеялась, что ты не заметишь. А теперь просто стыдно." }
          ],
          takeaway: "Деньгами можно закрыть покупку, но не закрыть отсутствие договорённости о лимите."
        },
        {
          label: "Договор по правилам гида",
          tag: "Вариант 3 · по правилам",
          text: "Установить порог: мелкие траты без обсуждения, всё выше — только вдвоём.",
          effects: { trust: 8, calm: 9, budget: -2000 },
          response: [
            { who: "lucia", text: "Понятно. В следующий раз я просто спрошу, если будет больше пяти тысяч." },
            { who: "jason", text: "А я не буду делать вид, что деньги бесконечные." }
          ],
          takeaway: "Порог трат снимает догадки: обоим известна граница, которую не надо переспрашивать."
        }
      ]
    },
    {
      title: "Договор аренды и общие документы",
      category: "docs",
      lines: [
        { who: "jason", text: "Договор в папке на полке. Вроде подписали, но где копия — не помню." },
        { who: "lucia", text: "И сканы паспортов где-то в телефоне. Если понадобятся — найдём к вечеру." }
      ],
      options: [
        {
          label: "Поддержать Джейсона",
          tag: "Вариант 1 · за одного",
          text: "Обвинить Люсию в беспорядке и потребовать разобраться одной.",
          effects: { trust: -12, calm: -7, budget: 0 },
          response: [
            { who: "lucia", text: "Опять я виновата. Хотя папку ставил кто-то другой." },
            { who: "jason", text: "Я не хотел ссоры... Но теперь она всё равно началась." }
          ],
          takeaway: "Общие документы — общая ответственность: поиск виноватого не заменяет копию договора."
        },
        {
          label: "Спустить на тормозах",
          tag: "Вариант 2 · за деньгами",
          text: "Заказать дубликаты с срочной доставкой и забыть до следующего раза.",
          effects: { trust: -4, calm: -6, budget: -9000 },
          response: [
            { who: "jason", text: "Дубликаты пришли, но система осталась той же." },
            { who: "lucia", text: "В следующий раз снова будем искать всё по телефону." }
          ],
          takeaway: "Срочные дубликаты дороже спокойной папки со сканами, которая есть у обоих."
        },
        {
          label: "Договор по правилам гида",
          tag: "Вариант 3 · по правилам",
          text: "Сложить сканы в одно общее место, сделать копии договора у обоих и поставить дату проверки.",
          effects: { trust: 9, calm: 8, budget: -1000 },
          response: [
            { who: "lucia", text: "Теперь я спокойно найду всё за минуту — даже если ты в дороге." },
            { who: "jason", text: "И никаких срочных доставок перед Новым годом." }
          ],
          takeaway: "Один общий архив и дата проверки экономят и нервы, и деньги на дубликаты."
        }
      ]
    },
    {
      title: "Усталость от постоянного «вдвоём»",
      category: "love",
      lines: [
        { who: "lucia", text: "Мне нужен вечер, когда я просто побыть одна. А Джейсон воспринимает это как холод." },
        { who: "jason", text: "Мы же вместе переезжали. Почему теперь я должен сидеть в другой комнате?" }
      ],
      options: [
        {
          label: "Поддержать Люсию",
          tag: "Вариант 1 · за одного",
          text: "Сказать Джейсону, что раз он любит, должен всё время быть рядом.",
          effects: { trust: -12, calm: -10, budget: 0 },
          response: [
            { who: "jason", text: "Любовь — не график дежурств. Мне тоже нужно выдохнуть." },
            { who: "lucia", text: "Я просила вечер, а услышала упрёк. Опять." }
          ],
          takeaway: "Личное пространство — не отказ от пары. Требование постоянно быть рядом быстро превращается в контроль."
        },
        {
          label: "Залить деньгами",
          tag: "Вариант 2 · за деньгами",
          text: "Купить билеты и развлечения, лишь бы не разговаривать о границах.",
          effects: { trust: -6, calm: -8, budget: -11000 },
          response: [
            { who: "jason", text: "Мы развлеклись, но так и не договорились." },
            { who: "lucia", text: "И снова я чувствую себя виноватой за желание побыть одной." }
          ],
          takeaway: "Развлечения не заменяют разговор о границах: невысказанная усталость никуда не девается."
        },
        {
          label: "Договор по правилам гида",
          tag: "Вариант 3 · по правилам",
          text: "Два вечера в неделю «своё время» и один вечер вдвоём без телефонов.",
          effects: { trust: 8, calm: 10, budget: 0 },
          response: [
            { who: "lucia", text: "Спасибо. Мне правда легче, когда это заранее известно, а не «по настроению»." },
            { who: "jason", text: "И я перестану думать, что ты уходишь от меня." }
          ],
          takeaway: "Запланированное время на себя и время вдвоём снижает тревогу у обоих."
        }
      ]
    },
    {
      title: "Супермаркет без списка",
      category: "money",
      lines: [
        { who: "jason", text: "Заскочили «на пару вещей» — и снова на восемь тысяч. Списка же не было." },
        { who: "lucia", text: "Я просто не хотела возвращаться за соусом. А потом корзина сама наполнилась." }
      ],
      options: [
        {
          label: "Поддержать Джейсона",
          tag: "Вариант 1 · за одного",
          text: "Сделать Люсию крайней прямо у кассы и уйти с оплаченными пакетами.",
          effects: { trust: -11, calm: -6, budget: -14000 },
          response: [
            { who: "lucia", text: "Хорошо. В следующий раз бери список сам и не стыди меня при кассе." },
            { who: "jason", text: "Я не хотел скандала... Но и молчать уже не выходит." }
          ],
          takeaway: "Список — не контроль партнёра, а общий предохранитель от импульсивных трат."
        },
        {
          label: "Спустить на тормозах",
          tag: "Вариант 2 · за деньгами",
          text: "Оплатить всё общей картой и не считать до конца недели.",
          effects: { trust: -4, calm: -5, budget: -16000 },
          response: [
            { who: "jason", text: "Оплатил. Теперь не знаю, что осталось до стипендии." },
            { who: "lucia", text: "И снова «разберёмся потом». Потом уже наступило." }
          ],
          takeaway: "Неделя без учёта превращает один поход в магазин в дыру в бюджете."
        },
        {
          label: "Договор по правилам гида",
          tag: "Вариант 3 · по правилам",
          text: "Список перед выходом, недельный лимит на еду и базовая корзина без «новинок».",
          effects: { trust: 7, calm: 8, budget: -1000 },
          response: [
            { who: "lucia", text: "Со списком я спокойнее: соус всё равно купим, а лишнее не утащу." },
            { who: "jason", text: "Договорились. Я держу лимит, ты держишь список." }
          ],
          takeaway: "Список плюс недельный лимит оставляют еду на неделю и не ссорят у кассы."
        }
      ]
    },
    {
      title: "Побережье Леониды без долгов",
      category: "money",
      lines: [
        { who: "lucia", text: "Хочется проехать всё побережье. Но без долгов — это для меня важно." },
        { who: "jason", text: "Аренда ещё не закрыта. Можно взять карту «на всякий случай» и решить потом." }
      ],
      options: [
        {
          label: "Поддержать Джейсона",
          tag: "Вариант 1 · за одного",
          text: "Уговорить Люсию не переживать заранее и поехать, даже если денег пока нет.",
          effects: { trust: -12, calm: -7, budget: -12000 },
          response: [
            { who: "lucia", text: "Я сказала без долгов. Ты услышал «не доверяй мне»." },
            { who: "jason", text: "Я просто не хочу терять выходные. Но ты права, я перегнул." }
          ],
          takeaway: "Поездка, которую оплатит будущий ты, уже не отдых, а новая статья долгов."
        },
        {
          label: "Залить деньгами",
          tag: "Вариант 2 · за деньгами",
          text: "Оформить кредит на поездку: потом как-нибудь разберёмся.",
          effects: { trust: -4, calm: -8, budget: -20000 },
          response: [
            { who: "jason", text: "Заявка одобрена. Теперь у нас есть маршрут и платёж." },
            { who: "lucia", text: "Я просила без долгов, а получила график платежей. Разве это отдых?" }
          ],
          takeaway: "Кредит на отдых превращает один день радости в месяцы обязательных платежей."
        },
        {
          label: "Договор по правилам гида",
          tag: "Вариант 3 · по правилам",
          text: "Бесплатные пляжи, запас на топливо и конкретная дата, когда поездка точно по карману.",
          effects: { trust: 9, calm: 9, budget: -2000 },
          response: [
            { who: "lucia", text: "Мне спокойнее знать дату, чем ехать с мыслью «а вдруг не потянем»." },
            { who: "jason", text: "Список пляжей уже составил. Без кредита — зато с запасом на бензин." }
          ],
          takeaway: "Маршрут по карману и запас на дорогу дают спокойствие, которое не купишь в кредит."
        }
      ]
    }
  ];

  var ENDINGS = {
    perfect: {
      title: "Идеальный тандем Леониды",
      text: "Вы оба остались в выигрыше: договорённости работают, деньги не закончились, а разговоры не превратились в скандал."
    },
    rich: {
      title: "Богатые, но на взводе",
      text: "Бюджет цел, но разговоры всё ещё идут на повышенных тонах. Деньги не заменяют спокойные правила."
    },
    shack: {
      title: "Мир в шалаше без гроша",
      text: "Вы договорились и не разошлись, но касса почти пуста. Пора вернуться к цифрам, спискам и подушке безопасности."
    },
    failed: {
      title: "Миссия провалена: разъехались по разным районам",
      text: "Обида, тревога или минус на карте сделали своё. Начните заново — теперь вы знаете, где рвётся нить."
    }
  };

  var root = document.getElementById("gameApp");
  if (!root) return;

  var elements = {
    trust: root.querySelector("[data-game-trust]"),
    calm: root.querySelector("[data-game-calm]"),
    budget: root.querySelector("[data-game-budget]"),
    trustBar: root.querySelector("[data-game-trust-bar]"),
    calmBar: root.querySelector("[data-game-calm-bar]"),
    budgetBar: root.querySelector("[data-game-budget-bar]"),
    budgetStat: root.querySelector(".game-stat--budget"),
    counter: root.querySelector("[data-game-counter]"),
    play: root.querySelector("[data-game-play]"),
    chat: root.querySelector("[data-game-chat]"),
    advice: root.querySelector("[data-game-advice]"),
    options: root.querySelector("[data-game-options]"),
    ending: root.querySelector("[data-game-ending]"),
    endingTitle: root.querySelector("#gameEndingTitle"),
    endingText: root.querySelector("[data-game-ending-text]"),
    endingStats: root.querySelector("[data-game-ending-stats]"),
    restart: root.querySelector("[data-game-restart]"),
    copy: root.querySelector("[data-game-copy]")
  };

  var state = null;

  function escapeHtml(value) {
    if (window.VP && typeof window.VP.escapeHtml === "function") {
      return window.VP.escapeHtml(value);
    }
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clampPercent(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function formatMoney(value) {
    var rounded = Math.round(value);
    var digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (rounded < 0 ? "−" : "") + digits + " ₽";
  }

  function formatMeter(value) {
    return String(Math.round(value));
  }

  function initialState() {
    return {
      trust: 50,
      calm: 50,
      budget: START_BUDGET,
      sceneIndex: 0,
      completed: 0,
      answered: false,
      choices: [],
      ending: null
    };
  }

  function isFailure() {
    return state.trust <= 0 || state.calm <= 0 || state.budget < 0;
  }

  function budgetPercent() {
    return Math.max(0, Math.min(100, Math.round((state.budget / START_BUDGET) * 100)));
  }

  function renderStats() {
    if (!elements.trust || !elements.calm || !elements.budget) return;

    elements.trust.textContent = state.trust + "%";
    elements.calm.textContent = state.calm + "%";
    elements.budget.textContent = formatMoney(state.budget);

    if (elements.trustBar && elements.trustBar.parentNode) {
      elements.trustBar.parentNode.setAttribute("aria-valuenow", String(state.trust));
    }
    if (elements.calmBar && elements.calmBar.parentNode) {
      elements.calmBar.parentNode.setAttribute("aria-valuenow", String(state.calm));
    }
    if (elements.budgetBar && elements.budgetBar.parentNode) {
      elements.budgetBar.parentNode.setAttribute("aria-valuenow", formatMeter(state.budget));
    }
    if (elements.budgetStat) {
      elements.budgetStat.classList.toggle("is-negative", state.budget < 0);
    }

    var frame = window.requestAnimationFrame || function (callback) {
      return window.setTimeout(callback, 0);
    };
    frame(function () {
      if (elements.trustBar) elements.trustBar.style.width = state.trust + "%";
      if (elements.calmBar) elements.calmBar.style.width = state.calm + "%";
      if (elements.budgetBar) elements.budgetBar.style.width = budgetPercent() + "%";
    });
  }

  function messageMarkup(item) {
    var name = NAMES[item.who] || "Вы, общий друг";
    var text = escapeHtml(item.text);

    if (item.who === "player") {
      return (
        '<div class="game-message game-message--player">' +
          '<div class="game-message__body">' +
            '<span class="game-message__name">' + name + "</span>" +
            '<p class="game-message__text">' + text + "</p>" +
          "</div>" +
        "</div>"
      );
    }

    return (
      '<div class="game-message game-message--' + item.who + '">' +
        AVATARS[item.who] +
        '<div class="game-message__body">' +
          '<span class="game-message__name">' + escapeHtml(name) + "</span>" +
          '<p class="game-message__text">' + text + "</p>" +
        "</div>" +
      "</div>"
    );
  }

  function appendMessages(items) {
    if (!elements.chat || !Array.isArray(items)) return;
    items.forEach(function (item) {
      elements.chat.insertAdjacentHTML("beforeend", messageMarkup(item));
    });
  }

  function renderScene() {
    var scene = SCENES[state.sceneIndex];
    if (!scene) return;

    state.answered = false;
    if (elements.counter) {
      elements.counter.textContent = "Сцена " + (state.sceneIndex + 1) + " / " + TOTAL_SCENES;
    }

    appendMessages([
      {
        who: "player",
        text: "Сцена " + (state.sceneIndex + 1) + " из " + TOTAL_SCENES + " · " + scene.title
      }
    ]);
    appendMessages(scene.lines);

    if (elements.options) {
      elements.options.innerHTML = scene.options.map(function (option, index) {
        return (
          '<button class="game-option" type="button" data-game-option="' + index + '">' +
            '<span class="game-option__tag">' + escapeHtml(option.tag) + "</span>" +
            '<span class="game-option__label">' + escapeHtml(option.label) + "</span>" +
            '<span class="game-option__text">' + escapeHtml(option.text) + "</span>" +
          "</button>"
        );
      }).join("");
    }
    if (elements.advice) elements.advice.hidden = false;

    renderStats();
  }

  function applyEffects(effects) {
    effects = effects || {};
    state.trust = clampPercent(state.trust + (Number(effects.trust) || 0));
    state.calm = clampPercent(state.calm + (Number(effects.calm) || 0));
    state.budget = Math.round(state.budget + (Number(effects.budget) || 0));
  }

  function chooseOption(index) {
    if (state.answered || state.ending) return;
    var scene = SCENES[state.sceneIndex];
    var option = scene && scene.options[index];
    if (!option) return;

    state.answered = true;
    state.completed = state.sceneIndex + 1;
    state.choices.push({ title: scene.title, label: option.label });

    if (elements.advice) elements.advice.hidden = true;
    if (elements.options) {
      Array.prototype.forEach.call(elements.options.querySelectorAll("button"), function (button) {
        button.disabled = true;
      });
    }

    appendMessages([{ who: "player", text: option.label + ". " + option.text }]);
    applyEffects(option.effects);
    appendMessages(option.response);
    renderStats();

    var warning = isFailure()
      ? " Показатели перешли критическую отметку — миссия завершится досрочно."
      : "";
    var category = CATEGORY_LABELS[scene.category] || "Материалы";

    if (elements.chat) {
      elements.chat.insertAdjacentHTML(
        "beforeend",
        '<div class="game-takeaway">' +
          '<p class="game-takeaway__title">Практический вывод</p>' +
          '<p class="game-takeaway__text">' + escapeHtml(option.takeaway + warning) + "</p>" +
          '<a class="game-takeaway__link" href="index.html?cat=' + escapeHtml(scene.category) + '">' +
            "Открыть рубрику «" + escapeHtml(category) + "» →" +
          "</a>" +
        "</div>" +
        '<button class="btn game-next" type="button" data-game-next>Дальше</button>'
      );
      scrollToLastAction();
    }
  }

  function scrollToLastAction() {
    if (!elements.chat) return;
    var button = elements.chat.querySelector("[data-game-next]");
    if (!button || typeof button.scrollIntoView !== "function") return;
    try {
      button.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch (error) {
      button.scrollIntoView(false);
    }
  }

  function resolveEnding() {
    if (isFailure()) return ENDINGS.failed;
    if (state.budget < 25000) return ENDINGS.shack;
    if (state.trust >= 70 && state.calm >= 70) return ENDINGS.perfect;
    return ENDINGS.rich;
  }

  function showEnding() {
    state.ending = resolveEnding();

    if (elements.play) elements.play.hidden = true;
    if (!elements.ending) return;

    elements.ending.hidden = false;
    if (elements.endingTitle) elements.endingTitle.textContent = state.ending.title;
    if (elements.endingText) elements.endingText.textContent = state.ending.text;
    if (elements.endingStats) {
      elements.endingStats.innerHTML =
        "<li>Доверие: " + state.trust + "%</li>" +
        "<li>Бюджет: " + formatMoney(state.budget) + "</li>" +
        "<li>Спокойствие: " + state.calm + "%</li>" +
        "<li>Сцен пройдено: " + state.completed + " из " + TOTAL_SCENES + "</li>";
    }

    if (elements.endingTitle && typeof elements.endingTitle.focus === "function") {
      elements.endingTitle.focus({ preventScroll: true });
    }
  }

  function nextStep() {
    if (state.sceneIndex >= TOTAL_SCENES - 1 || isFailure()) {
      showEnding();
      return;
    }
    state.sceneIndex += 1;
    renderScene();
  }

  function resultText() {
    if (!state.ending) return "";
    var lines = [
      "«Вместе проще» — советник Джейсона и Люсии",
      "Концовка: " + state.ending.title,
      "Сцен пройдено: " + state.completed + " из " + TOTAL_SCENES,
      "Доверие: " + state.trust + "%",
      "Бюджет: " + formatMoney(state.budget),
      "Спокойствие: " + state.calm + "%",
      ""
    ];

    state.choices.forEach(function (choice, index) {
      lines.push((index + 1) + ") " + choice.title + ": " + choice.label);
    });
    lines.push("", state.ending.text);
    return lines.join("\n");
  }

  function copyFallback(text) {
    try {
      window.prompt("Скопируйте результат:", text);
    } catch (error) {
      console.warn("Не удалось скопировать результат:", error);
    }
    showCopyFeedback(true);
  }

  function showCopyFeedback(success) {
    if (!elements.copy) return;
    var original = "Скопировать результат";
    elements.copy.textContent = success ? "Результат скопирован" : "Не удалось скопировать";
    window.setTimeout(function () {
      elements.copy.textContent = original;
    }, 2200);
  }

  function copyResult() {
    var text = resultText();
    if (!text) return;

    if (window.VP && typeof window.VP.copyText === "function") {
      window.VP.copyText(text).then(function () {
        showCopyFeedback(true);
      }).catch(function () {
        copyFallback(text);
      });
      return;
    }

    if (navigator.clipboard && window.isSecureContext && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(function () {
        showCopyFeedback(true);
      }).catch(function () {
        copyFallback(text);
      });
      return;
    }

    copyFallback(text);
  }

  function restart() {
    state = initialState();
    if (elements.chat) elements.chat.innerHTML = "";
    if (elements.options) elements.options.innerHTML = "";
    if (elements.advice) elements.advice.hidden = true;
    if (elements.play) elements.play.hidden = false;
    if (elements.ending) elements.ending.hidden = true;
    if (elements.endingTitle) elements.endingTitle.textContent = "";
    renderScene();
  }

  root.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;

    var option = target.closest("[data-game-option]");
    if (option && elements.options && elements.options.contains(option)) {
      chooseOption(Number(option.getAttribute("data-game-option")));
      return;
    }

    if (target.closest("[data-game-next]")) {
      nextStep();
      return;
    }

    if (target.closest("[data-game-restart]")) {
      restart();
      return;
    }

    if (target.closest("[data-game-copy]")) {
      copyResult();
    }
  });

  restart();
})();
