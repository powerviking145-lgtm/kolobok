import { CONFIG } from './config.js';

const TAP_REACTIONS = {
  happy: ['😄', '🥰', '😎'],
  overstuffed: ['😋', '🤤', '😅'],
  normal: ['✨', '👋', '🟡'],
  hungry: ['😤', '🍗', ''],
  thirsty: ['💧', '🥤', ''],
  sick: ['🤒', '😵', ''],
  angry: ['😤', '💢', ''],
};

export function vibrate(pattern) {
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export function vibrateTap() {
  vibrate(CONFIG.ui.hapticTapMs ?? 10);
}

export function vibrateAchievement() {
  vibrate(CONFIG.ui.hapticAchievement ?? [50, 30, 50]);
}

export function pickTapReaction(mood) {
  const list = TAP_REACTIONS[mood] || TAP_REACTIONS.normal;
  const emoji = list[Math.floor(Math.random() * list.length)] || '✨';
  return emoji;
}

export function initHomeParticles(container) {
  if (!container) return () => {};

  const cfg = CONFIG.homeParticles;
  const particles = [];
  let rafId = null;
  let lastTime = performance.now();

  for (let i = 0; i < cfg.count; i += 1) {
    const el = document.createElement('span');
    el.className = 'particle';
    el.style.left = `${Math.random() * 100}%`;
    el.style.top = `${Math.random() * 100}%`;
    el.style.opacity = String(cfg.opacityMin + Math.random() * (cfg.opacityMax - cfg.opacityMin));
    container.appendChild(el);
    particles.push({
      el,
      x: Math.random() * 100,
      y: Math.random() * 100,
      phase: Math.random() * Math.PI * 2,
      speed: cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin),
      drift: (Math.random() - 0.5) * cfg.drift,
    });
  }

  function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    particles.forEach((p) => {
      p.y -= p.speed * dt * 8;
      p.x += p.drift * dt;
      p.phase += dt * 2;
      if (p.y < -5) {
        p.y = 105;
        p.x = Math.random() * 100;
      }
      if (p.x < -2) p.x = 102;
      if (p.x > 102) p.x = -2;
      const wobble = Math.sin(p.phase) * 1.5;
      p.el.style.transform = `translate(${wobble}%, 0)`;
      p.el.style.left = `${p.x}%`;
      p.el.style.top = `${p.y}%`;
    });

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    container.replaceChildren();
  };
}

export function createSpeechAutoHide(bubble, isBlocked) {
  const hideMs = CONFIG.ui.speechHideIdleMs ?? 6000;
  let timerId = null;

  function clearTimer() {
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  function hide() {
    if (isBlocked()) return;
    bubble?.classList.remove('is-visible');
    bubble?.classList.add('is-hidden');
  }

  function show() {
    if (!bubble) return;
    bubble.classList.remove('is-hidden');
    bubble.classList.add('is-visible');
    clearTimer();
    if (!isBlocked()) {
      timerId = window.setTimeout(hide, hideMs);
    }
  }

  function bump() {
    show();
  }

  return { show, hide, bump, clearTimer };
}
