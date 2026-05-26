import { CONFIG } from './config.js';

const ZONES = CONFIG.statZones;

export function getStatZone(value) {
  const v = Math.max(0, Math.min(CONFIG.stats.max, value));
  if (v <= ZONES.red.max) return 'red';
  if (v <= ZONES.yellow.max) return 'yellow';
  if (v <= ZONES.green.max) return 'green';
  return 'gold';
}

export function getStatFillPercent(value) {
  const v = Math.max(0, Math.min(CONFIG.stats.max, value));
  return (v / CONFIG.stats.max) * 100;
}

function getStatGradient(statKey) {
  const colors = CONFIG.statColors?.[statKey];
  if (!colors) return 'linear-gradient(90deg, #52b788, #95d5b2)';
  return `linear-gradient(90deg, ${colors.from} 0%, ${colors.to} 100%)`;
}

export function applyStatBarFill(fillEl, value, statKey) {
  if (!fillEl) return;
  const key = statKey || fillEl.dataset.fill || fillEl.closest('[data-stat]')?.dataset.stat;
  fillEl.style.width = `${getStatFillPercent(value)}%`;
  fillEl.style.background = getStatGradient(key);
  fillEl.className = 'stat-bar__fill';
  const low = getStatFillPercent(value) < (CONFIG.ui.statLowPercent ?? 30);
  fillEl.classList.toggle('stat-bar__fill--low', low);

  const row = fillEl.closest('[data-stat]');
  if (row) row.classList.toggle('stat--low', low);
}

export function applyRunnerStatCard(cardEl, fillEl, valueEl, value) {
  const zone = getStatZone(value);
  const v = Math.round(Math.max(0, Math.min(CONFIG.stats.max, value)));

  if (cardEl) {
    cardEl.className = `runner-stat-card runner-stat-card--zone-${zone}`;
    cardEl.dataset.zone = zone;
  }
  if (fillEl) {
    fillEl.style.width = `${getStatFillPercent(value)}%`;
    fillEl.className = `runner-stat-card__fill runner-stat-card__fill--zone-${zone}`;
  }
  if (valueEl) valueEl.textContent = String(v);
}
