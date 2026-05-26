import { CONFIG } from './config.js';

function tutorialSteps() {
  return (
    CONFIG.shop?.tutorial?.steps ?? [
      {
        text: 'Глянь, бро! Тут можно затюнить наш домик или прокачать мои объёмы 💪',
        button: 'Дальше',
      },
      {
        text: 'Дома — это вайб локации. А прокачка — потолок моих статов!',
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
    if (textEl) textEl.textContent = step.text ?? '';
    if (nextBtn) nextBtn.textContent = step.button ?? 'Дальше';
  }

  function cleanup() {
    active = false;
    stepIndex = 0;
    root?.setAttribute('hidden', '');
    root?.setAttribute('aria-hidden', 'true');
    root?.classList.remove('is-active');
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
