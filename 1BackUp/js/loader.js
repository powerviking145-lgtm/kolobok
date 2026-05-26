import { CONFIG } from './config.js';

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function runBootLoader(elements) {
  const cfg = CONFIG.loader;
  let tipTimerId = null;
  let tipIndex = 0;
  let shownProgress = 0;

  function setProgress(ratio) {
    const target = Math.min(1, Math.max(0, ratio));
    shownProgress += (target - shownProgress) * 0.4;
    const pct = Math.round(shownProgress * 100);
    if (elements.barEl) {
      elements.barEl.style.width = `${pct}%`;
    }
    if (elements.percentEl) {
      elements.percentEl.textContent = `${pct}%`;
    }
    if (elements.progressEl) {
      elements.progressEl.setAttribute('aria-valuenow', String(pct));
    }
  }

  function setTip(text) {
    if (!elements.tipEl) return;
    elements.tipEl.classList.remove('is-changing');
    void elements.tipEl.offsetWidth;
    elements.tipEl.textContent = text;
    elements.tipEl.classList.add('is-changing');
  }

  function startTips() {
    const tips = cfg.tips;
    if (!tips?.length || !elements.tipEl) return;
    setTip(tips[0]);
    if (tips.length < 2) return;
    tipTimerId = window.setInterval(() => {
      tipIndex = (tipIndex + 1) % tips.length;
      setTip(tips[tipIndex]);
    }, cfg.tipRotateMs);
  }

  function stopTips() {
    if (tipTimerId) {
      window.clearInterval(tipTimerId);
      tipTimerId = null;
    }
  }

  async function finishHide() {
    stopTips();
    if (cfg.doneTip && elements.tipEl) {
      setTip(cfg.doneTip);
    }
    await delay(cfg.afterLoadPauseMs ?? 400);
    if (elements.rootEl) {
      elements.rootEl.classList.add('is-done');
      elements.rootEl.setAttribute('aria-busy', 'false');
      document.documentElement.classList.remove('boot-loading');
    }
    await delay(cfg.hideFadeMs ?? 500);
    if (elements.rootEl) {
      elements.rootEl.hidden = true;
      elements.rootEl.setAttribute('aria-hidden', 'true');
    }
  }

  async function runLoad() {
    if (!elements.preloadHomeVideos) {
      await delay(cfg.minShowMs ?? 1500);
      await finishHide();
      return;
    }

    startTips();
    setProgress(0.05);

    const startedAt = performance.now();
    try {
      await elements.preloadHomeVideos(setProgress);
    } catch (err) {
      console.warn('boot preload', err);
    }
    setProgress(1);

    const elapsed = performance.now() - startedAt;
    const waitMore = Math.max(0, (cfg.minShowMs ?? 1500) - elapsed);
    if (waitMore > 0) {
      await delay(waitMore);
    }

    let guard = 0;
    while (shownProgress < 0.98 && guard < 30) {
      setProgress(1);
      await delay(40);
      guard += 1;
    }
    if (elements.percentEl) elements.percentEl.textContent = '100%';
    if (elements.barEl) elements.barEl.style.width = '100%';

    await finishHide();
  }

  const maxWait = (cfg.videoTimeoutMs ?? 12000) + (cfg.minShowMs ?? 1500) + 2000;

  return Promise.race([
    runLoad(),
    delay(maxWait).then(async () => {
      console.warn('boot loader: принудительное завершение по таймауту');
      setProgress(1);
      if (elements.percentEl) elements.percentEl.textContent = '100%';
      if (elements.barEl) elements.barEl.style.width = '100%';
      await finishHide();
    }),
  ]);
}
