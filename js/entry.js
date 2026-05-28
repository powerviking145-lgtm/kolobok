import { initTelegram } from './telegram.js';
import { initViewport } from './viewport.js';
import { launchGame } from './main.js';

const BUILD = window.__KOLOBOK_BUILD || '167';

const stylesheet = document.getElementById('app-stylesheet');
if (stylesheet) {
  stylesheet.href = `style.css?v=${BUILD}`;
}

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

async function startApp() {
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

startApp().catch((err) => {
  console.error('Колобок: entry', err);
  const text = document.getElementById('boot-fatal-text');
  const el = document.getElementById('boot-fatal-error');
  if (text) {
    text.textContent = 'Не загрузилось. Закрой Mini App и открой снова.';
  }
  if (el) el.classList.add('is-visible');
  document.documentElement.classList.remove('boot-loading');
  const boot = document.getElementById('boot-loader');
  if (boot) boot.hidden = true;
});
