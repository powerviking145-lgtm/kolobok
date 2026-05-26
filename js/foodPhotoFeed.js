import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { getFoodPhotoFeedPhrase } from './phrases.js';
import { isGeminiFoodPhotoReady, recognizeFoodWithGemini } from './foodPhotoGemini.js';

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
    msg.includes('429') ||
    /quota|rate limit|too many|resource_exhausted|Слишком много запросов к Gemini/i.test(
      msg
    )
  ) {
    return 'Слишком много запросов к Gemini. Подожди минуту. Если оплатил — проверь, что в игре тот же API key, что в AI Studio после оплаты (при сомнении создай новый ключ).';
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
  if (/API_KEY_INVALID|api key not valid|ключ на сервере/i.test(msg)) {
    return 'Ключ Gemini на сервере неверный. Cloud Shell: firebase functions:secrets:set GEMINI_API_KEY (ключ из AI Studio), потом firebase deploy --only functions:geminiFoodPhoto';
  }
  if (/has not been used in project|api_key_service_blocked/i.test(msg)) {
    return 'Gemini API выключен для этого ключа. Нужен ключ с aistudio.google.com/apikey (проект с оплатой).';
  }
  if (/leaked|заблокирован|reported as leaked/i.test(msg)) {
    return 'Ключ Gemini заблокирован Google. Новый ключ только в Firebase: Cloud Shell → firebase functions:secrets:set GEMINI_API_KEY → Y. В git и npm build ключ не клади.';
  }
  if (/Модель недоступна|GEMINI_ALL_MODELS|не ответил/i.test(msg)) {
    return 'Gemini не смог обработать фото. Нужен новый API key (старый мог заблокироваться) — aistudio.google.com/apikey';
  }
  if (msg.includes('403')) {
    return 'Ключ Gemini не принят. Новый: aistudio.google.com/apikey → Firebase secrets:set GEMINI_API_KEY (см. FOOD_PHOTO.md)';
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
  const errorText = document.getElementById('food-photo-error-text');

  let active = false;
  let previewUrl = null;

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
    if (!active) return;
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
    const effects = getEffects(food);
    Object.entries(effects).forEach(([key, val]) => {
      if (val) gameState.changeStat(key, val);
    });
    const moodBonus = cfg().moodBonus ?? 2;
    if (moodBonus) gameState.changeStat('mood', moodBonus);
    const pts = cfg().tapScorePoints ?? 2;
    if (pts) gameState.addTapScore(pts);
    gameState.recordFoodInteraction?.();
    gameState.save();
    callbacks.onStatsApplied?.();
  }

  function showResult(food, { customComment } = {}) {
    const phrase =
      customComment?.trim() || getFoodPhotoFeedPhrase(food);
    if (resultEmoji) resultEmoji.textContent = food.emoji;
    if (resultName) resultName.textContent = food.name;
    if (resultPhrase) resultPhrase.textContent = phrase;
    callbacks.onPhrase?.(phrase);
    showState('result');
    applyFeed(food);
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
    btnDone?.addEventListener('click', () => {
      close();
      callbacks.onComplete?.();
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
