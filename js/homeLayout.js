import { CONFIG } from './config.js';

/**
 * Живые размеры шапки и дока → CSS-переменные без прыжка сцены при смене текста кнопок.
 */
export function initHomeLayout({
  root = document.getElementById('app'),
  statsPanel = document.getElementById('stats-panel'),
  footer = document.getElementById('footer-buttons'),
  stage = document.querySelector('.stage-hero'),
} = {}) {
  if (!root) return () => {};

  let ro = null;
  let lastLogged = '';

  function measure() {
    const dockPx = footer ? Math.ceil(footer.getBoundingClientRect().height) : 0;
    const statsPx = statsPanel
      ? Math.ceil(statsPanel.getBoundingClientRect().height)
      : 0;
    const stagePx = stage ? Math.ceil(stage.getBoundingClientRect().height) : 0;

    if (dockPx > 0) {
      root.style.setProperty('--home-dock-height', `${dockPx}px`);
    }
    if (statsPx > 0) {
      root.style.setProperty('--home-stats-panel-height', `${statsPx}px`);
    }
    if (stagePx > 0) {
      root.style.setProperty('--home-stage-height', `${stagePx}px`);
    }

    if (CONFIG.homeLayout?.debugLog) {
      const key = `${statsPx}|${dockPx}|${stagePx}`;
      if (key !== lastLogged) {
        lastLogged = key;
        console.log('[homeLayout]', { statsPx, dockPx, stagePx });
      }
    }

    return { dockPx, statsPx, stagePx };
  }

  const schedule = () => requestAnimationFrame(measure);

  schedule();

  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(schedule);
    if (footer) ro.observe(footer);
    if (statsPanel) ro.observe(statsPanel);
    if (stage) ro.observe(stage);
  }

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });

  return () => {
    ro?.disconnect();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
  };
}
