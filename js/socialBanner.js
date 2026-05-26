import { CONFIG } from './config.js';
import { getTotalPlayers } from './roadmap.js';

export function initSocialBanner(
  bannerEl = document.getElementById('social-banner'),
  { onOpenRoadmap } = {}
) {
  if (!bannerEl) return () => {};

  const cfg = CONFIG.socialBanner ?? {};
  const countEl = bannerEl.querySelector('.social-banner__count');
  if (countEl) {
    countEl.textContent = String(getTotalPlayers());
  }

  bannerEl.addEventListener('click', () => {
    if (typeof onOpenRoadmap === 'function') {
      onOpenRoadmap();
      return;
    }
    console.log('open roadmap');
  });

  let shimmerTimerId = null;
  let shimmerIntervalId = null;

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

  return () => {
    if (shimmerTimerId) window.clearTimeout(shimmerTimerId);
    if (shimmerIntervalId) window.clearInterval(shimmerIntervalId);
  };
}
