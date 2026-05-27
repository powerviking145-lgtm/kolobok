import { BUILD as BUILD_FILE } from './build.js';

/** Актуальная сборка: сначала из boot (fetch build.js), иначе из файла. */
export const BUILD =
  (typeof window !== 'undefined' && window.__KOLOBOK_BUILD) || BUILD_FILE;

export const CONFIG = {
  build: BUILD,
  storageKey: 'kolobok_save',
  saveVersion: 7,

  firebase: {
    enabled: true,
    initTimeoutMs: 10000,
    apiKey: 'AIzaSyDucZXntclCKuzR8Y-41HwBB3nXsD29Atc',
    authDomain: 'kolobok-6032e.firebaseapp.com',
    projectId: 'kolobok-6032e',
    storageBucket: 'kolobok-6032e.firebasestorage.app',
    messagingSenderId: '1056991736138',
    appId: '1:1056991736138:web:a02ec125fcae4608cb11b3',
  },

  cloudSync: {
    syncIntervalMs: 10000,
    /** Ждём user.id из initData (TG иногда отдаёт с задержкой) */
    telegramWaitMs: 10000,
    pullTimeoutMs: 8000,
    pushTimeoutMs: 8000,
    /** Не держать сплэш из‑за облака (имя подтянется позже) */
    blockingMaxMs: 6000,
    /** Локальная отладка без Telegram: id + true */
    devBypass: false,
    devTelegramId: 999999001,
  },

  phrases: {
    /** Если в фразе нет {name} — с этой вероятностью добавить «Имя, …» */
    nameInjectChance: 0.45,
    /** При выборе реплики предпочитать строки с {name} */
    namedPoolPreferChance: 0.8,
  },

  greeting: {
    enabled: true,
    /** Задержка после появления главного экрана */
    delayMs: 600,
    /** Сколько висит приветствие в баббле */
    hideMs: 9000,
    sessionKey: 'kolobok-greeting-shown',
    templates: [
      'Йо, {name}! На связи, бро.',
      '{name}, ты зашёл? Норм, погнали.',
      'Слышь, {name}, колобок на линии.',
      'О, {name} зашёл. Уважаю.',
      '{name}, я уже тут — заряжай движ.',
      'Брат {name}, без тебя тихо было. Шучу.',
      'Красавчик {name}, печь остыла — я нет.',
      'Эй, {name}! Сказка продолжается.',
    ],
  },

  onboarding: {
    nameMinLength: 2,
    nameMaxLength: 16,
    title: 'Как зовут твоего колобка?',
    hint: '2–16 символов, бро',
    button: 'Погнали',
    errorTooShort: 'Минимум 2 символа, бро.',
    errorTooLong: 'Короче, макс 16 символов.',
  },

  stats: {
    /** Старт и базовый потолок без прокачки, в % от шкалы max (120) */
    basePercent: 40,
    startPercent: 40,
    /** @deprecated для миграции v6 */
    base: 40,
    start: 40,
    min: 0,
    /** Абсолютная шкала (100% = 120 пунктов) */
    max: 120,
    levelCap: 80,
  },

  houses: {
    defaultActive: 'izba',
    starterOwned: ['izba'],
    order: ['izba', 'terem', 'forest', 'fair', 'palace'],
    list: {
      izba: { name: 'Изба', price: 0, emoji: '🏚' },
      terem: { name: 'Терем', price: 25000, emoji: '🏛' },
      forest: { name: 'Лес', price: 100000, emoji: '🌲' },
      fair: { name: 'Ярмарка', price: 300000, emoji: '🎪' },
      palace: { name: 'Дворец', price: 1000000, emoji: '🏰' },
    },
  },

  shop: {
    upgradeBaseCost: 100,
    upgradeCostMultiplier: 1.15,
    title: 'Магазин',
    backLabel: 'Назад',
    tabHouses: 'Дома',
    tabHousesIcon: '🏠',
    tabUpgrade: 'Прокачка',
    tabUpgradeIcon: '💪',
    upgradeLevel: 'Ур. {level}/{cap}',
    upgradeMaxBonus: '+{level}% к максимуму',
    upgradeNextPrice: 'Следующий уровень: ⭐ {price}',
    btnUpgrade: 'Прокачать',
    btnUpgradeLocked: '🔒 Не хватает (−{shortage}⭐)',
    btnMax: 'МАКС',
    tutorial: {
      steps: [
        {
          text: 'Глянь, бро! Тут можно затюнить наш домик или прокачать мои объёмы 💪',
          button: 'Дальше',
        },
        {
          text: 'Дома — это вайб локации. А прокачка — потолок моих статов!',
          button: 'Понял',
        },
      ],
    },
    upgradeHint: {
      minStars: 100,
      text: 'Бро, у меня 100⭐! Можно расширить мой желудок 🍗',
      btnOpen: 'Открыть магазин',
      btnLater: 'Позже',
    },
    badgeSelected: 'Выбрано',
    btnSelect: 'Выбрать',
    btnSelected: 'Выбрано',
    btnBuy: 'Купить за ⭐ {price}',
    btnLocked: '🔒 Не хватает (−{shortage}⭐)',
    priceFree: 'Бесплатно',
    priceOwned: 'Уже твой',
  },

  statZones: {
    red: { max: 20 },
    yellow: { max: 50 },
    green: { max: 100 },
    gold: { max: 120 },
  },

  statDecay: {
    tickMs: 10000,
    homeSlowdown: 1.5,
    /** Отображаемый % полоски (0–100) за 90 мин при весе 1; при max 120 ≈ 1.2 пункта */
    displayPercentPer90Min: 1,
    hunger: 1,
    thirst: 1,
    health: 1,
    mood: 1,
    runMultiplier: 1.8,
    /** Оффлайн-декей: максимум сколько часов считаем за один вход. */
    offlineMaxHours: 168,
  },

  /**
   * Гибридное здоровье:
   * - базово тянется к среднему hunger/thirst;
   * - при двух нулях дополнительно штрафуется раз в 30 минут.
   */
  healthHybrid: {
    enabled: true,
    /** На сколько пунктов health за тик тянется к среднему(hunger, thirst). */
    syncStepPerTick: 1,
    /** Когда hunger=0 и thirst=0 — штраф раз в 30 мин. */
    exhaustionPenaltyEveryMs: 30 * 60 * 1000,
    exhaustionPenaltyAmount: 1,
  },

  timers: {
    phraseRotateMs: 8000,
    autosaveMs: 5000,
  },

  statColors: {
    hunger: { from: '#FF8C42', to: '#FFB84D' },
    thirst: { from: '#4A9EFF', to: '#6BB6FF' },
    health: { from: '#FF5E7E', to: '#FF8FA3' },
    mood: { from: '#FFD93D', to: '#FFE873' },
  },

  homeParticles: {
    count: 10,
    speedMin: 0.15,
    speedMax: 0.35,
    drift: 0.08,
    opacityMin: 0.3,
    opacityMax: 0.6,
  },

  clicker: {
    pointsMin: 1,
    pointsMax: 3,
    vibrateMs: 8,
    squashMs: 85,
    particlesMin: 1,
    particlesMax: 3,
    maxParticles: 56,
    particleLifeMs: 480,
    spreadMinVw: 3,
    spreadMaxVw: 14,
    riseMinVh: 6,
    riseMaxVh: 13,
    emojis: ['✨', '⭐', '🟡', '💫', '⚡'],
    phraseOnTapChance: 0.1,
  },

  homeFoods: {
    firstDelayMs: 800,
    intervalMinMs: 2800,
    intervalMaxMs: 4500,
    minOnScreen: 5,
    maxOnScreen: 14,
    dynamicMax: {
      base: 5,
      cap: 14,
      everyInteractions: 4,
      plusPerStep: 1,
    },
    waterSpawnBias: 0.4,
    badSpawnChance: 0.28,
    neutralSpawnChance: 0.32,
    bad: {
      points: 0,
    },
    good: {
      points: 1,
    },
    badTip: {
      enabled: true,
      text:
        'Слышь, это не ПП-перекус. Тапай или режь — уберёшь с экрана, но очков ноль. Бро, сам решай.',
      buttonText: 'Понятно',
    },
    tapBlast: {
      /** Только соседи, чьи края касаются тапнутого (+ px зазор) */
      touchPaddingPx: 4,
      /** Множитель дистанции касания (1.5 = +50% радиус волны) */
      touchRadiusMul: 1.5,
      visualScale: 2,
      secondaryVisualScale: 1.25,
      /** Одна волна: тап + касающиеся, без цепочки */
      waveShakeMs: 420,
    },
    badFx: {
      bomb: {
        ms: 780,
        shakeMs: 420,
        ringCount: 3,
        debrisCount: 16,
        debrisDistMin: 2.2,
        debrisDistMax: 3.8,
      },
    },
    haptics: {
      tapBlast: [16, 10, 26, 14, 18],
      tapBlastChain: [22, 12, 28, 16, 20, 10],
      tapBlastBig: [34, 18, 38, 22, 26, 14, 12],
      slice: [12, 22, 14],
      sliceAlt1: [10, 18, 24, 8],
      sliceAlt2: [14, 8, 20, 16],
      sliceBad: [32, 20, 28, 14],
      collectGood: [10, 16, 8],
      collectBad: [24, 14, 18],
    },
    statBoostPerPoints: 1000,
    statBoostAmount: 1,
    lifetimeMs: 8000,
    expireFadeMs: 500,
    flyMs: 300,
    tapBurst: {
      ms: 460,
      ghostFlyMs: 280,
      ghostDelayMs: 140,
      particleCount: 9,
      particleDistMin: 1.5,
      particleDistMax: 2.6,
    },
    eatAnimMs: 300,
    spawnPopMs: 380,
    marginPercent: 4,
    spawnRadiusPercent: 9,
    minCenterGapPercent: 12,
    maxOverlapPercent: 4,
    positionAttempts: 32,
    forbiddenZone: { leftMin: 28, leftMax: 72, topMin: 38, topMax: 92 },
    slice: {
      minDrawPx: 8,
      minSegmentPx: 4,
      sliceStepPx: 12,
      trailWidth: 4.5,
      trailFadeAlpha: 0.02,
      trailColor: 'rgba(255, 245, 220, 0.94)',
      trailGlowBlur: 5,
      trailFadeMs: 380,
      tapMaxMovePx: 14,
      hitPaddingPx: 10,
      scoreMultiplier: 1.65,
      scoreBonus: 5,
      badScoreMultiplier: 1.2,
      fxMs: 480,
      badQuarterFxMs: 520,
      vibrateMs: [14, 22, 16],
      badVibrateMs: [36, 24, 32, 18],
      bombVibrateMs: [36, 24, 32, 18],
    },
    list: [
      { id: 'water', emoji: '💧', name: 'Вода', kind: 'good', thirstPriority: true },
      { id: 'tea', emoji: '🍵', name: 'Чай', kind: 'good', thirstPriority: true },
      { id: 'juice', emoji: '🧃', name: 'Сок', kind: 'good', thirstPriority: true },
      { id: 'milk', emoji: '🥛', name: 'Молоко', kind: 'good', thirstPriority: true },
      { id: 'apple', emoji: '🍎', name: 'Яблоко', kind: 'good' },
      { id: 'banana', emoji: '🍌', name: 'Банан', kind: 'good' },
      { id: 'broccoli', emoji: '🥦', name: 'Брокколи', kind: 'good' },
      { id: 'orange', emoji: '🍊', name: 'Апельсин', kind: 'good' },
      { id: 'carrot', emoji: '🥕', name: 'Морковка', kind: 'good' },
      { id: 'salad', emoji: '🥗', name: 'Салат', kind: 'good' },
      { id: 'yogurt', emoji: '🥣', name: 'Йогурт', kind: 'good' },
      { id: 'cucumber', emoji: '🥒', name: 'Огурец', kind: 'good' },
      { id: 'tomato', emoji: '🍅', name: 'Помидор', kind: 'good' },
      { id: 'grape', emoji: '🍇', name: 'Виноград', kind: 'good' },
      { id: 'strawberry', emoji: '🍓', name: 'Клубника', kind: 'good' },
      { id: 'pear', emoji: '🍐', name: 'Груша', kind: 'good' },
      { id: 'kiwi', emoji: '🥝', name: 'Киви', kind: 'good' },
      { id: 'avocado', emoji: '🥑', name: 'Авокадо', kind: 'good' },
      { id: 'fish', emoji: '🐟', name: 'Рыба', kind: 'good' },
      { id: 'bread', emoji: '🍞', name: 'Хлеб', kind: 'neutral' },
      { id: 'eggs', emoji: '🥚', name: 'Яйца', kind: 'neutral' },
      { id: 'cheese', emoji: '🧀', name: 'Сыр', kind: 'neutral' },
      { id: 'coffee', emoji: '☕', name: 'Кофе', kind: 'neutral' },
      { id: 'chicken', emoji: '🍗', name: 'Курица', kind: 'neutral' },
      { id: 'rice', emoji: '🍚', name: 'Рис', kind: 'neutral' },
      { id: 'pasta', emoji: '🍝', name: 'Паста', kind: 'neutral' },
      { id: 'meat', emoji: '🥩', name: 'Мясо', kind: 'neutral' },
      { id: 'potato', emoji: '🥔', name: 'Картошка', kind: 'neutral' },
      { id: 'corn', emoji: '🌽', name: 'Кукуруза', kind: 'neutral' },
      { id: 'peanut', emoji: '🥜', name: 'Арахис', kind: 'neutral' },
      { id: 'beer', emoji: '🍺', name: 'Пиво', kind: 'bad' },
      { id: 'pizza', emoji: '🍕', name: 'Пицца', kind: 'bad' },
      { id: 'chocolate', emoji: '🍫', name: 'Шоколад', kind: 'bad' },
      { id: 'cola', emoji: '🥤', name: 'Кола', kind: 'bad' },
      { id: 'chips', emoji: '🥨', name: 'Чипсы', kind: 'bad' },
      { id: 'burger', emoji: '🍔', name: 'Бургер', kind: 'bad' },
      { id: 'hotdog', emoji: '🌭', name: 'Хот-дог', kind: 'bad' },
      { id: 'candy', emoji: '🍬', name: 'Конфеты', kind: 'bad' },
      { id: 'icecream', emoji: '🍦', name: 'Мороженое', kind: 'bad' },
      { id: 'donut', emoji: '🍩', name: 'Пончик', kind: 'bad' },
      { id: 'cake', emoji: '🍰', name: 'Торт', kind: 'bad' },
      { id: 'cookie', emoji: '🍪', name: 'Печенье', kind: 'bad' },
      { id: 'fries', emoji: '🥡', name: 'Фри', kind: 'bad' },
      { id: 'nachos', emoji: '🌮', name: 'Начос', kind: 'bad' },
      { id: 'sausage', emoji: '🌭', name: 'Сосиска', kind: 'bad' },
      { id: 'energy', emoji: '⚡', name: 'Энергетик', kind: 'bad' },
      { id: 'lollipop', emoji: '🍭', name: 'Леденец', kind: 'bad' },
    ],
  },

  unpacking: {
    step1Ms: 2000,
    confettiCount: 18,
    receiptAutoAdvanceMs: 5000,
    statBoostFallback: { hunger: 25, thirst: 20, health: 25, mood: 12 },
    orbitSlots: [
      { left: 72, top: 36 },
      { left: 82, top: 50 },
      { left: 65, top: 58 },
      { left: 16, top: 44 },
      { left: 22, top: 58 },
    ],
  },

  criticalStat: {
    threshold: 15,
    warnIntervalMs: 30000,
  },

  replies: {
    idleHideMs: 4000,
    /** Обычные реплики на главном — не гасить через 4 с */
    homeIdleAutoHide: false,
    /** Подсказки по еде — пауза между показами */
    nutritionMinGapMs: 5000,
    nutritionHoldMs: 3500,
    idleLongChars: 50,
    reactionLifeMs: 1400,
    nutritionChance: 0.15,
    nutritionDismissOnTapMs: 1500,
  },

  tutorial: {
    spotlightPad: 10,
    foodHint: 'тап или свайп',
    dimStrong: 'rgba(0, 0, 0, 0.75)',
    dimLight: 'rgba(0, 0, 0, 0.45)',
    steps: [
      {
        id: 'welcome',
        targetSelector: '',
        cardPlacement: 'center',
        text: 'Привет! Я Колобок. Теперь живу с тобой. Покажу всё за минуту.',
        buttonText: 'Поехали 🚀',
      },
      {
        id: 'stats',
        targetSelector: '#stats-bars',
        cardPlacement: 'bottom',
        text: 'Это мои показатели. Сытость, Жажда, Здоровье, Настроение. Чем выше — тем я бодрее.',
        buttonText: 'Понял 👌',
      },
      {
        id: 'score',
        targetSelector: '#score-hub',
        cardPlacement: 'bottom',
        text: 'За тапы и забеги копятся очки. На них покупаешь шмот, домики, плюшки.',
        buttonText: 'Круто',
      },
      {
        id: 'floating_food',
        targetSelector: '.stage-hero',
        cardPlacement: 'bottom',
        dim: 'light',
        text: 'Летающую еду тапай или режь свайпом. Зелёное и жёлтое — +1 звезда, красное — ничего не даёт.',
        action: 'wait_for_tap',
      },
      {
        id: 'receipt',
        targetSelector: '#btn-receipt',
        cardPlacement: 'top',
        text: 'Сюда падают твои реальные покупки из Пятёрочки, Перекрёстка или Чижика. Разбираю чек — комментирую с иронией, без менторства.',
        buttonText: 'Пошли дальше',
      },
      {
        id: 'run',
        targetSelector: '#btn-run',
        cardPlacement: 'top',
        text: 'Переел? Гоним в мини-игры. Раннер, тапалки. Я сжигаю калории, ты копишь очки.',
        buttonText: 'Запомнил',
      },
      {
        id: 'speech_example',
        targetSelector: '',
        cardPlacement: 'bottom',
        dim: 'light',
        text: 'Главное: я даю советы на основе ТВОИХ покупок. Не нравится — игнорь.',
        buttonText: 'Спасибо!',
        demoSpeech: 'Кофе зашёл. Бодрость в деле, бро.',
      },
    ],
  },

  lecture: {
    tapChance: 0.12,
    purchaseReviewChance: 0.35,
    dismissLabels: [
      'Понял, бро',
      'Ок, запомнил',
      'Ладно, не буду',
      'Услышал, красавчик',
      'Принял, не обижайся',
      'Ясно, не грузи',
    ],
  },

  moodThresholds: {
    hungerLow: 20,
    thirstLow: 20,
    healthLow: 30,
    angryMood: 20,
    moodHigh: 80,
    allGoodMin: 50,
    allGoodMax: 70,
    overstuffed: 95,
    sleepyHunger: 110,
    burnRunAbove: 100,
  },

  loader: {
    minShowMs: 1800,
    /** В Telegram — короче, без долгого прелоада видео */
    telegramMinShowMs: 400,
    telegramMaxWaitMs: 4500,
    /** Фоновая подгрузка 1-го ролика в TG после сплэша */
    telegramVideoPrimeMs: 5000,
    hideFadeMs: 500,
    afterLoadPauseMs: 400,
    videoTimeoutMs: 8000,
    tipRotateMs: 2400,
    logoSrc: 'assets/kolobok/logo.png',
    doneTip: 'Погнали, бро — колобок на связи 🟡',
    tips: [
      'Качаем мышцы из теста…',
      'Не булка — значит, не вздуемся.',
      'Бабка в очереди. Ты — в зале.',
      'Скоро можно будет затапить.',
      'Спортивный режим: включён.',
    ],
    telegramSlowTips: [
      'Первый заход — до 2–3 мин, не закрывай Mini App',
      'Тянем файлы с сервера…',
      'Медленный интернет — норм, подожди',
      'Почти готово, бро',
    ],
    telegramSlowProgressMs: 180000,
    telegramSlowProgressStepMs: 2000,
  },

  viewport: {
    /** Блок «переверни телефон» только если короткая сторона экрана меньше этого (px) */
    landscapeBlockMaxShortPx: 520,
    /** Не показывать оверлей в десктоп-клиентах Telegram */
    landscapeDesktopPlatforms: ['tdesktop', 'macos', 'web', 'weba', 'unigram'],
  },

  kolobokHome: {
    videoType: 'video/webm',
    preloadBeforeEndSec: 2.8,
    prerollBeforeEndSec: 0.65,
    videoCrossfadeMs: 520,
    videoExitFadeMs: 520,
    videos: [
      {
        src: 'assets/kolobok/kolobok-home.webm',
        poster: 'assets/kolobok/kolobok-home-poster.jpg',
      },
      {
        src: 'assets/kolobok/kolobok-home-2.webm',
        poster: 'assets/kolobok/kolobok-home-2-poster.jpg',
      },
      {
        src: 'assets/kolobok/kolobok-home-3.webm',
        poster: 'assets/kolobok/kolobok-home-3-poster.jpg',
      },
    ],
  },

  statBars: [
    { key: 'hunger', label: 'Сытость', icon: '🍗' },
    { key: 'thirst', label: 'Жажда', icon: '💧' },
    { key: 'health', label: 'Здоровье', icon: '❤️' },
    { key: 'mood', label: 'Настроение', icon: '😎' },
  ],

  socialBanner: {
    totalPlayers: 156,
    shimmerIntervalMs: 12000,
    shimmerDelayMs: 5000,
  },

  roadmap: {
    totalPlayers: 156,
    backLabel: 'Назад',
    headIcon: '🍞',
    nextGoalLabel: 'Следующая цель',
    allGoalsDoneText: 'Все цели на данный момент взяты, бро. Дальше — только вверх.',
    rangeTemplate: '{from} → {to} мякишей',
    progressTemplate: '{current} / {goal} мякишей',
    remainTemplate: 'Осталось {count} мякишей',
    badgeDone: 'Получено',
    badgeActive: 'Осталось {count} мякишей',
    goalLabelTemplate: '{goal} мякишей',
    goals: [
      { goal: 100, reward: 'Закрытое сообщество в Telegram (чат основателей)' },
      { goal: 500, reward: 'Лидерборд + достижения' },
      { goal: 1500, reward: 'Скины колобка (3 шт.)' },
      { goal: 5000, reward: 'Кормление через чек покупок (реальный парсинг)' },
      { goal: 15000, reward: 'Сезон 2: План побега (новый биом раннера + 2 анимации)' },
      { goal: 50000, reward: 'Сезон 3: Первый лес (новые продукты, новые боссы)' },
      { goal: 100000, reward: 'Гильдии / команды мякишей (соревнования)' },
      { goal: 250000, reward: 'Сезон 4 + турниры с призами' },
      { goal: 500000, reward: 'Кросс-платформа (выход за пределы Telegram?)' },
      { goal: 1000000, reward: '??? (мы это узнаем, когда дойдём, бро)' },
    ],
  },

  topPanel: {
    statFillColors: {
      hunger: '#F5A623',
      thirst: '#4FB3F5',
      health: '#E25C5C',
      mood: '#B57BE0',
    },
    statThemes: {
      hunger: { rgb: '245, 166, 35', hex: '#F5A623', dark: '#C48412' },
      thirst: { rgb: '79, 179, 245', hex: '#4FB3F5', dark: '#2E8BC4' },
      health: { rgb: '226, 92, 92', hex: '#E25C5C', dark: '#B83A3A' },
      mood: { rgb: '181, 123, 224', hex: '#B57BE0', dark: '#8B4FB8' },
    },
    statChipLabels: {
      hunger: 'СЫТОСТЬ',
      thirst: 'ЖАЖДА',
      health: 'ЗДОРОВЬЕ',
      mood: 'НАСТРОЕНИЕ',
    },
    criticalRatio: 0.15,
    statTipHideMs: 1500,
    menuItems: [
      { icon: '🔊', label: 'Звук' },
      { icon: '📳', label: 'Вибрация' },
      { icon: '📜', label: 'Правила игры' },
      { icon: '💬', label: 'Поддержка' },
      { icon: '🗑', label: 'Сбросить прогресс', action: 'resetProgress' },
    ],
    resetConfirm:
      'Сбросить ВСЁ? Имя колобка, очки, статы, туториал и сохранение в облаке — как в первый раз.',
    exit: {
      title: 'Выйти из игры?',
      text: 'Прогресс сохранён ✅\nКолобок будет ждать 🥺',
      stayLabel: 'Остаться',
      leaveLabel: 'Выйти',
    },
  },

  homeLayout: {
    /** Логировать размеры в консоль при изменении (отладка) */
    debugLog: false,
  },

  feedCooldown: {
    storageKey: 'lastFeedTimestamp',
    durationMs: 20 * 60 * 60 * 1000,
    /** При purchase.testMode — 1 мин для проверки */
    devDurationMs: 60 * 1000,
    useDevDuration: true,
    fedLabel: 'Сыт',
    buttonIcon: '🍔',
    toastText: 'Колобок ещё сыт, бро. Покормить можно через {time}.',
    tickMs: 1000,
    toastMs: 2800,
    /** Пока «Сыт» — чаще подсказки при тапе по еде на сцене */
    nutritionTipChance: 0.4,
  },

  /** Ядро петли: сперва накорми + напои, потом мини-активности выгоднее. */
  feedLoop: {
    /** На проде ограничим 3/день; сейчас для теста без лимита. */
    testUnlimitedPhotoFeeds: true,
    dailyPhotoFeedLimit: 3,
    /** Что считаем «напоил» для суточного статуса. */
    drinkFoodIds: ['water', 'tea', 'juice', 'milk', 'coffee', 'energy'],
    /** Если за день и накормил, и напоил — множитель очков в тап/свайп/спавн. */
    fullCarePointsMultiplier: 1.5,
    /** И небольшой бонус к статам за игру в этом состоянии. */
    fullCareTapStatBonus: 1,
  },

  purchase: {
    testMode: true,
    itemCountMin: 3,
    itemCountMax: 5,
    receiptMinStat: 20,
    statBoostAll: 50,
    testPhases: {
      arrivalMs: 500,
      receiptRevealMs: 500,
      receiptLineDelayMs: 80,
      itemPopDelayMs: 120,
      itemFlyMs: 350,
      packageLeaveMs: 400,
      floatShowMs: 600,
      bulkBoostPauseMs: 400,
    },
    layout: {
      arcStartAngle: 0.15,
      arcEndAngle: 0.85,
      arcRadiusX: 34,
      arcRadiusY: 12,
      arcCenterY: 88,
      flyTargetY: 38,
    },
    phases: {
      arrivalMs: 1500,
      receiptRevealMs: 1500,
      receiptLineDelayMs: 200,
      itemPopDelayMs: 300,
      itemFlyMs: 550,
      packageLeaveMs: 900,
      floatShowMs: 1200,
      bulkBoostPauseMs: 900,
    },
  },

  items: [
    { id: 'milk', emoji: '🥛', name: 'Молоко', price: 89, effects: { hunger: 10 } },
    { id: 'bread', emoji: '🍞', name: 'Хлеб', price: 45, effects: { hunger: 12 } },
    { id: 'cheese', emoji: '🧀', name: 'Сыр', price: 199, effects: { hunger: 15 } },
    { id: 'chocolate', emoji: '🍫', name: 'Шоколадка', price: 79, effects: { hunger: 8, mood: 10 } },
    { id: 'cola', emoji: '🥤', name: 'Кола', price: 120, effects: { thirst: 12 } },
    { id: 'beer', emoji: '🍺', name: 'Пиво', price: 89, effects: { mood: 15, health: -5 } },
    { id: 'broccoli', emoji: '🥦', name: 'Брокколи', price: 99, effects: { health: 10 } },
    { id: 'apple', emoji: '🍎', name: 'Яблоко', price: 35, effects: { health: 8 } },
    { id: 'pizza', emoji: '🍕', name: 'Пицца', price: 350, effects: { hunger: 20, mood: 10 } },
    { id: 'meat', emoji: '🥩', name: 'Мясо', price: 450, effects: { hunger: 25 } },
    { id: 'chicken', emoji: '🍗', name: 'Курица', price: 290, effects: { hunger: 20 } },
    { id: 'coffee', emoji: '☕', name: 'Кофе', price: 150, effects: { mood: 10 } },
    { id: 'icecream', emoji: '🍦', name: 'Мороженое', price: 99, effects: { mood: 15 } },
    { id: 'banana', emoji: '🍌', name: 'Банан', price: 25, effects: { hunger: 5, health: 5 } },
    { id: 'eggs', emoji: '🥚', name: 'Яйца', price: 89, effects: { hunger: 10 } },
  ],

  /** Кормёжка фото еды — основной флоу кнопки «Кормить» */
  foodPhoto: {
    enabled: true,
    /** false = без ключа Gemini фото-фид не стартует (не рандом) */
    fallbackToMock: false,
    analyzeMs: 800,
    pickCount: 3,
    gemini: {
      enabled: true,
      /** Запросы из РФ/ТГ — через Firebase (EU). Ключ только на сервере: GEMINI_API_KEY */
      proxyUrl:
        'https://europe-west1-kolobok-6032e.cloudfunctions.net/geminiFoodPhoto',
      /** Локально без прокси: secrets.local.js + npm run build */
      apiKey: '',
      /** Приоритет (+ список из API). 1.5 сняты с API — не добавлять. */
      models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
      model: 'gemini-2.5-flash',
      useApiModelList: true,
      timeoutMs: 28000,
      maxImageSide: 1024,
      jpegQuality: 0.82,
      temperature: 0.35,
      maxOutputTokens: 400,
      proxyRetries: 2,
      proxyRetryMs: 3500,
      /** Выше — сразу кормим без выбора из 3 кнопок */
      skipConfirmMinConfidence: 0.82,
    },
    moodBonus: 2,
    tapScorePoints: 3,
    titlePick: 'Сфоткай еду',
    titleAnalyze: 'Смотрю, что ты принёс…',
    titleConfirm: 'Угадал? Тапни, если не то',
    titleResult: 'Зашло!',
    titleError: 'Не разобрал фото',
    pickHint: 'Колобок почти уверен — поправь, если промахнулся.',
    phraseHideMs: 12000,
    buttonText: 'Сфоткать еду',
    buttonIcon: '📸',
    effectsByKind: {
      good: { hunger: 14, thirst: 8, health: 10, mood: 6 },
      neutral: { hunger: 12, mood: 10 },
      bad: { hunger: 16, mood: 14, health: -4 },
    },
  },

  /** Скан QR / ФНС — выключен до этапа «фото + ИИ» */
  receiptScan: {
    enabled: false,
    proxyUrl: '',
    useFnsDirect: false,
    fnsApiUrl: 'https://proverkacheka.nalog.ru:9999/v1/incomes/full',
    fnsApiFallbackUrls: ['https://proverkacheca.nalog.ru:9999/v1/incomes/full'],
    fnsRetryCount: 3,
    fnsRetryDelayMs: 800,
    fnsTimeoutMs: 35000,
    useMock: false,
    devFakeItems: false,
    timeoutMs: 35000,
    mockDelayMs: 600,
    allowManualPaste: true,
    mockStoreName: 'Тест · Пятёрочка',
    mockItems: [
      { name: 'МОЛОКО 3.2% 930МЛ', quantity: 1, priceKopecks: 8900, totalKopecks: 8900 },
      { name: 'ХЛЕБ БЕЛЫЙ НАРЕЗКА', quantity: 1, priceKopecks: 4500, totalKopecks: 4500 },
      { name: 'COLA 0.5', quantity: 2, priceKopecks: 12000, totalKopecks: 24000 },
    ],
    pickTitle: 'Добавить чек',
    loadingTitle: 'Проверяем чек…',
    loadingDetail: 'Запрос в ФНС…',
    manualTitle: 'Ввод с чека',
    manualHint: 'Снизу чека: ФН, ФД, ФП, дата, время и итог. ФП — полностью, без обрезки.',
    manualHintQrMiss: 'QR не прочитался — введи данные с чека вручную.',
    manualHintNoDetector: 'Браузер не читает QR с фото — введи ФН/ФД/ФП с чека.',
    resultTitle: 'Покупки в чеке',
    errorTitle: 'Ошибка',
    errorFallback: 'Не удалось проверить чек',
    emptyItems: 'Позиции не детализированы (свёрнутый чек)',
    unknownStore: 'Магазин',
    fnsBadgeText: 'Проверено через ФНС',
    mockBadgeText: 'Тестовый режим (mock)',
    telegramScanHint: 'Наведи на QR чека',
    manualPastePrompt: 'Вставь строку из QR (t=...&s=...&fn=...&i=...&fp=...)',
  },

  ui: {
    receiptStoreHeading: 'Чек · Пятёрочка / Перекрёсток / Чижик',
    unpackButton: 'Сфоткать еду',
    receiptButtonIcon: '📸',
    shopButton: 'Магазин',
    openBagButton: 'Открыть пакет 📦',
    runButton: 'Сжечь калории',
    runButtonIcon: '🔥',
    shopButtonIcon: '🛍',
    speechHideIdleMs: 6000,
    hapticTapMs: 10,
    hapticAchievement: [50, 30, 50],
    tapMoodBonus: 1,
    statLowPercent: 30,
    receiptBlockedPhrases: [
      '{name}, распаковка только когда стат в красной зоне.',
      '{name}, всё норм — в магазин не ходили. Отдохни.',
      'Показатели не в жопе, {name}. Покупки подождут.',
    ],
    stubRunPhrases: [
      'Бежать хочешь? Раннер на подходе. Пока отдыхай.',
      'Ноги чешутся — норм. Этап 3, брат, скоро.',
      'От бабки убежишь потом. Сейчас — домашний режим.',
    ],
  },
};
