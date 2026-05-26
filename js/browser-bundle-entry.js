import { initTelegram } from './telegram.js';
import { initViewport } from './viewport.js';
import { launchGame } from './main.js';

function waitForDom() {
  if (document.readyState !== 'loading') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });
}

function primeTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
  } catch {
    /* ignore */
  }
}

/** Один файл для браузера */
export async function bootBrowser() {
  primeTelegram();
  await waitForDom();
  primeTelegram();
  if (typeof window.__kolobokHideFatal === 'function') {
    window.__kolobokHideFatal();
  }
  initTelegram();
  initViewport();
  await launchGame();
}

bootBrowser().catch((err) => {
  console.error('Колобок: browser bundle', err);
  const text = document.getElementById('boot-fatal-text');
  const el = document.getElementById('boot-fatal-error');
  if (text) {
    text.textContent = 'Не загрузилось. Обнови страницу или открой через бота.';
  }
  if (el) el.classList.add('is-visible');
  document.documentElement.classList.remove('boot-loading');
  const boot = document.getElementById('boot-loader');
  if (boot) boot.hidden = true;
});
