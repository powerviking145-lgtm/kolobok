import { CONFIG } from './config.js';
import { getFoodLecturePhrase } from './phrases.js';

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function createFoodLecture({ overlayEl, dismissBtn, onShowPhrase, onDismiss }) {
  let active = false;

  function pickDismissLabel() {
    const labels = CONFIG.homeSpawns.lecture.dismissLabels;
    return pickRandom(labels);
  }

  return {
    isActive() {
      return active;
    },

    tryShow(item) {
      const chance = CONFIG.homeSpawns.lecture.chance;
      if (!item || Math.random() > chance) return false;

      const text = getFoodLecturePhrase(item);
      onShowPhrase(text, true);

      active = true;
      document.documentElement.classList.add('is-lecture-active');
      if (overlayEl) {
        overlayEl.hidden = false;
        overlayEl.setAttribute('aria-hidden', 'false');
      }
      if (dismissBtn) {
        dismissBtn.textContent = pickDismissLabel();
      }
      return true;
    },

    dismiss() {
      if (!active) return;
      active = false;
      document.documentElement.classList.remove('is-lecture-active');
      if (overlayEl) {
        overlayEl.hidden = true;
        overlayEl.setAttribute('aria-hidden', 'true');
      }
      onDismiss?.();
    },
  };
}
