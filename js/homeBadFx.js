import { CONFIG } from './config.js';

const DEBRIS = ['💥', '🔥', '💨', '✨', '⚡', '🟠', '🟡'];

function playBadBombFx({ container, btn, food, stage, scaleMul = 1 }) {
  const host = container || btn?.parentElement;
  if (!host || !btn || !food) return Promise.resolve();

  const bcfg = CONFIG.homeFoods?.badFx?.bomb ?? {};
  const hostRect = host.getBoundingClientRect();
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2 - hostRect.left;
  const cy = rect.top + rect.height / 2 - hostRect.top;
  const fontSize = window.getComputedStyle(btn).fontSize || '2rem';
  const px = (cx / hostRect.width) * 100;
  const py = (cy / hostRect.height) * 100;

  btn.style.visibility = 'hidden';
  btn.style.pointerEvents = 'none';

  stage?.classList.add('home-stage--bomb-shake');
  window.setTimeout(() => stage?.classList.remove('home-stage--bomb-shake'), bcfg.shakeMs ?? 420);

  const fx = document.createElement('div');
  fx.className = 'home-bomb-fx';
  if (scaleMul > 1) fx.classList.add('home-bomb-fx--wide');
  fx.style.left = `${px}%`;
  fx.style.top = `${py}%`;
  fx.style.setProperty('--bomb-emoji-size', fontSize);
  fx.style.setProperty('--bomb-scale', String(scaleMul));

  const flash = document.createElement('span');
  flash.className = 'home-bomb-fx__flash';
  flash.setAttribute('aria-hidden', 'true');

  const core = document.createElement('span');
  core.className = 'home-bomb-fx__core';
  core.textContent = food.emoji;

  const bombIcon = document.createElement('span');
  bombIcon.className = 'home-bomb-fx__bomb';
  bombIcon.textContent = '💣';
  bombIcon.setAttribute('aria-hidden', 'true');

  const rings = [];
  const ringCount = bcfg.ringCount ?? 3;
  for (let i = 0; i < ringCount; i += 1) {
    const ring = document.createElement('span');
    ring.className = 'home-bomb-fx__ring';
    ring.style.setProperty('--ring-i', String(i));
    ring.setAttribute('aria-hidden', 'true');
    rings.push(ring);
  }

  const debris = [];
  const debrisCount = bcfg.debrisCount ?? 16;
  for (let i = 0; i < debrisCount; i += 1) {
    const p = document.createElement('span');
    p.className = 'home-bomb-fx__debris';
    p.textContent = i < 4 ? food.emoji : DEBRIS[i % DEBRIS.length];
    const angle = (i / debrisCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const distMul = scaleMul > 1 ? scaleMul : 1;
    const dist =
      ((bcfg.debrisDistMin ?? 2.2) + Math.random() * (bcfg.debrisDistMax ?? 3.6)) * distMul;
    p.style.setProperty('--bx', `${Math.cos(angle) * dist}rem`);
    p.style.setProperty('--by', `${Math.sin(angle) * dist}rem`);
    p.style.setProperty('--brot', `${(Math.random() - 0.5) * 360}deg`);
    p.style.setProperty('--bdelay', `${i * 16}ms`);
    debris.push(p);
  }

  fx.append(flash, bombIcon, ...rings, core, ...debris);
  host.appendChild(fx);

  return new Promise((resolve) => {
    requestAnimationFrame(() => fx.classList.add('is-active'));
    window.setTimeout(() => {
      fx.remove();
      resolve();
    }, bcfg.ms ?? 780);
  });
}

export function playBadTapFx(opts) {
  const scaleMul = opts.scaleMul ?? CONFIG.homeFoods?.tapBlast?.visualScale ?? 1;
  return playBadBombFx({ ...opts, scaleMul });
}

export function playBadSliceFx(opts) {
  return playBadBombFx(opts);
}
