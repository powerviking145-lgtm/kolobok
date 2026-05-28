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
  if (countEl) {
    countEl.textContent = String(getTotalPlayers());
  }

  function renderLife() {
    if (!lifeCountEl) return;
    const bornAt = Number(gameState.get()?.bornAt) || Date.now();
    const elapsed = Math.max(0, Date.now() - bornAt);
    const totalHours = Math.max(1, Math.floor(elapsed / (60 * 60 * 1000)));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days <= 0) {
      lifeCountEl.textContent = `${hours} ч`;
      return;
    }
    lifeCountEl.textContent = `${days} д ${hours} ч`;
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
  };
}
