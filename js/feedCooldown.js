import { CONFIG } from './config.js';

function cfg() {
  return CONFIG.feedCooldown ?? {};
}

/** Выкл. на время тестов — таймер «сыт» не мешает кормлению. */
export function isCooldownEnabled() {
  return cfg().enabled !== false;
}

export function getCooldownDurationMs() {
  const c = cfg();
  if (c.useDevDuration && CONFIG.purchase?.testMode) {
    return c.devDurationMs ?? 60_000;
  }
  return c.durationMs ?? 20 * 60 * 60 * 1000;
}

export function getLastFeedTimestamp() {
  const raw = localStorage.getItem(cfg().storageKey ?? 'lastFeedTimestamp');
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function setLastFeedTimestamp(ts = Date.now()) {
  if (!isCooldownEnabled()) return;
  localStorage.setItem(cfg().storageKey ?? 'lastFeedTimestamp', String(ts));
}

export function initFeedCooldown() {
  if (!isCooldownEnabled()) clearLastFeedTimestamp();
}

export function clearLastFeedTimestamp() {
  localStorage.removeItem(cfg().storageKey ?? 'lastFeedTimestamp');
}

export function getRemainingMs(now = Date.now()) {
  if (!isCooldownEnabled()) return 0;
  const last = getLastFeedTimestamp();
  if (!last) return 0;
  return Math.max(0, getCooldownDurationMs() - (now - last));
}

export function isOnCooldown(now = Date.now()) {
  if (!isCooldownEnabled()) return false;
  return getRemainingMs(now) > 0;
}

export function formatCooldownTime(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) {
    return mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`;
  }
  if (mins > 0) return `${mins}м`;
  return totalSec > 0 ? `${totalSec}с` : '0с';
}

export function formatFeedButtonLabel() {
  const c = cfg();
  return {
    icon: c.buttonIcon ?? '🍔',
    text: c.fedLabel ?? 'Сыт',
  };
}

export function formatFeedToast(ms) {
  const tpl =
    cfg().toastText ?? 'Колобок ещё сыт, бро. Покормить можно через {time}.';
  return tpl.replace('{time}', formatCooldownTime(ms));
}
