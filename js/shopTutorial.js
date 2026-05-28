import { CONFIG } from './config.js';

function tutorialSteps() {
  return (
    CONFIG.shop?.tutorial?.steps ?? [
      {
        text: 'Слева «Прокачка» — тут поднимаешь потолок статов.',
        tab: 'upgrade',
        targetSelector: '#shop-tab-upgrade',
        button: 'Дальше',
      },
      {
        text: '«Дома» — это вайб и фон. Для силы сначала качай статы.',
        tab: 'houses',
        targetSelector: '#shop-tab-houses',
        button: 'Понял',
      },
    ]
  );
}

export function createShopTutorial({
  root = document.getElementById('shop-tutorial'),
  card = document.getElementById('shop-tutorial-card'),
  textEl = document.getElementById('shop-tutorial-text'),
  nextBtn = document.getElementById('shop-tutorial-next'),
} = {}) {
  let active = false;
  let stepIndex = 0;
  let resolveWait = null;
  let highlightedEl = null;

  function clearHighlight() {
    if (highlightedEl) {
      highlightedEl.classList.remove('shop-tutorial__target');
      highlightedEl = null;
    }
  }

  function findStepTarget(step) {
    const selector = step?.targetSelector;
    if (!selector) return null;
    return document.querySelector(selector);
  }

  function activateStepTab(step) {
    if (!step?.tab) return;
    const tabBtn = document.querySelector(`[data-shop-tab="${step.tab}"]`);
    tabBtn?.click?.();
  }

  function layoutCard() {
    if (!card || !root) return;
    card.classList.add('tutorial-card--center');
    const rect = root.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const pad = CONFIG.tutorial?.spotlightPad ?? 10;
    const left = Math.max(pad, (rect.width - cardRect.width) / 2);
    const top = Math.max(pad, (rect.height - cardRect.height) / 2);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.transform = 'none';
  }

  function renderStep() {
    const steps = tutorialSteps();
    const step = steps[stepIndex];
    if (!step) return;
    clearHighlight();
    activateStepTab(step);
    highlightedEl = findStepTarget(step);
    highlightedEl?.classList.add('shop-tutorial__target');
    if (textEl) textEl.textContent = step.text ?? '';
    if (nextBtn) nextBtn.textContent = step.button ?? 'Дальше';
  }

  function cleanup() {
    active = false;
    stepIndex = 0;
    root?.setAttribute('hidden', '');
    root?.setAttribute('aria-hidden', 'true');
    root?.classList.remove('is-active');
    clearHighlight();
    if (card) {
      card.classList.remove('tutorial-card--center');
      card.style.left = '';
      card.style.top = '';
      card.style.transform = '';
    }
    nextBtn?.removeEventListener('click', onNext);
  }

  function finish() {
    const resolve = resolveWait;
    resolveWait = null;
    cleanup();
    resolve?.(true);
  }

  function onNext() {
    const steps = tutorialSteps();
    if (stepIndex < steps.length - 1) {
      stepIndex += 1;
      renderStep();
      requestAnimationFrame(layoutCard);
      return;
    }
    finish();
  }

  function show() {
    if (!root || !card) return Promise.resolve(false);
    if (active) cleanup();

    return new Promise((resolve) => {
      active = true;
      resolveWait = resolve;
      stepIndex = 0;
      renderStep();
      root.removeAttribute('hidden');
      root.setAttribute('aria-hidden', 'false');
      root.classList.add('is-active');
      requestAnimationFrame(() => {
        layoutCard();
        requestAnimationFrame(layoutCard);
      });
      nextBtn?.addEventListener('click', onNext, { once: false });
    });
  }

  function forceReset() {
    if (resolveWait) {
      const resolve = resolveWait;
      resolveWait = null;
      resolve(false);
    }
    cleanup();
  }

  return {
    show,
    dismiss: finish,
    forceReset,
    isActive: () => active,
  };
}
