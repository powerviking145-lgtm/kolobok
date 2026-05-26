import { CONFIG } from './config.js';
import { getStatDisplayPercentValue } from './state.js';

const ZONES = CONFIG.statZones;

function statScaleMax() {
  return CONFIG.stats.max ?? 120;
}

function zoneThresholdPct(zoneMax) {
  return (zoneMax / statScaleMax()) * 100;
}

/** % на шкале 120 (старт 48 → 40%) */
export function getStatFillPercent(value, _personalMaxIgnored) {
  const scale = statScaleMax();
  const v = Math.max(0, Math.min(scale, value));
  return scale > 0 ? (v / scale) * 100 : 0;
}

/** Отображаемый % на чипе — от шкалы 120 */
export function getStatDisplayPercent(value, _personalMaxIgnored) {
  return getStatDisplayPercentValue(value);
}

export function getStatZone(value, _personalMaxIgnored) {
  const pct = getStatDisplayPercentValue(value);
  if (pct <= zoneThresholdPct(ZONES.red.max)) return 'red';
  if (pct <= zoneThresholdPct(ZONES.yellow.max)) return 'yellow';
  if (pct <= zoneThresholdPct(ZONES.green.max)) return 'green';
  return 'gold';
}

function getStatGradient(statKey) {
  const colors = CONFIG.statColors?.[statKey];
  if (!colors) return 'linear-gradient(90deg, #52b788, #95d5b2)';
  return `linear-gradient(90deg, ${colors.from} 0%, ${colors.to} 100%)`;
}

export function applyStatBarFill(fillEl, value, statKey, _max) {
  if (!fillEl) return;
  const key = statKey || fillEl.dataset.fill || fillEl.closest('[data-stat]')?.dataset.stat;
  const pct = getStatFillPercent(value);
  fillEl.style.width = `${pct}%`;
  fillEl.style.background = getStatGradient(key);
  fillEl.className = 'stat-bar__fill';
  const low = pct < (CONFIG.ui.statLowPercent ?? 30);
  fillEl.classList.toggle('stat-bar__fill--low', low);

  const row = fillEl.closest('[data-stat]');
  if (row) row.classList.toggle('stat--low', low);
}

export function applyRunnerStatCard(cardEl, fillEl, valueEl, value, _max) {
  const zone = getStatZone(value);
  const pct = Math.round(getStatDisplayPercentValue(value));

  if (cardEl) {
    cardEl.className = `runner-stat-card runner-stat-card--zone-${zone}`;
    cardEl.dataset.zone = zone;
  }
  if (fillEl) {
    fillEl.style.width = `${getStatFillPercent(value)}%`;
    fillEl.className = `runner-stat-card__fill runner-stat-card__fill--zone-${zone}`;
  }
  if (valueEl) valueEl.textContent = `${pct}%`;
}
