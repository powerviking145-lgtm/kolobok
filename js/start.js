import { runBootLoader } from './loader.js';
import { initViewport } from './viewport.js';
import { initTelegram, isTelegramMiniApp } from './telegram.js';

/** Лёгкий старт для Telegram — 4 модуля вместо 25+, прогресс сразу крутится. */
export async function runInitialBoot() {
  window.__kolobokBootProgress?.(12);

  initTelegram();
  initViewport();

  const tgFast = isTelegramMiniApp();

  window.__kolobokBootProgress?.(18);

  if (!tgFast) {
    const bootRoot = document.getElementById('boot-loader');
    await runBootLoader({
      rootEl: bootRoot,
      tipEl: document.getElementById('boot-loader-tip'),
      barEl: document.getElementById('boot-loader-bar'),
      percentEl: document.getElementById('boot-loader-percent'),
      progressEl: document.getElementById('boot-loader-progress'),
      preloadHomeVideos: null,
      telegramFast: false,
    });
  }

  window.__kolobokBootProgress?.(40);
}
