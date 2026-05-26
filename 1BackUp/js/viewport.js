const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 31.25rem)';

let overlayEl = null;
let lastTouchEnd = 0;

function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function isLandscapeBlocked() {
  return window.matchMedia(LANDSCAPE_QUERY).matches;
}

function updateOrientationOverlay() {
  if (!overlayEl) {
    overlayEl = document.getElementById('landscape-overlay');
  }
  if (!overlayEl) return;

  const blocked = isLandscapeBlocked();

  if (blocked) {
    overlayEl.removeAttribute('hidden');
    overlayEl.setAttribute('aria-hidden', 'false');
    overlayEl.classList.add('is-visible');
  } else {
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

  const landscapeMq = window.matchMedia(LANDSCAPE_QUERY);
  landscapeMq.addEventListener('change', updateOrientationOverlay);

  document.addEventListener('contextmenu', preventContextMenu);
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
  document.addEventListener('touchmove', preventPinchZoom, { passive: false });
}
