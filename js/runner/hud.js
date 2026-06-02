import { CONFIG } from '../config.js';
import { getStatDisplayPercentValue } from '../state.js';
import { getBossCatchPhrase } from '../phrases.js';
import { RUNNER_CONFIG } from './runner-config.js';

const RUNNER_LABELS = {
  strength: 'Сила',
  agility: 'Ловкость',
};

function getCombatBars() {
  return (CONFIG.statBars ?? []).filter((bar) => bar.group === 'combat');
}

function getSpeedTierLabel(stats) {
  const values = [stats.strength, stats.agility];
  if (values.some((v) => v <= 0)) return 'На пределе';
  const threshold = RUNNER_CONFIG.speedMultipliers.statLowThreshold ?? 30;
  if (values.some((v) => v < threshold)) return 'Тяжело';
  return 'В темпе';
}

export function createHud(elements) {
  let bestScore = 0;
  let toastUntil = 0;
  let statsBuilt = false;

  function buildRunnerStats() {
    if (!elements.statsBars || statsBuilt) return;
    const chipLabels = CONFIG.topPanel?.statChipLabels ?? {};
    const themes = CONFIG.topPanel?.statThemes ?? {};
    const bars = getCombatBars();

    elements.statsBars.innerHTML = `
      <div class="runner-hud__stats-row">
        ${bars
          .map((bar, index) => {
            const caption = chipLabels[bar.key] ?? bar.label.toUpperCase();
            const theme = themes[bar.key] ?? { rgb: '245, 166, 35', hex: '#F5A623', dark: '#C48412' };
            const divider =
              index === 1
                ? '<span class="runner-hud__stats-divider" aria-hidden="true"></span>'
                : '';
            return `${divider}
        <div class="stat-chip runner-stat-chip stat-chip--combat" data-stat="${bar.key}" style="--stat-rgb:${theme.rgb};--stat-color:${theme.hex};--stat-color-dark:${theme.dark}">
          <span class="stat-chip__head">
            <span class="stat-chip__icon" aria-hidden="true">${bar.icon}</span>
            <span class="stat-chip__pct" data-pct="${bar.key}">0%</span>
          </span>
          <span class="stat-chip__track runner-stat-chip__track">
            <span class="stat-chip__fill runner-stat-chip__fill" data-fill="${bar.key}"></span>
          </span>
          <span class="stat-chip__caption">${caption}</span>
        </div>`;
          })
          .join('')}
      </div>`;
    statsBuilt = true;
  }

  function updateStatChips(stats) {
    if (!stats || !elements.statsBars) return;
    const themes = CONFIG.topPanel?.statThemes ?? {};
    const criticalRatio = CONFIG.topPanel?.criticalRatio ?? 0.15;
    const scaleMax = CONFIG.stats.max ?? 120;

    getCombatBars().forEach((bar) => {
      const value = stats[bar.key];
      const pct = getStatDisplayPercentValue(value);
      const theme = themes[bar.key] ?? { rgb: '245, 166, 35', hex: '#F5A623', dark: '#C48412' };
      const chip = elements.statsBars.querySelector(`[data-stat="${bar.key}"]`);
      const fill = elements.statsBars.querySelector(`[data-fill="${bar.key}"]`);
      const pctEl = elements.statsBars.querySelector(`[data-pct="${bar.key}"]`);

      if (chip) {
        chip.style.setProperty('--stat-rgb', theme.rgb);
        chip.style.setProperty('--stat-color', theme.hex);
        chip.style.setProperty('--stat-color-dark', theme.dark);
        chip.classList.toggle(
          'stat-chip--critical',
          scaleMax > 0 && value / scaleMax < criticalRatio
        );
        chip.classList.toggle('runner-stat-chip--empty', value <= 0);
      }
      if (pctEl) pctEl.textContent = `${pct}%`;
      if (fill) {
        fill.style.width = `${Math.max(0, Math.min(100, (value / scaleMax) * 100))}%`;
        fill.style.background = `linear-gradient(90deg, ${theme.dark} 0%, ${theme.hex} 100%)`;
        fill.style.boxShadow = `0 0 0.35rem ${theme.hex}`;
      }
    });
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
      if (elements.distance) {
        elements.distance.textContent = `${Math.floor(distance)} м`;
      }
      if (elements.score) {
        elements.score.textContent = String(Math.floor(score));
      }
      if (elements.speedTier && stats) {
        elements.speedTier.textContent = getSpeedTierLabel(stats);
      }
      updateStatChips(stats);

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
        exhausted: 'Сил нет — забег окончен.',
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
