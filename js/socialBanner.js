import { CONFIG } from './config.js';
import { getTotalPlayers } from './roadmap.js';
import { gameState } from './state.js';

export function initSocialBanner(
  bannerEl = document.getElementById('social-banner'),
  { onOpenRoadmap } = {}
) {
  if (!bannerEl) return () => {};

  const cfg = CONFIG.socialBanner ?? {};
  const countEl = bannerEl.querySelector('.social-banner__count');
  const lifeCountEl = document.getElementById('life-banner-count');
  const lifeBannerEl = document.getElementById('life-banner');
  let lastLifeLabel = null;
  let lifePulseTimeoutId = null;
  if (countEl) {
    countEl.textContent = String(getTotalPlayers());
  }

  function renderLife() {
    if (!lifeCountEl) return;
    const bornAt = Number(gameState.get()?.bornAt) || Date.now();
    const elapsed = Math.max(0, Date.now() - bornAt);
    const totalMinutes = Math.max(1, Math.floor(elapsed / (60 * 1000)));
    const totalHours = Math.max(1, Math.floor(elapsed / (60 * 60 * 1000)));
    const totalDays = Math.max(1, Math.floor(elapsed / (24 * 60 * 60 * 1000)));

    // 0-59м -> минуты; 1-23ч -> часы; 1+д -> дни.
    const lifeLabel =
      totalMinutes < 60 ? `${totalMinutes} м` : totalHours < 24 ? `${totalHours} ч` : `${totalDays} д`;

    lifeCountEl.textContent = lifeLabel;
    const suffixEl = document.getElementById('life-banner-suffix');
    if (suffixEl) {
      suffixEl.textContent = cfg.lifeSuffix ?? ' вне печки';
    }

    if (lastLifeLabel != null && lifeLabel !== lastLifeLabel && lifeBannerEl) {
      lifeBannerEl.classList.remove('is-life-pulse');
      void lifeBannerEl.offsetWidth;
      lifeBannerEl.classList.add('is-life-pulse');
      if (lifePulseTimeoutId) window.clearTimeout(lifePulseTimeoutId);
      lifePulseTimeoutId = window.setTimeout(() => {
        lifeBannerEl.classList.remove('is-life-pulse');
        lifePulseTimeoutId = null;
      }, 900);
    }
    lastLifeLabel = lifeLabel;
  }

  renderLife();

  bannerEl.addEventListener('click', () => {
    if (typeof onOpenRoadmap === 'function') {
      onOpenRoadmap();
      return;
    }
    console.log('open roadmap');
  });

  let shimmerTimerId = null;
  let shimmerIntervalId = null;
  let lifeTimerId = null;

  function runShimmer() {
    bannerEl.classList.remove('is-shimmer');
    void bannerEl.offsetWidth;
    bannerEl.classList.add('is-shimmer');
    window.setTimeout(() => bannerEl.classList.remove('is-shimmer'), 1300);
  }

  shimmerTimerId = window.setTimeout(() => {
    runShimmer();
    shimmerIntervalId = window.setInterval(
      runShimmer,
      cfg.shimmerIntervalMs ?? 12000
    );
  }, cfg.shimmerDelayMs ?? 5000);

  lifeTimerId = window.setInterval(renderLife, 60_000);

  return () => {
    if (shimmerTimerId) window.clearTimeout(shimmerTimerId);
    if (shimmerIntervalId) window.clearInterval(shimmerIntervalId);
    if (lifeTimerId) window.clearInterval(lifeTimerId);
    if (lifePulseTimeoutId) window.clearTimeout(lifePulseTimeoutId);
  };
}
