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

function getFoodById(foodId) {
  if (!foodId) return null;
  return getFoodList().find((f) => f.id === foodId) ?? null;
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
  return byKind[food.kind] ?? byKind.neutral ?? { hunger: 10, agility: 8 };
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
  const confirmHint = document.getElementById('food-photo-confirm-hint');
  const errorText = document.getElementById('food-photo-error-text');

  let active = false;
  let previewUrl = null;
  let pendingFeedBoost = null;
  let pendingFood = null;
  let pendingTutorialFeed = false;
  let tutorialDemoMode = false;
  let currentState = 'pick';

  function isOpen() {
    return active && modal?.classList.contains('is-open');
  }

  function canDismissModal() {
    return currentState === 'pick' || currentState === 'manual' || currentState === 'error';
  }

  function syncCloseChrome() {
    const closeBtn = modal?.querySelector('#food-photo-close');
    if (!closeBtn) return;
    const show = canDismissModal();
    closeBtn.hidden = !show;
    closeBtn.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function showState(name) {
    if (!modal) return;
    currentState = name;
    modal.querySelectorAll('[data-food-photo-state]').forEach((el) => {
      el.hidden = el.getAttribute('data-food-photo-state') !== name;
    });
    const title = modal.querySelector('#food-photo-title');
    const titles = cfg();
    if (title) {
      if (name === 'pick') title.textContent = titles.titlePick ?? 'Покорми колобка';
      if (name === 'manual') title.textContent = titles.titleManual ?? 'Что ты ешь?';
      if (name === 'loading') title.textContent = titles.titleAnalyze ?? 'Смотрю…';
      if (name === 'confirm') title.textContent = titles.titleConfirm ?? 'Что на фото?';
      if (name === 'result') title.textContent = titles.titleResult ?? 'Зашло!';
      if (name === 'error') title.textContent = titles.titleError ?? 'Не вышло';
    }
    const card = modal?.querySelector('.food-photo-card');
    if (card) {
      card.classList.toggle('food-photo-card--result', name === 'result');
      card.classList.toggle('food-photo-card--scroll', name === 'manual' || name === 'confirm');
    }
    syncCloseChrome();
  }

  function syncPickChrome() {
    const pickIntroEl = document.getElementById('food-photo-pick-intro');
    if (pickIntroEl) pickIntroEl.textContent = cfg().pickIntro ?? '';
    const manualBtn = modal?.querySelector('#food-photo-manual-btn');
    const cameraBtn = modal?.querySelector('#food-photo-camera-btn');
    const galleryBtn = modal?.querySelector('#food-photo-gallery-btn');
    if (manualBtn && cfg().buttonManual) manualBtn.textContent = cfg().buttonManual;
    if (cameraBtn && cfg().buttonCamera) cameraBtn.textContent = cfg().buttonCamera;
    if (galleryBtn && cfg().buttonGallery) galleryBtn.textContent = cfg().buttonGallery;
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

  function forceClose() {
    tutorialDemoMode = false;
    pendingTutorialFeed = false;
    pendingFeedBoost = null;
    pendingFood = null;
    active = false;
    revokePreview();
    if (modal) {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('is-open');
    }
    document.documentElement.classList.remove('is-food-photo-active');
    uiFooterShow();
  }

  function close() {
    if (!canDismissModal()) return;
    const wasActive = active;
    forceClose();
    if (wasActive) callbacks.onClose?.();
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
      btn.className = 'food-photo-choice btn btn--primary tutorial-card__next';
      btn.textContent = `${food.emoji} ${food.name}`;
      btn.addEventListener('click', () => onPick(food));
      choicesEl.appendChild(btn);
    });
  }

  function renderManualPick() {
    const listEl = document.getElementById('food-photo-manual-list');
    if (!listEl) return;
    listEl.replaceChildren();
    getFoodList().forEach((food) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'food-photo-manual-item btn btn--secondary';
      btn.textContent = `${food.emoji} ${food.name}`;
      btn.addEventListener('click', () => showResult(food));
      listEl.appendChild(btn);
    });
  }

  function showManualPick() {
    const hintEl = document.getElementById('food-photo-manual-hint');
    if (hintEl) {
      hintEl.textContent =
        cfg().manualHint ?? 'Тапни продукт — накормлю и выдам факт по делу.';
    }
    renderManualPick();
    showState('manual');
  }

  function requireGeminiForPhoto() {
    if (isGeminiFoodPhotoReady() || cfg().fallbackToMock) return true;
    showError(
      'Фото нужен Gemini: proxyUrl (Firebase) или ключ в secrets.local.js — FOOD_PHOTO.md. Или жми «Ничего под рукой — скажу, что ем».'
    );
    return false;
  }

  function applyFeed(food, { tutorialFeed = false } = {}) {
    const fillPct = cfg().fillPrimaryStatPercent ?? 80;
    const drink = isDrinkFood(food);
    const primaryKey = drink ? 'thirst' : 'hunger';

    const before = {};
    const boosts = {};

    if (tutorialFeed) {
      ['hunger', 'thirst'].forEach((key) => {
        before[key] = gameState.getStatDisplayPercent(key);
        gameState.raiseStatToDisplayPercent(key, 100);
        const after = gameState.getStatDisplayPercent(key);
        const gain = after - before[key];
        if (gain > 0) boosts[key] = gain;
      });
    } else {
      before[primaryKey] = gameState.getStatDisplayPercent(primaryKey);
      gameState.raiseStatToDisplayPercent(primaryKey, fillPct);
      const primaryAfter = gameState.getStatDisplayPercent(primaryKey);
      const primaryGain = primaryAfter - before[primaryKey];
      if (primaryGain > 0) boosts[primaryKey] = primaryGain;
    }

    before.strength = gameState.getStatDisplayPercent('strength');
    before.agility = gameState.getStatDisplayPercent('agility');
    gameState.syncDerivedFromPrimary({ immediate: true });
    const strengthAfter = gameState.getStatDisplayPercent('strength');
    const agilityAfter = gameState.getStatDisplayPercent('agility');
    if (strengthAfter > before.strength) boosts.strength = strengthAfter - before.strength;
    if (agilityAfter > before.agility) boosts.agility = agilityAfter - before.agility;

    const pts = cfg().tapScorePoints ?? 2;
    if (pts) gameState.addTapScore(pts);
    gameState.recordPhotoFeed?.(food);
    gameState.recordFoodInteraction?.();
    gameState.incrementDailyMission?.('feed_any', 1);
    gameState.incrementDailyMission?.(drink ? 'feed_drink' : 'feed_food', 1);

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

  function truncateLine(text, max = 72) {
    const s = String(text ?? '').trim();
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1)}…`;
  }

  function getNutritionCoachLine(food, { compact = false } = {}) {
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
      if (compact) return '';
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

  function showResult(food, { customComment, tutorialBonus = false } = {}) {
    pendingTutorialFeed = !!tutorialBonus;
    if (previewImg) previewImg.hidden = true;

    if (resultEmoji) resultEmoji.textContent = food.emoji;
    if (resultName) resultName.textContent = food.name;

    const coachLine = getNutritionCoachLine(food, { compact: true });
    const phraseRaw = customComment?.trim() || '';
    const badge =
      tutorialBonus && !phraseRaw ? (CONFIG.tutorial?.tutorialBonusBadge ?? '') : '';
    const coachText = [badge, coachLine].filter(Boolean).join('\n');
    if (resultPhrase) {
      if (phraseRaw) {
        resultPhrase.textContent = truncateLine(phraseRaw);
        resultPhrase.hidden = false;
      } else {
        resultPhrase.textContent = '';
        resultPhrase.hidden = true;
      }
    }
    if (resultCoach) {
      resultCoach.textContent = coachText;
      resultCoach.hidden = !coachText;
    }

    const phrase = phraseRaw || getFoodPhotoFeedPhrase(food);
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
    if (confirmHint) {
      const hintText =
        cfg().confirmLowConfidenceHint ??
        cfg().pickHint ??
        'Выбери вариант ниже';
      confirmHint.textContent = hintText;
      confirmHint.hidden = !hintText;
    }
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
    syncPickChrome();
    showState('pick');
    if (confirmHint && cfg().pickHint) {
      confirmHint.textContent = cfg().pickHint;
    }
  }

  function showTutorialConfirmDemo() {
    const answer =
      getFoodById('fish') ??
      getFoodById('water') ??
      getFoodList().find((f) => f.kind === 'good') ??
      getFoodList()[0];
    if (!answer) {
      showError('Нет еды в конфиге для туториала');
      return;
    }
    tutorialDemoMode = true;
    pendingFood = null;
    pendingFeedBoost = null;
    if (!active) setOpen(true);
    if (previewImg) {
      previewImg.src = 'assets/tutorial/food-fish-example.png';
      previewImg.hidden = false;
    }
    if (confirmHint) {
      confirmHint.textContent =
        cfg().confirmLowConfidenceHint ??
        cfg().pickHint ??
        'Колобок почти уверен — поправь, если промахнулся.';
    }
    renderChoices(buildPickOptions(answer), () => {});
    showState('confirm');
  }

  function openTutorialPreset({
    foodId = 'water',
    customComment = 'Я уже нашел тебе воду на первый раз. Но дальше фоткаешь сам, бро.',
  } = {}) {
    tutorialDemoMode = false;
    pendingTutorialFeed = true;
    if (!active) setOpen(true);
    const fallback = getFoodList().find((f) => isDrinkFood(f)) ?? getFoodList()[0] ?? null;
    const food = getFoodById(foodId) ?? fallback;
    if (!food) {
      showError('Нет еды в конфиге для туториала');
      return;
    }
    showResult(food, { customComment, tutorialBonus: true });
  }

  function bind() {
    if (!modal) return;

    const closeBtn = modal.querySelector('#food-photo-close');
    const backdrop = modal.querySelector('#food-photo-backdrop');
    const btnDone = modal.querySelector('#food-photo-done');
    const btnErrorClose = modal.querySelector('#food-photo-error-close');
    const cameraBtn = modal.querySelector('#food-photo-camera-btn');
    const galleryBtn = modal.querySelector('#food-photo-gallery-btn');
    const manualBtn = modal.querySelector('#food-photo-manual-btn');
    const manualBackBtn = modal.querySelector('#food-photo-manual-back');
    const fileInput = modal.querySelector('#food-photo-file');

    closeBtn?.addEventListener('click', close);
    if (btnDone && cfg().feedButtonLabel) {
      btnDone.textContent = cfg().feedButtonLabel;
    }

    btnDone?.addEventListener('click', () => {
      if (tutorialDemoMode) return;
      vibrate(CONFIG.ui?.hapticFeedConfirm ?? [16, 18, 22]);
      if (pendingFood) {
        applyFeed(pendingFood, { tutorialFeed: pendingTutorialFeed });
        pendingTutorialFeed = false;
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

    manualBtn?.addEventListener('click', showManualPick);
    manualBackBtn?.addEventListener('click', () => showState('pick'));

    cameraBtn?.addEventListener('click', () => {
      if (!requireGeminiForPhoto()) return;
      openPicker({ capture: 'environment' });
    });
    galleryBtn?.addEventListener('click', () => {
      if (!requireGeminiForPhoto()) return;
      openPicker();
    });

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) onFileSelected(file);
    });

    fileInput?.addEventListener('cancel', () => {
      if (active) showState('pick');
    });
  }

  bind();

  return {
    open,
    openTutorialPreset,
    showTutorialConfirmDemo,
    close,
    forceClose,
    isActive: isOpen,
  };
}
