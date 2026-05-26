import { CONFIG } from './config.js';
import { gameState } from './state.js';

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function needsBadFoodTip() {
  const cfg = CONFIG.homeFoods?.badTip ?? {};
  if (cfg.enabled === false) return false;
  return gameState.get().badFoodTipDay !== todayKey();
}

export function createBadFoodTip({ overlay, card, textEl, nextBtn, dotsEl, skipBtn, spotlight }) {
  let active = false;

  function cleanup() {
    active = false;
    document.documentElement.classList.remove('is-bad-food-tip-active');
    overlay?.setAttribute('hidden', '');
    overlay?.setAttribute('aria-hidden', 'true');
    if (spotlight) {
      spotlight.hidden = true;
      spotlight.classList.remove('tutorial-spotlight--full');
    }
    if (card) {
      card.classList.remove(
        'tutorial-card--center',
        'tutorial-card--top',
        'tutorial-card--bottom',
        'tutorial-card--bottom-left',
        'tutorial-card--side'
      );
      card.style.left = '';
      card.style.top = '';
      card.style.transform = '';
    }
    if (dotsEl) dotsEl.hidden = false;
    if (skipBtn) skipBtn.hidden = false;
  }

  function layoutCard() {
    if (!card || !overlay) return;
    card.classList.add('tutorial-card--center');
    const rect = overlay.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const pad = CONFIG.tutorial?.spotlightPad ?? 10;
    const left = Math.max(pad, (rect.width - cardRect.width) / 2);
    const top = Math.max(pad, rect.height - cardRect.height - pad * 2);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.transform = 'none';
  }

  function show() {
    if (!needsBadFoodTip()) return Promise.resolve(true);
    if (active) return Promise.resolve(true);

    const cfg = CONFIG.homeFoods?.badTip ?? {};
    return new Promise((resolve) => {
      active = true;
      document.documentElement.classList.add('is-bad-food-tip-active');

      if (textEl) textEl.textContent = cfg.text ?? '';
      if (nextBtn) {
        nextBtn.hidden = false;
        nextBtn.style.display = '';
        nextBtn.textContent = cfg.buttonText ?? 'Понятно';
      }
      if (dotsEl) dotsEl.hidden = true;
      if (skipBtn) skipBtn.hidden = true;

      if (spotlight) {
        spotlight.hidden = false;
        spotlight.classList.add('tutorial-spotlight--full');
        const dim = CONFIG.tutorial?.dimLight || 'rgba(0, 0, 0, 0.45)';
        spotlight.style.setProperty('--tutorial-dim', dim);
      }

      overlay?.removeAttribute('hidden');
      overlay?.setAttribute('aria-hidden', 'false');

      requestAnimationFrame(() => {
        layoutCard();
        requestAnimationFrame(layoutCard);
      });

      const onOk = () => {
        gameState.markBadFoodTipShown();
        cleanup();
        resolve(true);
      };

      const btnHandler = () => {
        nextBtn?.removeEventListener('click', btnHandler);
        onOk();
      };
      nextBtn?.addEventListener('click', btnHandler, { once: true });
    });
  }

  return {
    isActive: () => active,
    show,
    dismiss: cleanup,
  };
}
