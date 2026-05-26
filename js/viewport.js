import { CONFIG } from './config.js';

let overlayEl = null;
let lastTouchEnd = 0;

function viewportCfg() {
  return CONFIG.viewport ?? {};
}

function setViewportHeight() {
  const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function isKeyboardOpen() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

/** Ландшафт по экрану устройства, не по сжатому viewport (клавиатура в TG). */
export function isLandscapeBlocked() {
  if (isKeyboardOpen()) return false;
  if (document.documentElement.classList.contains('is-onboarding-active')) return false;

  const w = Math.round(window.screen.width);
  const h = Math.round(window.screen.height);

  if (h >= w) return false;

  const shortSide = Math.min(w, h);
  const maxShort = viewportCfg().landscapeBlockMaxShortPx ?? 520;
  if (shortSide > maxShort) return false;

  const tg = window.Telegram?.WebApp;
  const platform = String(tg?.platform ?? '').toLowerCase();
  const desktopPlatforms = viewportCfg().landscapeDesktopPlatforms ?? [
    'tdesktop',
    'macos',
    'web',
    'weba',
    'unigram',
  ];
  if (platform && desktopPlatforms.includes(platform)) {
    return false;
  }

  return true;
}

function updateOrientationOverlay() {
  if (!overlayEl) {
    overlayEl = document.getElementById('landscape-overlay');
  }
  if (!overlayEl) return;

  const blocked = isLandscapeBlocked();

  if (blocked) {
    document.documentElement.classList.add('is-landscape-blocked');
    overlayEl.removeAttribute('hidden');
    overlayEl.setAttribute('aria-hidden', 'false');
    overlayEl.classList.add('is-visible');
  } else {
    document.documentElement.classList.remove('is-landscape-blocked');
    overlayEl.setAttribute('hidden', '');
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.classList.remove('is-visible');
  }
}

function onResize() {
  setViewportHeight();
  updateOrientationOverlay();
}

function preventContextMenu(event) {
  event.preventDefault();
}

function preventDoubleTapZoom(event) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}

function preventPinchZoom(event) {
  if (event.touches && event.touches.length > 1) {
    event.preventDefault();
  }
}

export function initViewport() {
  setViewportHeight();
  updateOrientationOverlay();

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  document.addEventListener('focusin', onResize);
  document.addEventListener('focusout', onResize);

  document.addEventListener('contextmenu', preventContextMenu);
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
  document.addEventListener('touchmove', preventPinchZoom, { passive: false });
}
