import { CONFIG } from './config.js';

export const phrases = {
  normal: [
    '{name}, норм движ. Пока катит.',
    '{name}, я из печи, но модный. Уважаю.',
    'Сказка — стиль жизни, {name}. Если чё.',
    '{name}, бабка пекла — я легенда. Без пафоса.',
    'Сижу, дышу, кайфую, {name}. Дела потом.',
    '{name}, я круглый, но не простой.',
    'Норм движ, бро. Пока катит.',
  ],

  hungry: [
    '{name}, слышь — есть хочу. Заряди чего-нибудь.',
    '{name}, желудок пустой, настроение тоже. Блин.',
    'Бро, сытость на нуле, {name}. Это не движ.',
    '{name}, голод — не шутка. Корми, красавчик.',
    'Ё-моё, {name}, мечтаю о хлебе. Принесёшь?',
    'Пустой колобок грустный, {name}. Заряди.',
    'Слышь, есть хочу. Заряди чего-нибудь.',
  ],

  thirsty: [
    '{name}, жажда есть. Капни чего-нибудь.',
    'Рот сухой, {name}. Как послезавтра. Не катит.',
    '{name}, вода — уважение. Где она?',
    'Хочу пить, {name}. Не драму — факт.',
    '{name}, кола, сок, хоть из-под крана. Чё есть?',
    'Жажда бьёт по настроению, {name}. Помоги.',
  ],

  sick: [
    '{name}, чёт расклеился. Полежу маленько.',
    'Не в форме сегодня, {name}. Бывает, брат.',
    '{name}, лень залезла. Не геройствую — отдых.',
    'Организм не в ударе, {name}. Пауза, блин.',
    '{name}, слабовато. Потом снова в движ.',
    'Такой вайб не катит, {name}. Полежу.',
  ],

  angry: [
    '{name}, бесит. Настроение на нуле.',
    'Чё, {name}, забыл про меня? Злюсь чуть-чуть.',
    '{name}, дофамин ушёл. Верни настроение.',
    'Так не катит, {name}. Подкинь приятное.',
    '{name}, не истеричка я, но сейчас близко.',
    'Злой колобок круглый, {name}. Помоги.',
  ],

  happy: [
    '{name}, кайф полный! Так и живём.',
    'Настроение — огонь, {name}. Уважаю.',
    '{name}, всё на месте. Я доволен. Редкость.',
    'Дофамин идёт, {name}. Продолжай так.',
    'Счастливый колобок, {name}. Шучу. Норм.',
    '{name}, жизнь удалась. Пока бабка не пришла.',
  ],

  overstuffed: [
    '{name}, ох, разморило. Пойду подвигаться 🏃',
    'Кайф полный, {name} — беги, пока бабка не догнала.',
    '{name}, объелся знатно. Сжечь калории 🔥',
    'Сытость на максимуме, {name}. В раннер!',
    '{name}, пузо как подушка. Газ в забег.',
    'Наелся — уважаю, {name}. Катиться — обязан.',
  ],

  burnRun: [
    '{name}, разморило. Пора подвигаться 🏃',
    'Всё зашкаливает, {name} — жми «Сжечь калории» 🔥',
    '{name}, кайф на максимуме. Беги, пока бабка не догнала.',
    'Статы на максимуме, {name}. Сжечь бы калории?',
    '{name}, сыт — уважаю. Сидеть — нет. Сжечь 🔥',
    'Ноги чешутся, {name}. Знак: беги.',
    '{name}, пора побегать. Я готов катиться.',
    'Золотая зона статов, {name}. Только асфальт впереди.',
  ],

  idle: [
    '{name}, тут тихо. Я не против.',
    'Думаю о смысле жизни, {name}. Коротко: есть и бежать.',
    '{name}, бабка бы сказала «сядь». Я — нет.',
    'Погода норм, {name}. Колобок — тоже.',
    '{name}, скучно — тапни. Не обижусь.',
    'Легенда отдыхает, {name}. Не мешай.',
    '{name}, когда чек — скажешь. Я готов.',
    'Мемный я, {name}. Мемы не пишу.',
    '{name}, дед в очереди на погоню. Пусть ждёт.',
    'Жизнь — бег, {name}. Сначала перекус.',
  ],

  cantRun: {
    health: [
      '{name}, здоровье ноль. Лежу, не бегу. Подлечись.',
      'Ноги не идут, {name}. Цифры не врут.',
      '{name}, выдохся — даже катиться лень.',
    ],
    hunger: [
      '{name}, сытость ноль. Пустой колобок не бежит.',
      'Без еды — без движа, {name}. Заряди.',
      '{name}, желудок пустой. Корми сначала.',
    ],
    thirst: [
      '{name}, жажда ноль. Сухой — не катится.',
      'Вода на нуле, {name}. Капни чего-нибудь.',
      '{name}, пересох. Сначала пей.',
    ],
    mood: [
      '{name}, настроение в минусе. Бежать не хочу.',
      'Вайб на нуле, {name}. Подними настроение.',
      '{name}, грустный — медленный. Сначала кайф.',
    ],
    any: [
      '{name}, с нулём в статах — никак. Заряди.',
      'Так не катит, {name}. Подтяни показатели.',
    ],
  },

  packageArrived: [
    '{name}, о, привёз? Давай сюда.',
    'Пакет на месте, {name}. Уважаю.',
    '{name}, доставка приехала. Не заставляй ждать.',
    'Чек в доме, {name}. Красавчик.',
  ],

  final: [
    '{name}, норм закуп. Спасибо за движ.',
    'Сыт, доволен, {name}. К подвигам готов.',
    '{name}, чек отработан. Уважаю.',
    'Всё внутри, кайф, {name}. До следующего.',
    '{name}, бабка бы одобрила. Я — точно.',
  ],

  combos: {
    junk: [
      '{name}, сахарок!!! Дофамин пошёл.',
      'Кайф на максимум, {name}. Без менторства.',
      '{name}, сладкое, сытость, счастье. Классика.',
    ],
    healthy: [
      '{name}, ЗОЖ? В моей сказке? Уважаю.',
      'Брокколи не помеха, {name}.',
      '{name}, зелень — тоже движ.',
    ],
    feast: [
      '{name}, ё-моё, целая телега. Люблю.',
      'Большой чек — большой колобок, {name}.',
      '{name}, закуп как на свадьбу. Норм.',
    ],
    booze: [
      '{name}, пиво? Бабка не видела. Мы — видели.',
      'Взрослый чек, {name}. Без морали.',
    ],
    default: [
      '{name}, нормальный набор. Катит.',
      'Разнообразно, {name}. Уважаю выбор.',
    ],
  },

  boss: {
    village: [
      'Попался, колобок!',
      'Куда собрался без меня?',
      'Я тебя пекла, я тебя и съем.',
    ],
    forest: [
      'Стоять, мучной!',
      'От бабки убежал — от меня не уйдёшь.',
      'Дед на связи. Сдавайся.',
    ],
    field: [
      'Погоди-ка, круглый!',
      'Заяц быстрый, но ты — мой.',
      'Ну-ка стой, колобок!',
    ],
    river: [
      'Аррр, мясо пшеничное!',
      'Волк голодный — плохая новость, бро.',
      'Хвост на месте, добыча тоже.',
    ],
    mountain: [
      'Медведь не шутит. Лапы тяжёлые.',
      'Горы помнят всех сладких.',
      'Куда катишься, булочка?',
    ],
    mystery: [
      'Лиса улыбается. Тебе не до смеха.',
      'Хитрый хвост — крепкий укус.',
      'Сказка кончается. Моя версия.',
    ],
  },

  items: {
    milk: ['{name}, молоко зашло. Классика.', 'Белок в деле, {name}.', '{name}, норм заряд.'],
    bread: ['{name}, хлебушек! Как в сказке.', 'Углеводы — друзья, {name}.', '{name}, бабка одобрила бы.'],
    cheese: ['{name}, сыр — уважение.', 'Сырный кайф, {name}.', '{name}, сырный движ.'],
    chocolate: ['{name}, сахарок!!! Дофамин.', 'Шоколад, {name} — не обсуждается.', '{name}, сладкое — сила.'],
    cola: ['{name}, кола булькает. Жажда ушла.', 'Газировка — движ, {name}.', '{name}, пузырьки — кайф.'],
    beer: ['{name}, пивко... Норм вечер.', 'Без фанатизма, {name}.', '{name}, взрослый выбор.'],
    broccoli: ['{name}, брокколи хрустит.', 'Зелень зашла, {name}.', '{name}, зелёный движ.'],
    apple: ['{name}, яблочко. Сказочно.', 'Хруст — уважение, {name}.', '{name}, фрукт — норм.'],
    pizza: ['{name}, пицца!!! Вот это движ.', 'Италия внутри, {name}.', '{name}, сыр и тесто — религия.'],
    meat: ['{name}, мясо! Не веган я.', 'Белок заряжен, {name}.', '{name}, сытость максимум.'],
    chicken: ['{name}, курица в деле.', 'Птица норм, {name}.', '{name}, перекус огонь.'],
    coffee: ['{name}, кофе — бодрость.', 'Кофеин — друг, {name}.', '{name}, горько, но честно.'],
    icecream: ['{name}, мороженое! Холодный кайф.', 'Сладко и холодно, {name}.', '{name}, десерт — уважение.'],
    banana: ['{name}, банан — быстрый заряд.', 'Жёлтый друг, {name}.', '{name}, калий. Не спрашивай.'],
    eggs: ['{name}, яйца. Завтрак чемпиона.', 'Белок в скорлупе, {name}.', '{name}, не пожалел.'],
  },

  foodLectures: {
    byId: {
      burger: [
        'Бургер — булка обняла сыр. Классика, бро.',
        'Двойной чиз? Звучит как план «потом побегу». Потом — не сегодня.',
        'Сочный? Да. Настроение? Тоже да. Уважаю.',
      ],
      hotdog: [
        'Хот-дог — быстрый перекус. Сытость в деле, бро.',
        'Сосиска в тесте — уличная классика. Хрустит, уважаю.',
        'Съел — и хочется ещё. Так и работает, брат.',
      ],
      fries: [
        'Картошка фри — хрустит знатно. К кино самое то.',
        'Соль + хруст = кайф. Понимаю выбор, бро.',
        'Это не гарнир — это настроение. Вкусное, признаю.',
      ],
      pizza: [
        'Пицца — круг счастья. Святое дело, бро.',
        'Сыр тянется — настроение растёт. Кайф без драмы.',
        'Доставка любви. Италия внутри, уважаю.',
      ],
      donut: [
        'Пончик — дыра посередине, кайф снаружи.',
        'Сахар в ударе. Дофамин сказал «да». Я согласен.',
        'Один пончик — миф. Ты же знаешь, как это работает.',
      ],
      cola: [
        'Кола бодрит, пузырьки шипят. Освежает, бро.',
        'Шипучка — движ. Жажда уходит, настроение в плюс.',
        'Пузырьки — кайф. Я не моралист — я колобок с опытом.',
      ],
      energy: [
        'Энергетик — ракета на час. Бодрость из банки, бро.',
        'Сердце бьётся как на забеге. Энергия в деле.',
        'Бодрость из банки — не сон, не еда. Свой вайб.',
      ],
      beer: [
        'Пиво — классика пятницы, бро. Пенный кайф.',
        'Пенное. Уважаю выбор. Бабка не видела.',
        'Не зло — просто вечерний движ. Я круглый, не судья.',
      ],
      icecream: [
        'Мороженое — холодный кайф. Сладко и честно.',
        'Мозги: «ещё шарик». Я: «давай, бро».',
        'Летом — легенда. Каждый день — тоже кайф, если честно.',
      ],
      chocolate: [
        'Шоколад — кайф к чаю. Дофамин в деле.',
        'Горький? Стильно. Молочный? Вкуснее. Выбор за тобой, бро.',
        'Два квадратика — норм. Плитку — уважаю смелость.',
      ],
      coffee: [
        'Кофе — бодрит мозг. Рабочий движ, бро.',
        'Горько, честно, рабоче. С сиропом — уже праздник.',
        'Одна чашка — ок. Три — ты не колобок, ты вибратор.',
      ],
      water: [
        'Вода — база. Без неё я мячик с морщинами, не шучу.',
        'Чистая, скучная, гениальная. Жажда уходит — уважение приходит.',
        'Лучший напиток, если не считать молоко. Считаем? Тогда топ-2.',
      ],
      milk: [
        'Молоко — кальций, белок, детство. Норм заряд без драмы.',
        'Тёплое — сон клонит. Холодное — свежо. Оба — в плюс.',
        'Бабка бы сказала «пей». Я говорю «пей, бро, это катит».',
      ],
      juice: [
        'Сок — фрукт в стакане. Вкусно, бро.',
        'Витамины есть, вкус тоже. Уважаю.',
        'Освежает, бро. Летний движ без пафоса.',
      ],
      apple: [
        'Яблоко — хруст, сказка, уважение.',
        'Одно в день — миф, но пару — норм движ.',
        'Сладкое, но честное. Зубы рады, настроение тоже.',
      ],
      banana: [
        'Банан — быстрый заряд, калий, удобно. Перекус, бро.',
        'Мягкий, сладкий, без фанатизма — топ.',
        'Жёлтый друг. Кайф без философии.',
      ],
      broccoli: [
        'Брокколи — зелёный босс. Хрустит, уважаю.',
        'Может пахнуть странно, зато выглядит умно.',
        'Я не фанат, но уважаю. Это редкий союз.',
      ],
      salad: [
        'Салат — листья с амбициями. Лёгкий, живой, в плюс.',
        'Зелень + овощи — свежий движ, бро.',
        'Сегодня — салат. Завтра — что угодно. Живём.',
      ],
      bread: [
        'Хлеб — основа. Нормальный кусок — сытость без цирка.',
        'Свежий — кайф. Сухой — только в суп, бро.',
        'Кусок — уважение к жизни. Бабка одобрила бы.',
      ],
      cheese: [
        'Сыр — белок, кайф, уважение. Сырный движ.',
        'Плавленый — удобно. Настоящий — уважение.',
        'На бутерброд — норм. Ведром — уже кино.',
      ],
      chicken: [
        'Курица — белок без философии. Сытость, сила, без драмы.',
        'Птица в деле. Норм перекус, бро.',
        'Я не каннибал, я просто оцениваю меню. Норм выбор.',
      ],
      eggs: [
        'Яйца — завтрак чемпиона. Белок в скорлупе.',
        'Варёное — классика. Всмятку — эстет.',
        'Белок заряжен. Желток — тоже уважаю.',
      ],
      meat: [
        'Мясо — сытость, серьёзный подход. В деле, бро.',
        'Стейк звучит круто. Уважаю выбор.',
        'Сила есть — бегать легче. Норм порция — норм забег.',
      ],
      star: [
        'Звезда — не еда, но мотивация. Сияй, бро.',
        'Это знак: ты на правильном тапе. Продолжай.',
        'Блеск в глазах — ок. Блеск от звезды — тоже ок.',
      ],
    },
    byKind: {
      good: [
        '{name}, норм выбор. Кайф и движ.',
        'Свежий движ, {name}. Пару тапов — огонь.',
        '{name}, качаем пальцы и настроение.',
      ],
      junk: [
        '{name}, вкусно — да. Кайф — тоже.',
        'Хруст, сладкое, {name}. Классика.',
        '{name}, праздник для колобка. Уважаю.',
      ],
      drink: [
        '{name}, пить — must. Вода, сок, шипучка.',
        'Жажда ушла, {name}. Мозг включился.',
        '{name}, жидкость решает. Уважаю.',
      ],
    },
  },

  purchaseReview: {
    mostlyGood: [
      '{name}, закуп — огонь. Бабка бы спорила, я за.',
      'Магазин отработан, {name}. Без цирка.',
      '{name}, корзина уважения. Так и живём.',
      'Покупки в плюс, {name}. Сам бы взял.',
    ],
    mostlyJunk: [
      '{name}, корзина для души. Понимаю.',
      'Классика, {name}: пиво, сладкое. Пятница.',
      '{name}, кайф на максимум. Уважаю.',
      'Разнообразно, {name}. Распаковали — красава.',
    ],
    mixedGood: [
      '{name}, норм микс. Уважаю честность.',
      'В целом огонь, {name}. Как в жизни.',
      '{name}, корзина живая. Норм движ.',
    ],
    mixedBad: [
      '{name}, микс на любой вкус. Уважаю.',
      'Как в жизни, {name}: яблоко и пицца.',
      '{name}, вкусно, настроение в плюс.',
    ],
    balanced: [
      '{name}, средний чек — норм движ.',
      'Покупки как жизнь, {name}. Уважаю.',
      '{name}, честный микс. Ты в адеквате.',
    ],
  },
};

let phraseNameResolver = () => null;

/** Подключить из main после gameState.load() */
export function setPhraseNameResolver(fn) {
  phraseNameResolver = typeof fn === 'function' ? fn : () => null;
}

export function getPhrasePlayerName() {
  try {
    const n = phraseNameResolver();
    return n && String(n).trim() ? String(n).trim() : null;
  } catch {
    return null;
  }
}

export function formatPhrase(text, name = getPhrasePlayerName()) {
  if (!text) return '';
  const n = name && String(name).trim() ? String(name).trim() : null;
  if (!n) {
    return text
      .replace(/\{name\}[,!]?\s*/gi, '')
      .replace(/^[\s,]+/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return text.replace(/\{name\}/g, n);
}

export function pickRandom(list, exclude = '') {
  const pool = exclude ? list.filter((p) => p !== exclude) : list.slice();
  const source = pool.length ? pool : list;
  return source[Math.floor(Math.random() * source.length)];
}

function pickNamedFrom(list, exclude = '') {
  const name = getPhrasePlayerName();
  let pool = list;
  if (name) {
    const named = list.filter((p) => p.includes('{name}'));
    const prefer = CONFIG.phrases?.namedPoolPreferChance ?? 0.8;
    if (named.length && Math.random() < prefer) {
      pool = named;
    }
  }
  let raw = pickRandom(pool, exclude);
  const inject = CONFIG.phrases?.nameInjectChance ?? 0.45;
  if (name && !raw.includes('{name}') && Math.random() < inject) {
    raw = `{name}, ${raw.charAt(0).toLowerCase()}${raw.slice(1)}`;
  }
  return formatPhrase(raw, name);
}

export function getItemPhrase(itemId) {
  const list = phrases.items[itemId] || phrases.normal;
  return pickNamedFrom(list);
}

export function getFoodPhotoFeedPhrase(food) {
  if (!food) return pickNamedFrom(['{name}, норм. Зарядил.', 'Кайф, бро.']);
  const lecture = getFoodLecturePhrase(food);
  const templates = [
    `{name}, вижу ${food.emoji} ${food.name}. ${lecture}`,
    `${food.emoji} ${food.name}? ${lecture}`,
    `{name}, это ж ${food.name}. ${lecture}`,
    `О, ${food.name} ${food.emoji}. ${lecture}`,
    `{name}, сфоткал — уважаю. ${lecture}`,
  ];
  return pickNamedFrom(templates);
}

export function getFoodLecturePhrase(item) {
  const byId = phrases.foodLectures.byId[item.id];
  if (byId?.length) return pickNamedFrom(byId);
  const byKind = phrases.foodLectures.byKind[item.kind];
  if (byKind?.length) return pickNamedFrom(byKind);
  return pickNamedFrom(phrases.foodLectures.byKind.good);
}

phrases.nutritionTips = {
  apple: ['{name}, яблоко — хруст, кайф.'],
  cheese: ['{name}, сыр — кайф к чаю.'],
  beer: ['{name}, пиво. Классика пятницы.'],
  broccoli: ['{name}, брокколи хрустит. Уважаю.'],
  pizza: ['{name}, пицца — святое дело.'],
  water: ['{name}, вода — база. Уважение +100.'],
  banana: ['{name}, банан — быстрый перекус.'],
  chocolate: ['{name}, шоколад — дофамин в деле.'],
  coffee: ['{name}, кофе — бодрость.'],
  default: [
    '{name}, любой продукт — очки в копилку.',
    'Тап — норм, {name}. Свайп — ещё больше очков.',
    '{name}, красное тоже даёт очки. Не драма.',
  ],
};

export function getNutritionTipPhrase(food) {
  const id = food?.id;
  const list = phrases.nutritionTips[id] || phrases.nutritionTips.default;
  return pickNamedFrom(list);
}

const purchaseItemKind = {
  milk: 'good',
  bread: 'good',
  cheese: 'good',
  broccoli: 'good',
  apple: 'good',
  banana: 'good',
  eggs: 'good',
  meat: 'good',
  chicken: 'good',
  chocolate: 'junk',
  cola: 'junk',
  beer: 'junk',
  pizza: 'junk',
  icecream: 'junk',
  coffee: 'neutral',
};

function scorePurchaseCart(items) {
  let good = 0;
  let junk = 0;
  items.forEach((item) => {
    const kind = purchaseItemKind[item.id] || 'neutral';
    if (kind === 'good') good += 1;
    else if (kind === 'junk') junk += 1;
  });
  return { good, junk, total: items.length };
}

export function getPurchaseReviewPhrase(items) {
  const { good, junk, total } = scorePurchaseCart(items);
  const names = items.map((i) => `${i.emoji} ${i.name}`).join(', ');

  if (junk >= 3 || (junk >= 2 && good <= 1)) {
    const line = pickNamedFrom(phrases.purchaseReview.mostlyJunk);
    return `${line} В пакете: ${names}.`;
  }
  if (good >= 3 && junk === 0) {
    const line = pickNamedFrom(phrases.purchaseReview.mostlyGood);
    return `${line} Закуп: ${names}.`;
  }
  if (good > junk) {
    const line = pickNamedFrom(phrases.purchaseReview.mixedGood);
    return `${line} ${names}.`;
  }
  if (junk > good) {
    const line = pickNamedFrom(phrases.purchaseReview.mixedBad);
    return `${line} ${names}.`;
  }
  const line = pickNamedFrom(phrases.purchaseReview.balanced);
  return `${line} ${names}.`;
}

export function getPackagePhrase() {
  return pickNamedFrom(phrases.packageArrived);
}

export function getFinalPhrase() {
  return pickNamedFrom(phrases.final);
}

export function getComboPhrase(comboId) {
  const list = phrases.combos[comboId] || phrases.combos.default;
  return pickNamedFrom(list);
}

export function getBulkBoostPhrase() {
  return pickNamedFrom([
    '{name}, за раз зарядил всё. Уважаю чек.',
    'Пакет отработан. Все статы в плюс, {name}.',
    '{name}, оптом — мой стиль. Кайф.',
    'Чек приехал — я снова в форме, {name}.',
  ]);
}

phrases.unpackReaction = {
  healthy: [
    '{name}, закуп — огонь. Уважаю.',
    'Норм корзина, {name}. Бабка одобрила бы.',
  ],
  junk: [
    '{name}, корзина для души. Кайф макс.',
    'Чек как мем, {name}. Ё-моё.',
  ],
  mixed: [
    '{name}, закуп разнообразный. Уважаю.',
    'Микс, {name}: яблоко и пицца. Как в жизни.',
  ],
};

phrases.unpackFinal = [
  '{name}, здоровье подросло. Доволен.',
  'Статы подтянулись, {name}. Кайф.',
  '{name}, чек разобрали. Живём дальше.',
];

phrases.criticalWarn = {
  hunger: ['{name}, голодный. Покорми.', 'Бро, еды бы, {name}.'],
  thirst: ['{name}, воды бы. Срочно.', 'Пересох, {name}. Капни воды.'],
  health: ['{name}, расклеился. Полежу.', 'Энергия на нуле, {name}.'],
  mood: ['{name}, скучно. Развлеки.', 'Настроение в жопе, {name}. Тапни.'],
};

export function sumItemEffects(items) {
  const sum = { hunger: 0, thirst: 0, health: 0, mood: 0 };
  items.forEach((item) => {
    const fx = item.effects || {};
    Object.keys(sum).forEach((k) => {
      sum[k] += fx[k] || 0;
    });
  });
  return sum;
}

export function getUnpackReactionPhrase(items) {
  const ids = new Set(items.map((i) => i.id));
  const junk = ['pizza', 'chocolate', 'cola', 'beer', 'icecream'];
  const good = ['broccoli', 'apple', 'banana', 'eggs', 'milk'];
  const junkN = [...ids].filter((id) => junk.includes(id)).length;
  const goodN = [...ids].filter((id) => good.includes(id)).length;
  if (junkN >= 2) return pickNamedFrom(phrases.unpackReaction.junk);
  if (goodN >= 2) return pickNamedFrom(phrases.unpackReaction.healthy);
  return pickNamedFrom(phrases.unpackReaction.mixed);
}

/** Короткое intro на шаге 3 — детали по тапу на товар */
export function getUnpackReactionIntro(items) {
  if (!items?.length) return getUnpackReactionPhrase([]);
  const total = items.reduce((s, i) => s + (i.price || 0), 0);
  const mood = getUnpackReactionPhrase(items);
  const icons = items.map((i) => i.emoji).join(' ');
  const name = getPhrasePlayerName();
  const who = name ? `${name}, затарился` : 'Затарился';
  return `${who} на ${total}₽. ${mood} ${icons} — тапни по товару, скажу по делу.`;
}

export function getUnpackCartItemTapPhrase(item) {
  if (!item) return '';
  const tip = getNutritionTipPhrase(item);
  return `${item.emoji} ${item.name} · ${item.price}₽. ${tip}`;
}

export function getUnpackFinalPhrase() {
  return pickNamedFrom(phrases.unpackFinal);
}

export function getCriticalWarnPhrase(statKey) {
  const list = phrases.criticalWarn[statKey];
  return list ? pickNamedFrom(list) : pickNamedFrom(['{name}, статы на дне. Помоги.', 'Бро, статы на дне. Помоги.']);
}

export function getBossCatchPhrase(bossId) {
  const list = phrases.boss[bossId] || phrases.boss.village;
  return pickRandom(list);
}

export function getCantRunPhrase(stats) {
  if (stats.health <= 0) return pickNamedFrom(phrases.cantRun.health);
  if (stats.hunger <= 0) return pickNamedFrom(phrases.cantRun.hunger);
  if (stats.thirst <= 0) return pickNamedFrom(phrases.cantRun.thirst);
  if (stats.mood <= 0) return pickNamedFrom(phrases.cantRun.mood);
  return pickNamedFrom(phrases.cantRun.any);
}
