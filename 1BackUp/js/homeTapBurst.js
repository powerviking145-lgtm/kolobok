import { CONFIG } from './config.js';

const SPARKS = ['✨', '⭐', '💫', '⚡', '✦'];

export function playTapBurstFx({ container, btn, food }) {
  const host = container || btn?.parentElement;
  if (!host || !btn || !food) return Promise.resolve();

  const scfg = CONFIG.homeFoods.tapBurst ?? {};
  const isBad = food.kind === 'bad';
  const hostRect = host.getBoundingClientRect();
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2 - hostRect.left;
  const cy = rect.top + rect.height / 2 - hostRect.top;
  const fontSize = window.getComputedStyle(btn).fontSize || '2rem';

  btn.style.visibility = 'hidden';
  btn.style.pointerEvents = 'none';

  const fx = document.createElement('div');
  fx.className = `home-spawn-pop-fx${isBad ? ' home-spawn-pop-fx--bad' : ' home-spawn-pop-fx--good'}`;
  fx.style.left = `${(cx / hostRect.width) * 100}%`;
  fx.style.top = `${(cy / hostRect.height) * 100}%`;
  fx.style.setProperty('--burst-emoji-size', fontSize);

  const ring = document.createElement('span');
  ring.className = 'home-spawn-pop-fx__ring';
  ring.setAttribute('aria-hidden', 'true');

  const core = document.createElement('span');
  core.className = 'home-spawn-pop-fx__core';
  core.textContent = food.emoji;

  const crumbCount = scfg.particleCount ?? (isBad ? 7 : 9);
  const crumbs = [];
  for (let i = 0; i < crumbCount; i += 1) {
    const crumb = document.createElement('span');
    crumb.className = 'home-spawn-pop-fx__crumb';
    const useEmoji = i < 4 || Math.random() > 0.45;
    crumb.textContent = useEmoji ? food.emoji : SPARKS[i % SPARKS.length];
    const angle = (i / crumbCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
    const dist = (scfg.particleDistMin ?? 1.6) + Math.random() * (scfg.particleDistMax ?? 2.4);
    crumb.style.setProperty('--burst-x', `${Math.cos(angle) * dist}rem`);
    crumb.style.setProperty('--burst-y', `${Math.sin(angle) * dist}rem`);
    crumb.style.setProperty('--burst-rot', `${(Math.random() - 0.5) * 280}deg`);
    crumb.style.setProperty('--burst-delay', `${i * 18}ms`);
    crumbs.push(crumb);
  }

  fx.append(ring, core, ...crumbs);
  host.appendChild(fx);

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      fx.classList.add('is-active');
    });
    window.setTimeout(() => {
      fx.remove();
      resolve();
    }, scfg.ms ?? 460);
  });
}

export function spawnTapGhostFly({ container, stage, kolobokEl, food, clientX, clientY }) {
  const host = container;
  const scfg = CONFIG.homeFoods.tapBurst ?? {};
  if (!host || !stage || !kolobokEl || !food) return Promise.resolve();

  const hostRect = host.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const kolRect = kolobokEl.getBoundingClientRect();

  const startX = clientX - hostRect.left;
  const startY = clientY - hostRect.top;
  const endX = kolRect.left + kolRect.width * 0.42 - hostRect.left;
  const endY = kolRect.top + kolRect.height * 0.35 - hostRect.top;
  const dx = endX - startX;
  const dy = endY - startY;

  const ghost = document.createElement('span');
  ghost.className = 'home-spawn-ghost-fly';
  ghost.textContent = food.emoji;
  ghost.style.left = `${(startX / hostRect.width) * 100}%`;
  ghost.style.top = `${(startY / hostRect.height) * 100}%`;
  ghost.style.setProperty('--fly-dx', `${dx}px`);
  ghost.style.setProperty('--fly-dy', `${dy}px`);
  host.appendChild(ghost);

  requestAnimationFrame(() => ghost.classList.add('is-active'));

  const flyMs = scfg.ghostFlyMs ?? 280;
  return new Promise((resolve) => {
    window.setTimeout(() => {
      ghost.remove();
      resolve();
    }, flyMs);
  });
}
