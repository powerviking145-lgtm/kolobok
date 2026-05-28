import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { getFoodPhotoFeedPhrase } from './phrases.js';
import { isGeminiFoodPhotoReady, recognizeFoodWithGemini } from './foodPhotoGemini.js';
import { vibrate } from './homeUi.js';

function cfg() {
  return CONFIG.foodPhoto ?? {};
}

function getFoodList() {
  return CONFIG.homeFoods?.list ?? [];
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickMockGuess() {
  const foods = getFoodList();
  if (!foods.length) return null;
  const good = foods.filter((f) => f.kind === 'good');
  const pool = good.length && Math.random() < 0.55 ? good : foods;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildPickOptions(answer) {
  const count = Math.max(2, cfg().pickCount ?? 3);
  const foods = getFoodList();
  const others = shuffle(foods.filter((f) => f.id !== answer.id)).slice(0, count - 1);
  return shuffle([answer, ...others]);
}

function getEffects(food) {
  const byKind = cfg().effectsByKind ?? {};
  return byKind[food.kind] ?? byKind.neutral ?? { hunger: 10, mood: 8 };
}

function isDrinkFood(food) {
  const drinkIds = new Set(CONFIG.feedLoop?.drinkFoodIds ?? []);
  return Boolean(food?.id && drinkIds.has(food.id));
}

async function recognizeFood(file) {
  if (isGeminiFoodPhotoReady()) {
    try {
      return await recognizeFoodWithGemini(file);
    } catch (err) {
      console.warn('Колобок: Gemini', err);
      if (cfg().fallbackToMock) {
        const food = pickMockGuess();
        if (!food) throw err;
        return {
          food,
          comment: '',
          confidence: 0,
          source: 'mock-fallback',
        };
      }
      throw err;
    }
  }

  if (cfg().fallbackToMock) {
    const food = pickMockGuess();
    if (!food) throw new Error('Нет еды в config');
    return { food, comment: '', confidence: 0, source: 'mock' };
  }

  throw new Error(
    'Нет ключа Gemini. Вставь apiKey в config.foodPhoto.gemini или secrets.local.js'
  );
}

function formatFeedError(message) {
  const msg = String(message || '');
  if (
    /Сервер Gemini перегружен|high_demand|high demand|UNAVAILABLE/i.test(msg) ||
    (msg.includes('503') && /demand|unavailable/i.test(msg))
  ) {
    return 'Сервер Gemini перегружен. Подожди 30–60 сек и сфоткай снова.';
  }
  if (
    msg.includes('429') ||
    /quota|rate limit|too many|resource_exhausted|Слишком много запросов к Gemini/i.test(
      msg
    )
  ) {
    return 'Слишком много запросов к Gemini. Подожди минуту и попробуй снова.';
  }
  if (/не разобрал ответ/i.test(msg)) {
    return 'Колобок не понял ответ нейросети. Сфоткай ещё раз — крупнее и ближе.';
  }
  if (msg.includes('gemini-timeout')) {
    return 'Долго отвечает. Попробуй ещё раз или другое фото.';
  }
  if (/fetch failed|Failed to fetch|ECONNRESET|сеть/i.test(msg)) {
    return 'Нет связи с Google. Попробуй ещё раз через минуту или другой интернет/VPN.';
  }
  if (/location is not supported|из твоего региона|прокси firebase/i.test(msg)) {
    return 'Gemini недоступен из твоего региона. Нужен прокси Firebase — один раз задеплой функцию (FOOD_PHOTO.md).';
  }
  if (/прокси gemini|GEMINI_API_KEY/i.test(msg)) {
    return 'Сервер Kolobok ещё не настроен. Владельцу: задеплой geminiFoodPhoto + секрет GEMINI_API_KEY.';
  }
  if (/ограничением «сайты»|HTTP_REFERRER/i.test(msg)) {
    return 'Ключ Gemini с ограничением «только сайты». В Google Cloud → Credentials → ключ → Application restrictions: None. Или новый ключ в AI Studio.';
  }
  if (/Generative Language API|биллинга на проекте/i.test(msg)) {
    return 'Включи Generative Language API и биллинг на проекте kolobok-6032e (Google Cloud Console → APIs).';
  }
  if (/API key expired|просрочен или отозван/i.test(msg)) {
    return 'Ключ Gemini просрочен/удалён в AI Studio. Создай новый ключ → secrets:set GEMINI_API_KEY → curl до ответа с models.';
  }
  if (/API_KEY_INVALID|api key not valid|ключ на сервере/i.test(msg)) {
    return 'Ключ Gemini на сервере неверный. Cloud Shell: firebase functions:secrets:set GEMINI_API_KEY --project kolobok-6032e → Y';
  }
  if (/has not been used in project|api_key_service_blocked/i.test(msg)) {
    return 'Gemini API выключен для этого ключа. Нужен ключ с aistudio.google.com/apikey (проект с оплатой).';
  }
  if (/CONSUMER_SUSPENDED|has been suspended/i.test(msg)) {
    return 'Этот ключ Gemini отключён Google (suspended). AI Studio: удали ключ → Create API key → Firebase secrets:set GEMINI_API_KEY → Y. В git не клади.';
  }
  if (/leaked|заблокирован|reported as leaked/i.test(msg)) {
    return 'Ключ Gemini заблокирован Google. Новый ключ только в Firebase: secrets:set GEMINI_API_KEY → Y. В git не клади.';
  }
  if (/Модель недоступна|GEMINI_ALL_MODELS|не ответил/i.test(msg)) {
    return 'Gemini не смог обработать фото. Попробуй другое фото или новый API key в AI Studio.';
  }
  if (/Прокси Gemini 403|Прокси Gemini 400/i.test(msg)) {
    return 'Сервер отклонил ключ (403). Создай ключ в AI Studio без ограничений → secrets:set GEMINI_API_KEY. Проверка: FOOD_PHOTO.md § «Проверка ключа».';
  }
  return msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
}

export function createFoodPhotoFeed({ callbacks = {} } = {}) {
  const modal = document.getElementById('food-photo-modal');
  const previewImg = document.getElementById('food-photo-preview-img');
  const choicesEl = document.getElementById('food-photo-choices');
  const resultEmoji = document.getElementById('food-photo-result-emoji');
  const resultName = document.getElementById('food-photo-result-name');
  const resultPhrase = document.getElementById('food-photo-result-phrase');
  const resultCoach = document.getElementById('food-photo-result-coach');
  const errorText = document.getElementById('food-photo-error-text');

  let active = false;
  let previewUrl = null;
  let pendingFeedBoost = null;
  let pendingFood = null;

  function isOpen() {
    return active && modal?.classList.contains('is-open');
  }

  function showState(name) {
    if (!modal) return;
    modal.querySelectorAll('[data-food-photo-state]').forEach((el) => {
      el.hidden = el.getAttribute('data-food-photo-state') !== name;
    });
    const title = modal.querySelector('#food-photo-title');
    const titles = cfg();
    if (!title) return;
    if (name === 'pick') title.textContent = titles.titlePick ?? 'Сфоткай еду';
    if (name === 'loading') title.textContent = titles.titleAnalyze ?? 'Смотрю…';
    if (name === 'confirm') title.textContent = titles.titleConfirm ?? 'Что на фото?';
    if (name === 'result') title.textContent = titles.titleResult ?? 'Зашло!';
    if (name === 'error') title.textContent = titles.titleError ?? 'Не вышло';
  }

  function setOpen(open) {
    if (!modal) return;
    active = open;
    modal.hidden = !open;
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    modal.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('is-food-photo-active', open);
    if (open) {
      uiFooterHide();
      callbacks.onStart?.();
    } else {
      uiFooterShow();
      revokePreview();
    }
  }

  function uiFooterHide() {
    document.getElementById('footer-buttons')?.classList.add('is-hidden');
  }

  function uiFooterShow() {
    document.getElementById('footer-buttons')?.classList.remove('is-hidden');
  }

  function revokePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    if (previewImg) {
      previewImg.removeAttribute('src');
      previewImg.hidden = true;
    }
    if (choicesEl) choicesEl.replaceChildren();
  }

  function close() {
    if (!active) {
      document.documentElement.classList.remove('is-food-photo-active');
      document.getElementById('footer-buttons')?.classList.remove('is-hidden');
      return;
    }
    pendingFeedBoost = null;
    pendingFood = null;
    setOpen(false);
    callbacks.onClose?.();
  }

  function showError(message) {
    if (errorText) errorText.textContent = formatFeedError(message);
    showState('error');
  }

  function renderChoices(options, onPick) {
    if (!choicesEl) return;
    choicesEl.replaceChildren();
    options.forEach((food) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'food-photo-choice btn btn--secondary';
      btn.textContent = `${food.emoji} ${food.name}`;
      btn.addEventListener('click', () => onPick(food));
      choicesEl.appendChild(btn);
    });
  }

  function applyFeed(food) {
    const fillPct = cfg().fillPrimaryStatPercent ?? 80;
    const drink = isDrinkFood(food);
    const primaryKey = drink ? 'thirst' : 'hunger';

    const before = {};
    const boosts = {};

    before[primaryKey] = gameState.getStatDisplayPercent(primaryKey);
    gameState.raiseStatToDisplayPercent(primaryKey, fillPct);
    const primaryAfter = gameState.getStatDisplayPercent(primaryKey);
    const primaryGain = primaryAfter - before[primaryKey];
    if (primaryGain > 0) boosts[primaryKey] = primaryGain;

    before.health = gameState.getStatDisplayPercent('health');
    before.mood = gameState.getStatDisplayPercent('mood');
    gameState.syncDerivedFromPrimary({ immediate: true });
    const healthAfter = gameState.getStatDisplayPercent('health');
    const moodAfter = gameState.getStatDisplayPercent('mood');
    if (healthAfter > before.health) boosts.health = healthAfter - before.health;
    if (moodAfter > before.mood) boosts.mood = moodAfter - before.mood;

    const pts = cfg().tapScorePoints ?? 2;
    if (pts) gameState.addTapScore(pts);
    gameState.recordPhotoFeed?.(food);
    gameState.recordFoodInteraction?.();

    gameState.save();
    const highlightKeys = Object.entries(boosts)
      .filter(([, val]) => Number(val) > 0)
      .map(([key]) => key);
    pendingFeedBoost = { before, boosts, food, highlightKeys };
  }

  function pickOne(list) {
    if (!Array.isArray(list) || !list.length) return '';
    return list[Math.floor(Math.random() * list.length)] ?? '';
  }

  function getNutritionCoachLine(food) {
    const coach = cfg().nutritionCoach ?? {};
    const factsById = coach.factsById ?? {};
    const factsByKind = coach.factsByKind ?? {};
    const fallbackFacts = coach.fallbackFacts ?? [];
    const advice = coach.advice ?? {};
    const status = gameState.getDailyFeedStatus?.() ?? {
      foodToday: 0,
      drinkToday: 0,
      totalToday: 0,
    };
    const pattern = gameState.getNutritionPattern?.(7) ?? {};

    const fact =
      pickOne(factsById[food?.id]) ||
      pickOne(factsByKind[food?.kind]) ||
      pickOne(fallbackFacts) ||
      'Баланс еды и воды работает лучше любых крайностей.';

    let adviceLine = '';
    if (pattern.hasWaterGap) adviceLine = pickOne(advice.patternWaterGap);
    else if (pattern.hasBadOveruse) adviceLine = pickOne(advice.patternBadOveruse);
    else if (pattern.hasLowDiversity) adviceLine = pickOne(advice.patternLowDiversity);
    else if ((status.drinkToday ?? 0) === 0) adviceLine = pickOne(advice.noDrinkYet);
    else if ((status.foodToday ?? 0) === 0) adviceLine = pickOne(advice.noFoodYet);
    else if (food?.kind === 'bad') adviceLine = pickOne(advice.badKind);
    else if (food?.kind === 'good') adviceLine = pickOne(advice.goodKind);
    if (!adviceLine) adviceLine = pickOne(advice.default);

    const patternLine = (() => {
      const scanCount = Math.max(0, Math.floor(pattern.scanCount ?? 0));
      if (scanCount < 3) return '';
      if (pattern.hasBadOveruse) {
        const badPct = Math.round((pattern.badShare ?? 0) * 100);
        return `📊 Паттерн: ${badPct}% сканов — сладкое/фаст за ${pattern.windowDays ?? 7} дн.`;
      }
      if (pattern.hasWaterGap) {
        return `📊 Паттерн: за ${pattern.windowDays ?? 7} дн. почти нет напитков в сканах.`;
      }
      if (pattern.hasLowDiversity) {
        return `📊 Паттерн: низкое разнообразие рациона за ${pattern.windowDays ?? 7} дн.`;
      }
      const drinkPct = Math.round((pattern.drinkShare ?? 0) * 100);
      if (drinkPct > 0 && drinkPct < 20) {
        return `📊 Паттерн: напитки — только ${drinkPct}% сканов за ${pattern.windowDays ?? 7} дн.`;
      }
      return '';
    })();

    return patternLine
      ? `🧠 Факт: ${fact}\n💡 ${adviceLine}\n${patternLine}`
      : `🧠 Факт: ${fact}\n💡 ${adviceLine}`;
  }

  function showResult(food, { customComment } = {}) {
    const phrase =
      customComment?.trim() || getFoodPhotoFeedPhrase(food);
    if (resultEmoji) resultEmoji.textContent = food.emoji;
    if (resultName) resultName.textContent = food.name;
    if (resultPhrase) resultPhrase.textContent = phrase;
    if (resultCoach) resultCoach.textContent = getNutritionCoachLine(food);
    callbacks.onPhrase?.(phrase);
    showState('result');
    pendingFood = food;
    kolobokEat();
  }

  function kolobokEat() {
    const kolobok = document.getElementById('kolobok');
    if (!kolobok) return;
    kolobok.classList.add('is-eating');
    window.setTimeout(() => {
      kolobok.classList.remove('is-eating');
    }, CONFIG.homeFoods?.eatAnimMs ?? 300);
  }

  async function runAnalyze(file) {
    if (previewImg) {
      revokePreview();
      previewUrl = URL.createObjectURL(file);
      previewImg.src = previewUrl;
      previewImg.hidden = false;
    }
    showState('loading');

    const result = await recognizeFood(file);
    const skipConfirm =
      result.confidence >=
      (cfg().gemini?.skipConfirmMinConfidence ?? 0.82);

    if (skipConfirm) {
      showResult(result.food, { customComment: result.comment });
      return;
    }

    const options = buildPickOptions(result.food);
    renderChoices(options, (picked) => {
      showResult(picked, {
        customComment: picked.id === result.food.id ? result.comment : '',
      });
    });
    showState('confirm');
  }

  async function onFileSelected(file) {
    if (!file || !active) return;
    try {
      await runAnalyze(file);
    } catch (err) {
      console.warn('foodPhoto', err);
      showError(err?.message ?? 'Не вышло');
      callbacks.onError?.(err?.message);
    }
  }

  function open() {
    if (active) return;
    setOpen(true);
    if (!isGeminiFoodPhotoReady() && !cfg().fallbackToMock) {
      showError(
        'Нужен Gemini: proxyUrl (Firebase) или ключ в secrets.local.js — FOOD_PHOTO.md'
      );
      return;
    }
    showState('pick');
  }

  function bind() {
    if (!modal) return;

    const closeBtn = modal.querySelector('#food-photo-close');
    const backdrop = modal.querySelector('#food-photo-backdrop');
    const btnDone = modal.querySelector('#food-photo-done');
    const btnErrorClose = modal.querySelector('#food-photo-error-close');
    const cameraBtn = modal.querySelector('#food-photo-camera-btn');
    const galleryBtn = modal.querySelector('#food-photo-gallery-btn');
    const fileInput = modal.querySelector('#food-photo-file');

    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    if (btnDone && cfg().feedButtonLabel) {
      btnDone.textContent = cfg().feedButtonLabel;
    }

    btnDone?.addEventListener('click', () => {
      vibrate(CONFIG.ui?.hapticFeedConfirm ?? [16, 18, 22]);
      if (pendingFood) {
        applyFeed(pendingFood);
      }
      const boost = pendingFeedBoost;
      pendingFeedBoost = null;
      pendingFood = null;
      close();
      callbacks.onComplete?.(boost);
    });
    btnErrorClose?.addEventListener('click', close);

    function openPicker({ capture } = {}) {
      if (!fileInput) return;
      if (capture) fileInput.setAttribute('capture', capture);
      else fileInput.removeAttribute('capture');
      fileInput.click();
    }

    cameraBtn?.addEventListener('click', () => openPicker({ capture: 'environment' }));
    galleryBtn?.addEventListener('click', () => openPicker());

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) onFileSelected(file);
    });
  }

  bind();

  return {
    open,
    close,
    isActive: isOpen,
  };
}
