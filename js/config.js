import { BUILD as BUILD_FILE } from './build.js';

/** Актуальная сборка: сначала из boot (fetch build.js), иначе из файла. */
export const BUILD =
  (typeof window !== 'undefined' && window.__KOLOBOK_BUILD) || BUILD_FILE;

export const CONFIG = {
  build: BUILD,
  storageKey: 'kolobok_save',
  saveVersion: 9,

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
    enabled: false,
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
    basePercent: 80,
    startPercent: 80,
    /** @deprecated для миграции v6 */
    base: 80,
    start: 80,
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
          text: 'Слева вкладка «Прокачка» — здесь ты тратишь ⭐ и поднимаешь потолок моих статов.',
          tab: 'upgrade',
          targetSelector: '#shop-tab-upgrade',
          button: 'Дальше',
        },
        {
          text: 'А вот «Дома» — чисто вайб и визуал. Переключай, чтобы менять локацию.',
          tab: 'houses',
          targetSelector: '#shop-tab-houses',
          button: 'Дальше',
        },
        {
          text: 'Сначала вкинь очки в «Прокачка», потом уже кайфуй с домами.',
          tab: 'upgrade',
          targetSelector: '#shop-panel-upgrade .shop-upgrade-card__btn',
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
    /** Тест: −1% HUD всех статов каждые fixedTickMs (потом выключить) */
    useFixedTickDecay: true,
    fixedTickMs: 2500,
    fixedDropDisplayPercent: 1,
    tickMs: 10000,
    homeSlowdown: 1.5,
    /** Отображаемый % полоски (0–100) за 90 мин при весе 1; при max 120 ≈ 1.2 пункта */
    displayPercentPer90Min: 1,
    hunger: 1,
    thirst: 1,
    strength: 0,
    agility: 0,
    runMultiplier: 1.8,
    /** Оффлайн-декей: максимум сколько часов считаем за один вход. */
    offlineMaxHours: 168,
  },

  /**
   * Восстановление силы/ловкости на домашнем экране:
   * скорость от сытости (сила) и жажды (ловкость).
   */
  combatRegen: {
    enabled: true,
    strengthBasePerTick: 1.2,
    agilityBasePerTick: 1.2,
    minNutritionFactor: 0.12,
    exhaustionPenaltyPerTick: 0.4,
    feedBurstTicks: 4,
  },

  /** +display % за тап/слайс по еде на экране (до личного max). */
  combatTapRestore: {
    displayPercent: 1,
  },

  timers: {
    phraseRotateMs: 8000,
    autosaveMs: 5000,
  },

  statColors: {
    hunger: { from: '#FF8C42', to: '#FFB84D' },
    thirst: { from: '#4A9EFF', to: '#6BB6FF' },
    strength: { from: '#E85D4A', to: '#FF7E6B' },
    agility: { from: '#7B68EE', to: '#9B8CFF' },
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
    statBoostFallback: { hunger: 25, thirst: 20, strength: 25, agility: 12 },
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
    /** false — без бабблов, приветствий и советов колобка на главном */
    enabled: false,
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
    firstNeedsPercent: 24,
    tutorialBonusBadge: '🎁 Первая кормёжка — дальше сам.',
    /** Обычные шаги ожидания (тап и т.п.) */
    stepSkipDelayMs: 6000,
    /** Проблемные шаги (фото-кормление) */
    stepSkipDelayCriticalMs: 3000,
    stepSkipLabel: 'Пропустить шаг',
    foodHint: 'тап или свайп',
    dimStrong: 'rgba(0, 0, 0, 0.75)',
    dimLight: 'rgba(0, 0, 0, 0.45)',
    steps: [
      {
        id: 'welcome',
        targetSelector: '#stats-bars',
        statsFocus: true,
        cardPlacement: 'below-target',
        text: 'Хозяин, меня только испекли — а я уже голоден и хочу пить. Накорми меня!',
        buttonText: 'Помочь колобку',
      },
      {
        id: 'feed_intro',
        targetSelector: '#btn-receipt',
        cardPlacement: 'top',
        text: 'Жми сюда, чтобы покормить и напоить своего колобка. Он ест тем же, что и ты: сфоткай еду — и колобок насытится. В благодарность подскажу, как тебе лучше питаться.',
        buttonText: 'Понял',
      },
      {
        id: 'feed_source',
        cardPlacement: 'center',
        dim: 'light',
        noSpotlight: true,
        text: 'Можно с камеры или из галереи. На Android иногда только галерея — это нормально.\n\nЧтобы не тормозить старт, я уже подобрал тебе еду и воду — но только в первый раз, хозяин.',
        examples: [
          { src: 'assets/tutorial/food-fish-example.png', label: 'Пример еды: рыба' },
          { src: 'assets/tutorial/water-example.png', label: 'Пример воды: бутылка' },
        ],
        buttonText: 'Спасибо, бро',
      },
      {
        id: 'feed_manual_pick',
        targetSelector: '#food-photo-choices',
        cardPlacement: 'top',
        dim: 'light',
        text: 'Если колобок не уверен — выбери правильный вариант из списка. Так бывает, это нормально.',
        buttonText: 'Запомнил',
        action: 'show_confirm_demo',
      },
      {
        id: 'feed_wait',
        targetSelector: '#food-photo-done',
        cardPlacement: 'top',
        dim: 'light',
        spotlightPad: 14,
        text: 'Вот факт и совет по питанию. Жми «Покормить» — и смотри, как растут сытость и жажда.',
        action: 'wait_for_photo_feed',
      },
      {
        id: 'feed_after',
        targetSelector: '#stats-bars',
        cardPlacement: 'bottom',
        text: 'Отлично! Видишь рост статов. Корми чаще — советы станут точнее, и я смогу оценивать твой рацион.',
        buttonText: 'Идем дальше',
      },
      {
        id: 'floating_food',
        targetSelector: '.stage-hero',
        cardPlacement: 'bottom',
        dim: 'light',
        text: 'Тап и свайп по летающей еде снимают напряжение и дают очки для мини-игр.',
        buttonText: 'Понял',
      },
      {
        id: 'run',
        targetSelector: '#btn-run',
        cardPlacement: 'top',
        text: 'Кнопка "Сжечь калории" — вход в мини-игры. Там очков заметно больше.',
        buttonText: 'Погнали',
      },
      {
        id: 'speech_example',
        targetSelector: '',
        cardPlacement: 'bottom',
        dim: 'light',
        text: 'Главное правило: фото-кормление — база. Я рядом и буду помогать по питанию без душнилы.',
        buttonText: 'Старт',
        demoSpeech: 'Корми чаще — и я дам более ценные советы по рациону, хозяин.',
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
    strengthLow: 30,
    agilityLow: 30,
    angryMood: 20,
    moodHigh: 80,
    allGoodMin: 50,
    allGoodMax: 70,
    overstuffed: 95,
    sleepyHunger: 110,
    burnRunAbove: 100,
  },

  loader: {
    /** Жёсткий минимум видимости сплэша (мс) — браузер и Telegram */
    absoluteMinShowMs: 3000,
    minShowMs: 3000,
    /** В Telegram — тот же минимум, без долгого прелоада видео */
    telegramMinShowMs: 3000,
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

  statGroups: {
    nutrition: { label: 'Питание' },
    combat: { label: 'Форма' },
  },

  statBars: [
    { key: 'hunger', label: 'Сытость', icon: '🍗', group: 'nutrition' },
    { key: 'thirst', label: 'Жажда', icon: '💧', group: 'nutrition' },
    { key: 'strength', label: 'Сила', icon: '💪', group: 'combat' },
    { key: 'agility', label: 'Ловкость', icon: '⚡', group: 'combat' },
  ],

  socialBanner: {
    totalPlayers: 156,
    shimmerIntervalMs: 12000,
    shimmerDelayMs: 5000,
    lifeSuffix: ' вне печки',
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
      strength: '#E85D4A',
      agility: '#7B68EE',
    },
    statThemes: {
      hunger: { rgb: '245, 166, 35', hex: '#F5A623', dark: '#C48412' },
      thirst: { rgb: '79, 179, 245', hex: '#4FB3F5', dark: '#2E8BC4' },
      strength: { rgb: '232, 93, 74', hex: '#E85D4A', dark: '#C44332' },
      agility: { rgb: '123, 104, 238', hex: '#7B68EE', dark: '#5A4BB8' },
    },
    statChipLabels: {
      hunger: 'СЫТОСТЬ',
      thirst: 'ЖАЖДА',
      strength: 'СИЛА',
      agility: 'ЛОВКОСТЬ',
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
    death: {
      title: 'Колобок остыл',
      text: 'Запас сил закончился. Испечь нового колобка?',
      rebakeLabel: 'Испечь нового',
    },
  },

  homeLayout: {
    /** Логировать размеры в консоль при изменении (отладка) */
    debugLog: false,
  },

  feedCooldown: {
    /** Временно выкл. — вернём лимит «сыт» позже */
    enabled: false,
    storageKey: 'lastFeedTimestamp',
    durationMs: 20 * 60 * 60 * 1000,
    /** При purchase.testMode — 1 мин для проверки */
    devDurationMs: 60 * 1000,
    useDevDuration: false,
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

  dailyMissions: {
    enabled: true,
    countPerDay: 3,
    rewardStars: 120,
    rewardsByDifficulty: {
      easy: 30,
      medium: 45,
      hard: 70,
    },
    chipTitle: 'Дейлики',
    chipDone: 'На сегодня всё',
    sheetTitle: 'Задания дня',
    claimLabel: 'Забрать награду',
    claimedLabel: 'Награда получена',
    resetHint: 'Обновление в 00:00',
    pool: [
      { id: 'feed_food_2', type: 'feed_food', target: 2, difficulty: 'easy', label: 'Покормить 2 раза' },
      { id: 'feed_drink_1', type: 'feed_drink', target: 1, difficulty: 'easy', label: 'Напоить 1 раз' },
      { id: 'feed_any_3', type: 'feed_any', target: 3, difficulty: 'medium', label: 'Покормить/напоить 3 раза' },
      { id: 'runner_1', type: 'runner_run', target: 1, difficulty: 'medium', label: 'Пробежать в раннере 1 раз' },
      { id: 'tap_40', type: 'tap_count', target: 40, difficulty: 'easy', label: 'Затапать 40 раз' },
      { id: 'swipe_12', type: 'swipe_count', target: 12, difficulty: 'medium', label: 'Свайпнуть 12 раз' },
      { id: 'score_180', type: 'score_gain', target: 180, difficulty: 'hard', label: 'Набрать 180 очков' },
    ],
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
    { id: 'chocolate', emoji: '🍫', name: 'Шоколадка', price: 79, effects: { hunger: 8, agility: 10 } },
    { id: 'cola', emoji: '🥤', name: 'Кола', price: 120, effects: { thirst: 12 } },
    { id: 'beer', emoji: '🍺', name: 'Пиво', price: 89, effects: { agility: 15, strength: -5 } },
    { id: 'broccoli', emoji: '🥦', name: 'Брокколи', price: 99, effects: { strength: 10 } },
    { id: 'apple', emoji: '🍎', name: 'Яблоко', price: 35, effects: { strength: 8 } },
    { id: 'pizza', emoji: '🍕', name: 'Пицца', price: 350, effects: { hunger: 20, agility: 10 } },
    { id: 'meat', emoji: '🥩', name: 'Мясо', price: 450, effects: { hunger: 25 } },
    { id: 'chicken', emoji: '🍗', name: 'Курица', price: 290, effects: { hunger: 20 } },
    { id: 'coffee', emoji: '☕', name: 'Кофе', price: 150, effects: { agility: 10 } },
    { id: 'icecream', emoji: '🍦', name: 'Мороженое', price: 99, effects: { agility: 15 } },
    { id: 'banana', emoji: '🍌', name: 'Банан', price: 25, effects: { hunger: 5, strength: 5 } },
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
    titlePick: 'Покорми колобка',
    pickIntro:
      'Лучше всего — сфоткай или кинь из галереи: разберу, накормлю и выдам джигурный факт. Нет еды под рукой? Внизу скажешь, что жрёшь — тоже покормлю.',
    buttonManual: '🤷 Ничего под рукой — скажу, что ем',
    buttonCamera: '📸 Сфоткать еду',
    buttonGallery: '🖼 Из галереи',
    titleManual: 'Что жрёшь?',
    manualHint: 'Тапни продукт — накормлю без фото, факты всё равно будут.',
    titleAnalyze: 'Смотрю на фото…',
    titleConfirm: 'Что на фото?',
    confirmLowConfidenceHint: 'Поправь, если промахнулся 👇',
    titleResult: 'Зашло!',
    feedButtonLabel: 'Покормить',
    fillPrimaryStatPercent: 80,
    titleError: 'Не разобрал фото',
    pickHint: 'Почти угадал — поправь, если не то.',
    phraseHideMs: 12000,
    buttonText: 'Кормить',
    buttonIcon: '📸',
    nutritionCoach: {
      factsById: {
        water: [
          'Минус 1–2% воды в организме — и мозг уже «ну типа работаю», а не работает.',
          'Вода не скучная: без неё кофе — просто горькая драма.',
        ],
        tea: [
          'В чае полифенолы — антиоксиданты. То есть чай не только для философии.',
          'Зелёный или чёрный — оба норм, главное не заменить ими всю воду.',
        ],
        juice: [
          'Сок — это фрукт без клетчатки. Вкусно, но яблоко целиком умнее.',
          'Фруктовый сахар без мякоти прилетает быстрее — не удивляйся.',
        ],
        milk: [
          'Молоко — белок + кальций. После трены или после «ой, опять не спал» — заходит.',
          'Лактоза кому-то не друг, но сам продукт — рабочая база.',
        ],
        apple: [
          'Пектин в яблоке — как мягкий стоп-кран для голода. Хруст = уважение.',
          '«Яблоко в день» — не магия, но лучше, чем «ничего в день».',
        ],
        banana: [
          'Банан — быстрые углеводы и калий. Мышцы после нагрузки скажут «спс, бро».',
          'Жёлтый друг перекуса: сладко, но не как конфета из автомата.',
        ],
        broccoli: [
          'Брокколи — витамин C и куча полезняка. Да, зелёное. Да, ты красава, что ешь.',
          'Мини-деревья на тарелке — не наказание, а апгрейд.',
        ],
        orange: [
          'Апельсин — витамин C и клетчатка. Сок из него — уже другая история.',
          'Цитрус бодрит запахом. Настроение +1, простуда — минус шансы.',
        ],
        carrot: [
          'Морковка — бета-каротин. Глаза и кожа любят, не только кролики.',
          'Хруст по моркови — бесплатная тренировка челюсти и польза в придачу.',
        ],
        salad: [
          'Салат — объём без калорий-бомбы. Сытость через «много жуёшь — мало жрёшь».',
          'Листья + овощи = разнообразие за один тап. Умный ход.',
        ],
        yogurt: [
          'Йогурт — белок и пробиотики, если без сахарной бомбы в составе.',
          'Кисломолочное: живот говорит «ок», если не десерт под видом ПП.',
        ],
        cucumber: [
          'Огурец — вода в форме овоща. Жажда и перекус в одном.',
          'Хруст + минимум калорий. Идеально, когда «хочу жрать, но не хочу».',
        ],
        tomato: [
          'Помидор — ликопин и витамины. Кетчуп — уже не он, запомни.',
          'Красный, сочный, полезный. База для нормального дня.',
        ],
        grape: [
          'Виноград — сахар в ягодках, но с клетчаткой. Пачка за раз — уже кино.',
          'Ягоды — антиоксиданты. Главное не превратить их в вино одним движением.',
        ],
        strawberry: [
          'Клубника — мало калорий, много вкуса. Лето в одной ягоде.',
          'Витамин C в красном — красава, что выбрал не шоколад (пока).',
        ],
        pear: [
          'Груша — клетчатка и мягкая сладость. Желудок не орёт, настроение в плюс.',
          'Сочная груша лучше сухой — как и с шутками колобка.',
        ],
        kiwi: [
          'Киви — витамин C с ударом. Мохнатый снаружи, полезный внутри.',
          'Зелёное не всегда скучное: киви — доказательство.',
        ],
        avocado: [
          'Авокадо — жиры, но полезные. Тосты инстаграма иногда не врут.',
          'Кремовая текстура + калий. Сытость без фастфуда.',
        ],
        fish: [
          'Рыба — белок и омега-3. Мозг и сердце: «мы за, бро».',
          'Не только котлеты: рыба — апгрейд для головы.',
        ],
        bread: [
          'Хлеб — быстрые углеводы. С маслом — кайф, с овощами — баланс.',
          'Цельнозерновой умнее белого, но и белый не враг, если не только он.',
        ],
        eggs: [
          'Яйца — эталон белка. Желток не выкидывай без причины — там тоже польза.',
          'Омлет, варёное, яичница — три пути к одной пользе.',
        ],
        cheese: [
          'Сыр — белок и кальций. Солёный, сытный, опасный в больших дозах.',
          'Кусочек к чаю — кайф. Весь круг — уже перебор, бро.',
        ],
        coffee: [
          'Кофеин бодрит, но вода всё равно база. Кофе — бонус, не замена.',
          'Чёрный без сахара — почти диетический. Латте с сиропом — уже десерт.',
        ],
        chicken: [
          'Курица — lean-белок. Грудка скучная, но эффективная. Уважаю.',
          'Жареная в панировке — уже другой разговор. Запечённая — красава.',
        ],
        rice: [
          'Рис — топливо. Белый быстрее, бурый умнее по клетчатке.',
          'Гарнир, а не главный герой — так и держи баланс.',
        ],
        pasta: [
          'Паста — углеводы на дистанцию. С овощами и белком — норм приём пищи.',
          'Аль денте — не только про итальянцев, а про не пережаренный крахмал.',
        ],
        meat: [
          'Мясо — железо и белок. Сытость надолго, если не только жир.',
          'Стейк — праздник. Каждый день стейк — уже lifestyle-вопрос.',
        ],
        potato: [
          'Картошка — крахмал и сытость. Жареная — кайф, запечённая — умнее.',
          'Не враг ПП: враг — только картошка фри каждый день.',
        ],
        corn: [
          'Кукуруза — клетчатка и углеводы. Попкорн без масла — почти овощ.',
          'Жёлтые зёрна — энергия, но не заменяй ими салат.',
        ],
        peanut: [
          'Арахис — белок и жиры. Горсть — перекус, банка — уже кино.',
          'Орехи сытные: мало жуёшь — много калорий всё равно. Бро, не обманывайся.',
        ],
        cola: [
          'Кола — сахарный удар и такой же откат. Бодрит на 20 минут, потом «meh».',
          'Пузырьки — кайф, сахар — налог на настроение.',
        ],
        burger: [
          'Бургер — сытный, солёный, часто жирный. Раз в неделю — культура, каждый день — паттерн.',
          'Булка + котлета + соус = калории с характером. Вода после — must.',
        ],
        beer: [
          'Пиво — алкоголь + калории. Пятница прощает, понедельник считает.',
          '«Жидкий хлеб» — не замена воды, бро. Запомни.',
        ],
        pizza: [
          'Пицца — сыр, тесто, радость. Одна-две дольки — ок, вся — уже марафон.',
          'Итальянская классика: вкус 10/10, баланс — зависит от количества.',
        ],
        chocolate: [
          'Шоколад — дофамин в упаковке. Горький умнее молочного по сахару.',
          'Квадратик — перекус. Плитка — уже сериал на весь вечер.',
        ],
        chips: [
          'Чипсы — соль, жир, «ещё один». Пачка исчезает быстрее, чем ты моргаешь.',
          'Хруст обманчив: сытости мало, калорий много.',
        ],
        hotdog: [
          'Хот-дог — быстрый перекус с вопросами к составу. Раз — норм, каждый день — нет.',
          'Уличная классика: вкусно сейчас, баланс потом.',
        ],
        candy: [
          'Конфеты — чистый сахар. Мозг «вау», через час «дай ещё».',
          'Дофамин-ракета без топлива на дистанцию.',
        ],
        icecream: [
          'Мороженое — сахар + жир + счастье. Летом — святое, каждый день — риск.',
          'Рожок — кайф. Ведро — уже не перекус, а lifestyle.',
        ],
        donut: [
          'Пончик — дыра посередине, сахар снаружи. Миф «один пончик» — ты знаешь правду.',
          'Десерт, не завтрак. Хотя мы оба знаем, как бывает.',
        ],
        cake: [
          'Торт — праздник на тарелке. Будни + торт = частый сахарный паттерн.',
          'Крем и бисквит — калории с любовью. День рождения прощает.',
        ],
        cookie: [
          'Печенье — маленькие калорийные ловушки. «Ещё одно» — их любимая фраза.',
          'С чаем — кайф. С чаем ×10 — уже не кайф для талии.',
        ],
        fries: [
          'Фри — картошка, но в масле. Хруст 10/10, баланс 3/10.',
          'Гарнир к бургеру — двойной удар. Вода и овощ потом — спасение.',
        ],
        nachos: [
          'Начос — хруст + соус + калории. Для компании — ок, для одного — опасно.',
          'Сыр поверх чипсов — это уже не «лёгкий перекус».',
        ],
        sausage: [
          'Сосиска — быстро, солёно, не всегда прозрачно по составу. Раз — норм.',
          'Хот-дог младший брат: тот же вайб, те же вопросы.',
        ],
        energy: [
          'Энергетик — кофеин + сахар + «я бог». Потом — откат и тремор.',
          'Не замена сну. Сон — бесплатный энергетик, бро.',
        ],
        lollipop: [
          'Леденец — сахар на палочке. Долго во рту, быстро в крови.',
          'Детство вкусное, взрослость — следи за частотой.',
        ],
      },
      factsByKind: {
        good: [
          'Такая еда обычно сытит без сахарных американских горок. Колобок одобряет.',
          'Зелёное, водное, белковое — не скучно, а «мозг работает, жир не паникует».',
        ],
        neutral: [
          'Нейтрально — не приговор. Главное, чтобы день не был одним только этим.',
          'Середнячок по шкале: норм, если рядом вода и что-то полезнее.',
        ],
        bad: [
          'Иногда junk — это therapy. Просто не делай therapy каждый приём пищи.',
          'Сладкое/фаст — кайф сейчас, баланс потом. Вода и овощ — твои друзья после.',
        ],
      },
      fallbackFacts: [
        'Баланс — когда в дне есть и еда, и вода, а не только «ой, уже вечер».',
        'Разнообразие побеждает идеальный один продукт раз в месяц.',
      ],
      advice: {
        noDrinkYet: [
          'Сегодня без напитков — добавь воды, колобок перестанет драматизировать.',
          'Один стакан воды — и ты уже не только «жрёшь, но не пьёшь», бро.',
        ],
        noFoodYet: [
          'Только пил — пора и поесть нормально, не только жидкие калории.',
          'Напитки не заменяют тарелку. Закрой день хоть одним нормальным приёмом.',
        ],
        badKind: [
          'После такого — вода или фрукт, и колобок не будет коситься.',
          'Следующий выбор полегче — и паттерн не превратится в «жизнь — это бургер».',
        ],
        goodKind: [
          'Красава, держи темп. Чередуй продукты — скучно не будет, полезно — да.',
          'Топ выбор. Добей воды — и день почти идеален, без занудства.',
        ],
        default: [
          'Разнообразие > идеальная еда раз в неделю. Колобок не нутрициолог, но логику знает.',
          'Еда + вода в течение дня — база. Остальное — бонусы и иногда пицца.',
        ],
        patternWaterGap: [
          'Паттерн: мало пили в последние дни. Сегодня 1–2 скана воды — и колобок успокоится.',
          'Перекос в еду без воды. Пара питьевых сканов — и баланс снова в игре.',
        ],
        patternBadOveruse: [
          'Паттерн: много сладкого/фаста в сканах. Следующий — полегче, бро, не драма.',
          'Тяжёлая еда доминирует. Добей воду и что-то из «good» — колобок скажет спасибо.',
        ],
        patternLowDiversity: [
          'Паттерн: один и тот же тип еды. Попробуй другой продукт — мозгу скучно не будет.',
          'Мало разнообразия. Следующий скан — другой id, другой вкус, тот же колобок.',
        ],
      },
    },
    effectsByKind: {
      good: { hunger: 14, thirst: 8, strength: 10, agility: 6 },
      neutral: { hunger: 12, agility: 10 },
      bad: { hunger: 16, agility: 14, strength: -4 },
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
    unpackButton: 'Кормить',
    receiptButtonIcon: '📸',
    shopButton: 'Магазин',
    openBagButton: 'Открыть пакет 📦',
    runButton: 'Сжечь калории',
    runButtonIcon: '🔥',
    shopButtonIcon: '🛍',
    speechHideIdleMs: 6000,
    hapticTapMs: 10,
    hapticAchievement: [50, 30, 50],
    hapticUpgradeHintShow: [12, 18],
    hapticUpgradeHintOpen: [16, 14, 22],
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

/** Реплики колобка: баббл, приветствие, советы по еде, action-prompt */
export function isKolobokSpeechEnabled() {
  return CONFIG.replies?.enabled !== false;
}
