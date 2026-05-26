import { CONFIG } from '../config.js';
import { applyRunnerStatCard } from '../statZones.js';
import { getBossCatchPhrase } from '../phrases.js';
import { RUNNER_CONFIG } from './runner-config.js';

const RUNNER_LABELS = {
  hunger: 'Еда',
  thirst: 'Вода',
  health: 'Жизнь',
  mood: 'Вайб',
};

export function createHud(elements) {
  let bestScore = 0;
  let toastUntil = 0;
  let statsBuilt = false;

  function buildRunnerStats() {
    if (!elements.statsBars || statsBuilt) return;
    elements.statsBars.innerHTML = CONFIG.statBars
      .map(
        (bar) => `
      <div class="runner-stat-card" data-stat="${bar.key}">
        <div class="runner-stat-card__top">
          <span class="runner-stat-card__icon" aria-hidden="true">${bar.icon}</span>
          <span class="runner-stat-card__value" data-value="${bar.key}">0</span>
        </div>
        <div class="runner-stat-card__track" aria-hidden="true">
          <div class="runner-stat-card__fill" data-fill="${bar.key}"></div>
        </div>
        <span class="runner-stat-card__label">${RUNNER_LABELS[bar.key] || bar.label}</span>
      </div>
    `
      )
      .join('');
    statsBuilt = true;
  }

  return {
    show() {
      buildRunnerStats();
      if (elements.statsPanel) {
        elements.statsPanel.hidden = false;
        elements.statsPanel.removeAttribute('hidden');
      }
      elements.results.hidden = true;
    },

    hide() {
      if (elements.statsPanel) elements.statsPanel.hidden = true;
    },

    update(distance, score, stats) {
      elements.distance.textContent = `${Math.floor(distance)} м`;
      elements.score.textContent = String(Math.floor(score));

      if (stats && elements.statsBars) {
        CONFIG.statBars.forEach((bar) => {
          const value = stats[bar.key];
          const card = elements.statsBars.querySelector(`[data-stat="${bar.key}"]`);
          const fill = elements.statsBars.querySelector(`[data-fill="${bar.key}"]`);
          const valueEl = elements.statsBars.querySelector(`[data-value="${bar.key}"]`);
          applyRunnerStatCard(card, fill, valueEl, value);
        });
      }

      if (elements.toast && performance.now() > toastUntil) {
        elements.toast.hidden = true;
      }
    },

    showPickupToast(text) {
      if (!elements.toast) return;
      elements.toast.textContent = text;
      elements.toast.hidden = false;
      toastUntil = performance.now() + 1100;
    },

    showLocationToast(name) {
      if (!elements.toast) return;
      elements.toast.textContent = `→ ${name}`;
      elements.toast.hidden = false;
      toastUntil = performance.now() + (RUNNER_CONFIG.locationToastMs || 1400);
    },

    showBossWarning(step) {
      if (!elements.toast) return;
      const lines = RUNNER_CONFIG.boss.warningToasts || [];
      const text = lines[step - 1] || 'Босс ближе!';
      elements.toast.textContent = text;
      elements.toast.hidden = false;
      toastUntil = performance.now() + 1500;
    },

    showResults({ distance, score, isRecord, reason, bossId }) {
      if (elements.statsPanel) elements.statsPanel.hidden = true;
      elements.results.hidden = false;
      elements.results.removeAttribute('hidden');
      elements.resultDistance.textContent = String(Math.floor(distance));
      elements.resultScore.textContent = String(Math.floor(score));
      elements.resultBest.textContent = String(Math.floor(bestScore));
      const titles = {
        surrender: 'Сдался? Норм, бро.',
        health: 'Здоровье ноль. Забег окончен.',
        collision: 'Попался!',
      };
      if (reason === 'boss') {
        elements.resultTitle.textContent = getBossCatchPhrase(bossId || 'village');
      } else {
        elements.resultTitle.textContent = titles[reason] || 'Забег окончен';
      }
      elements.resultRecord.hidden = !isRecord;
    },

    setBestScore(s) {
      bestScore = s;
    },
  };
}
