import { CONFIG } from './config.js';
import { positionSpeechBubble } from './speechPosition.js';

const STAT_LABELS = {
  hunger: 'Сытость',
  thirst: 'Жажда',
  health: 'Здоровье',
  mood: 'Настроение',
};

const STAT_ICONS = {
  hunger: '🍗',
  thirst: '💧',
  health: '❤️',
  mood: '😎',
};

const STAT_ORDER = ['hunger', 'thirst', 'health', 'mood'];

export function createReplySystem({ elements, getHighlightButton }) {
  const {
    idleBubble,
    nutritionTip,
    nutritionText,
    nutritionOk,
    nutritionSkip,
    actionPrompt,
    actionPromptText,
    floatingReactions,
    stage,
    speechDock,
    kolobokEl,
  } = elements;

  const cfg = CONFIG.replies;
  let idleTimerId = null;
  let nutritionResolve = null;
  let nutritionDismissTimerId = null;
  let nutritionTapHandler = null;
  let actionPromptTarget = null;

  function clearIdleTimer() {
    if (idleTimerId) {
      window.clearTimeout(idleTimerId);
      idleTimerId = null;
    }
  }

  function hideIdle() {
    clearIdleTimer();
    idleBubble?.classList.remove('is-visible', 'is-updating');
    idleBubble?.classList.add('is-hidden');
    document.documentElement.classList.remove('is-lecture-active');
  }

  function clearNutritionDismissTimer() {
    if (nutritionDismissTimerId) {
      window.clearTimeout(nutritionDismissTimerId);
      nutritionDismissTimerId = null;
    }
  }

  function unbindNutritionTapDismiss() {
    if (nutritionTapHandler) {
      document.removeEventListener('pointerdown', nutritionTapHandler, true);
      nutritionTapHandler = null;
    }
    clearNutritionDismissTimer();
  }

  function finishNutrition(result = 'ok') {
    unbindNutritionTapDismiss();
    if (!nutritionTip) {
      const resolve = nutritionResolve;
      nutritionResolve = null;
      resolve?.(result);
      return;
    }
    if (!nutritionTip.classList.contains('is-visible')) {
      nutritionTip.setAttribute('hidden', '');
      nutritionTip.setAttribute('aria-hidden', 'true');
      const resolve = nutritionResolve;
      nutritionResolve = null;
      resolve?.(result);
      return;
    }
    nutritionTip.classList.remove('is-visible');
    nutritionTip.classList.add('is-closing');
    window.setTimeout(() => {
      nutritionTip.classList.remove('is-closing');
      nutritionTip.setAttribute('hidden', '');
      nutritionTip.setAttribute('aria-hidden', 'true');
      const resolve = nutritionResolve;
      nutritionResolve = null;
      resolve?.(result);
    }, 200);
  }

  function scheduleNutritionDismissOnTap() {
    clearNutritionDismissTimer();
    const ms = cfg.nutritionDismissOnTapMs ?? 1500;
    nutritionDismissTimerId = window.setTimeout(() => finishNutrition('ok'), ms);
  }

  function bindNutritionTapDismiss() {
    unbindNutritionTapDismiss();
    nutritionTapHandler = (e) => {
      if (!nutritionTip?.classList.contains('is-visible')) return;
      if (e.target.closest('#nutrition-tip')) return;
      if (e.target.closest('#btn-receipt, #btn-run')) {
        finishNutrition('ok');
        return;
      }
      if (e.target.closest('.stage-hero, .kolobok-stage, #kolobok, #home-spawns')) {
        finishNutrition('ok');
        return;
      }
      scheduleNutritionDismissOnTap();
    };
    document.addEventListener('pointerdown', nutritionTapHandler, true);
  }

  function hideNutrition() {
    if (nutritionTip?.classList.contains('is-visible')) {
      finishNutrition('dismiss');
      return;
    }
    unbindNutritionTapDismiss();
    const resolve = nutritionResolve;
    nutritionResolve = null;
    nutritionTip?.classList.remove('is-visible', 'is-closing');
    nutritionTip?.setAttribute('hidden', '');
    nutritionTip?.setAttribute('aria-hidden', 'true');
    resolve?.('dismiss');
  }

  function hideActionPrompt({ clearHighlight = true } = {}) {
    actionPrompt?.setAttribute('hidden', '');
    actionPrompt?.setAttribute('aria-hidden', 'true');
    actionPrompt?.classList.remove('is-visible');
    if (clearHighlight && actionPromptTarget) {
      actionPromptTarget.classList.remove('btn--action-highlight');
      actionPromptTarget = null;
    }
  }

  function hideAll() {
    hideIdle();
    hideNutrition();
    hideActionPrompt();
    document.documentElement.classList.remove('is-lecture-active');
  }

  function showIdle(text, { animate = true, autoHide = true, hideMs: hideMsOverride } = {}) {
    if (!idleBubble) return;
    hideNutrition();
    document.documentElement.classList.add('is-lecture-active');

    const long = text.length > (cfg.idleLongChars ?? 50);
    idleBubble.textContent = text;
    idleBubble.classList.toggle('is-long', long);
    idleBubble.classList.remove('is-hidden');
    idleBubble.classList.add('is-visible');

    if (animate) {
      idleBubble.classList.remove('is-updating');
      void idleBubble.offsetWidth;
      idleBubble.classList.add('is-updating');
    }

    clearIdleTimer();
    const hideMs = autoHide
      ? (hideMsOverride ?? cfg.idleHideMs ?? CONFIG.ui?.speechHideIdleMs ?? 4000)
      : 0;
    if (hideMs > 0) {
      idleTimerId = window.setTimeout(hideIdle, hideMs);
    }

    if (speechDock && kolobokEl && stage) {
      requestAnimationFrame(() => {
        positionSpeechBubble({ bubble: idleBubble, dock: speechDock, kolobokEl, stageEl: stage });
        requestAnimationFrame(() => {
          positionSpeechBubble({ bubble: idleBubble, dock: speechDock, kolobokEl, stageEl: stage });
        });
      });
    }
  }

  function showNutrition(text, { title } = {}) {
    return new Promise((resolve) => {
      if (!nutritionTip || !nutritionText) {
        resolve('skip');
        return;
      }
      hideIdle();
      hideActionPrompt();
      nutritionResolve = resolve;
      nutritionText.textContent = text;
      const label = nutritionTip.querySelector('.nutrition-tip__label');
      if (label && title) label.textContent = title;
      nutritionTip.removeAttribute('hidden');
      nutritionTip.setAttribute('aria-hidden', 'false');
      nutritionTip.classList.remove('is-closing');
      void nutritionTip.offsetWidth;
      nutritionTip.classList.add('is-visible');
      bindNutritionTapDismiss();
    });
  }

  function showActionPrompt(text, buttonKey = 'run') {
    hideNutrition();
    hideActionPrompt({ clearHighlight: false });
    const btn = getHighlightButton?.(buttonKey);
    if (actionPromptTarget) {
      actionPromptTarget.classList.remove('btn--action-highlight');
    }
    actionPromptTarget = btn || null;
    actionPromptTarget?.classList.add('btn--action-highlight');
    showIdle(text, { animate: true, autoHide: false });
  }

  function showFloatingReactions(clientX, clientY, effects) {
    if (!floatingReactions || !stage) return;

    const rows = STAT_ORDER.map((key) => [key, effects[key]])
      .filter(([, delta]) => delta);
    if (!rows.length) return;

    const rect = stage.getBoundingClientRect();
    const baseX = clientX - rect.left;
    const baseY = clientY - rect.top;

    rows.forEach(([key, delta], i) => {
      const el = document.createElement('span');
      el.className = `stat-float ${delta > 0 ? 'is-pos' : 'is-neg'}`;
      const sign = delta > 0 ? '+' : '';
      el.textContent = `${sign}${delta}`;
      el.style.left = `${baseX}px`;
      el.style.top = `${baseY + i * 4}px`;
      floatingReactions.appendChild(el);
      window.setTimeout(() => el.remove(), 1000);
    });
  }

  function showFoodTapFloats(clientX, clientY, { points = 0, statPenalty = null, sliced = false } = {}) {
    if (!floatingReactions || !stage) return;

    const rows = [];
    if (points) rows.push({ type: 'score', value: points });
    if (statPenalty) {
      STAT_ORDER.forEach((key) => {
        const delta = statPenalty[key];
        if (delta) rows.push({ type: 'stat', key, value: delta });
      });
    }
    if (!rows.length) return;

    const rect = stage.getBoundingClientRect();
    const baseX = clientX - rect.left;
    const baseY = clientY - rect.top;

    rows.forEach((row, i) => {
      const el = document.createElement('span');
      const isPos = row.value > 0;
      el.className = `stat-float ${isPos ? 'is-pos' : 'is-neg'}`;
      if (row.type === 'score') {
        const sign = row.value > 0 ? '+' : '';
        const tag = sliced ? ' ✂️' : '';
        el.textContent = `${sign}${row.value} ⭐${tag}`;
      } else {
        const sign = row.value > 0 ? '+' : '';
        const icon = STAT_ICONS[row.key] || '';
        el.textContent = `${sign}${row.value} ${icon}`;
      }
      el.style.left = `${baseX}px`;
      el.style.top = `${baseY + i * 1.1}rem`;
      floatingReactions.appendChild(el);
      window.setTimeout(() => el.remove(), 1000);
    });
  }

  if (nutritionOk) {
    nutritionOk.addEventListener('click', () => finishNutrition('ok'));
  }

  if (nutritionSkip) {
    nutritionSkip.addEventListener('click', () => finishNutrition('skip'));
  }

  return {
    showIdle,
    hideIdle,
    showNutrition,
    hideNutrition,
    showActionPrompt,
    hideActionPrompt,
    showFloatingReactions,
    showFoodTapFloats,
    hideAll,
    bumpIdle: () => showIdle(idleBubble?.textContent || '', { animate: false }),
  };
}
