import { CONFIG } from './config.js';

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickInt(min, max) {
  return Math.floor(randBetween(min, max + 1));
}

export function createTapFx({ container, kolobokEl }) {
  const cfg = CONFIG.clicker;
  let activeParticles = 0;

  function vibrate() {
    if (!cfg.vibrateMs || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(cfg.vibrateMs);
    } catch {
      /* ignore */
    }
  }

  function squash() {
    if (!kolobokEl) return;
    kolobokEl.classList.remove('is-tap-squash');
    void kolobokEl.offsetWidth;
    kolobokEl.classList.add('is-tap-squash');
    window.setTimeout(() => {
      kolobokEl.classList.remove('is-tap-squash');
    }, Math.max(cfg.squashMs, 200));
  }

  function pickPoints() {
    return pickInt(cfg.pointsMin, cfg.pointsMax);
  }

  function spawnParticle(x, y, text, isPoints) {
    if (!container || activeParticles >= cfg.maxParticles) return;

    const el = document.createElement('span');
    el.className = isPoints ? 'tap-particle tap-particle--points' : 'tap-particle';
    el.textContent = text;

    const dx = randBetween(-cfg.spreadMaxVw, cfg.spreadMaxVw);
    const dy = -randBetween(cfg.riseMinVh, cfg.riseMaxVh);
    const rot = randBetween(-28, 28);

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--dx', `${dx}vw`);
    el.style.setProperty('--dy', `${dy}vh`);
    el.style.setProperty('--rot', `${rot}deg`);
    el.style.setProperty('--dur', `${cfg.particleLifeMs}ms`);

    container.appendChild(el);
    activeParticles += 1;

    window.setTimeout(() => {
      el.remove();
      activeParticles = Math.max(0, activeParticles - 1);
    }, cfg.particleLifeMs + 80);
  }

  function burst(clientX, clientY, points, options = {}) {
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const light = options.light === true;
    const count = light
      ? pickInt(1, Math.max(1, cfg.particlesMin))
      : pickInt(cfg.particlesMin, cfg.particlesMax);
    const emojis = options.emojis || cfg.emojis;

    spawnParticle(x, y, `+${points}`, true);

    for (let i = 0; i < count; i += 1) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const jitterX = x + randBetween(-cfg.spreadMinVw, cfg.spreadMinVw) * (rect.width / 100);
      const jitterY = y + randBetween(-2, 4);
      spawnParticle(jitterX, jitterY, emoji, false);
    }
  }

  return {
    perform(clientX, clientY, options = {}) {
      const points = options.points ?? pickPoints();
      if (options.vibrate !== false) vibrate();
      if (options.squash !== false) squash();
      burst(clientX, clientY, points, options);
      return points;
    },
  };
}
