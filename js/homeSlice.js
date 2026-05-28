import { CONFIG } from './config.js';

function distPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return Math.hypot(px - nx, py - ny);
}

function getSpawnHitRadius(btn, padding) {
  const rect = btn.getBoundingClientRect();
  return Math.max(rect.width, rect.height) * 0.42 + padding;
}

export function findSpawnsOnSlice(container, x1, y1, x2, y2) {
  if (!container) return [];
  const pad = CONFIG.homeFoods.slice?.hitPaddingPx ?? 10;
  const hits = [];

  container.querySelectorAll('.home-spawn:not(.is-collected):not(.home-spawn--flying)').forEach((btn) => {
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = getSpawnHitRadius(btn, pad);
    if (distPointToSegment(cx, cy, x1, y1, x2, y2) <= r) {
      hits.push(btn);
    }
  });

  return hits;
}

function collectHitsOnSegment(container, x1, y1, x2, y2) {
  const scfg = CONFIG.homeFoods.slice ?? {};
  const step = scfg.sliceStepPx ?? 12;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const found = new Set();

  if (len < 1) {
    findSpawnsOnSlice(container, x1, y1, x2, y2).forEach((btn) => found.add(btn));
    return [...found];
  }

  const steps = Math.max(1, Math.ceil(len / step));
  let px = x1;
  let py = y1;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const nx = x1 + (x2 - x1) * t;
    const ny = y1 + (y2 - y1) * t;
    findSpawnsOnSlice(container, px, py, nx, ny).forEach((btn) => found.add(btn));
    px = nx;
    py = ny;
  }

  return [...found];
}

export function playSliceFx({ container, btn, food, angleRad }) {
  const scfg = CONFIG.homeFoods.slice ?? {};
  const host = container || btn.parentElement;
  if (!host || !btn) return Promise.resolve();

  const hostRect = host.getBoundingClientRect();
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2 - hostRect.left;
  const cy = rect.top + rect.height / 2 - hostRect.top;
  const deg = (angleRad * 180) / Math.PI;
  const fontSize = window.getComputedStyle(btn).fontSize || '2rem';

  btn.style.visibility = 'hidden';
  btn.style.pointerEvents = 'none';

  const fx = document.createElement('div');
  fx.className = `home-spawn-slice-fx${food.kind === 'bad' ? ' home-spawn-slice-fx--bad' : ''}`;
  fx.style.left = `${(cx / hostRect.width) * 100}%`;
  fx.style.top = `${(cy / hostRect.height) * 100}%`;
  fx.style.setProperty('--slice-angle', `${deg}deg`);
  fx.style.setProperty('--slice-emoji-size', fontSize);

  const halfA = document.createElement('span');
  halfA.className = 'home-spawn-slice-fx__half home-spawn-slice-fx__half--a';
  halfA.textContent = food.emoji;
  const halfB = document.createElement('span');
  halfB.className = 'home-spawn-slice-fx__half home-spawn-slice-fx__half--b';
  halfB.textContent = food.emoji;

  fx.append(halfA, halfB);
  host.appendChild(fx);

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      fx.classList.add('is-active');
    });
    window.setTimeout(() => {
      fx.remove();
      resolve();
    }, scfg.fxMs ?? 480);
  });
}

/** Неполезное при взрыве (тап) — 4 «дольки» вместо бомбы */
export function playBadQuarterSliceFx({ container, btn, food, scaleMul = 1 }) {
  const scfg = CONFIG.homeFoods.slice ?? {};
  const host = container || btn?.parentElement;
  if (!host || !btn || !food) return Promise.resolve();

  const hostRect = host.getBoundingClientRect();
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2 - hostRect.left;
  const cy = rect.top + rect.height / 2 - hostRect.top;
  const fontSize = window.getComputedStyle(btn).fontSize || '2rem';
  const dist = 1.15 * scaleMul;

  btn.style.visibility = 'hidden';
  btn.style.pointerEvents = 'none';

  const root = document.createElement('div');
  root.className = 'home-spawn-quarter-fx home-spawn-quarter-fx--bad';
  root.style.left = `${(cx / hostRect.width) * 100}%`;
  root.style.top = `${(cy / hostRect.height) * 100}%`;
  root.style.setProperty('--slice-emoji-size', fontSize);
  root.style.setProperty('--q-dist', `${dist}rem`);

  [
    'home-spawn-quarter-fx__piece home-spawn-quarter-fx__piece--tl',
    'home-spawn-quarter-fx__piece home-spawn-quarter-fx__piece--tr',
    'home-spawn-quarter-fx__piece home-spawn-quarter-fx__piece--bl',
    'home-spawn-quarter-fx__piece home-spawn-quarter-fx__piece--br',
  ].forEach((className) => {
    const piece = document.createElement('span');
    piece.className = className;
    piece.textContent = food.emoji;
    root.appendChild(piece);
  });

  host.appendChild(root);

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      root.classList.add('is-active');
    });
    window.setTimeout(() => {
      root.remove();
      resolve();
    }, scfg.badQuarterFxMs ?? 520);
  });
}

export function bindHomeSliceInput({
  stage,
  container,
  isBlocked,
  getFoodFromBtn,
  onTap,
  onSlice,
  onEmptyTap,
}) {
  const scfg = CONFIG.homeFoods.slice ?? {};
  const target = stage || container;
  if (!target) return () => {};

  let active = false;
  let isBlade = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let downSpawn = null;
  let slicedSet = null;
  let trailCanvas = null;
  let trailCtx = null;
  let trailRafId = null;
  let trailFading = false;

  function stopTrailLoop() {
    if (trailRafId) {
      cancelAnimationFrame(trailRafId);
      trailRafId = null;
    }
  }

  function resizeTrailCanvas() {
    if (!trailCanvas || !trailCtx || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    trailCanvas.width = Math.round(rect.width * dpr);
    trailCanvas.height = Math.round(rect.height * dpr);
    trailCanvas.style.width = `${rect.width}px`;
    trailCanvas.style.height = `${rect.height}px`;
    trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function fadeTrailFrame() {
    if (!trailCtx || !stage) return;
    const rect = stage.getBoundingClientRect();
    trailCtx.save();
    trailCtx.globalCompositeOperation = 'destination-out';
    trailCtx.fillStyle = `rgba(0, 0, 0, ${scfg.trailFadeAlpha ?? 0.18})`;
    trailCtx.fillRect(0, 0, rect.width, rect.height);
    trailCtx.restore();
  }

  function drawTrailSegment(x1, y1, x2, y2) {
    if (!trailCtx || !stage) return;
    const rect = stage.getBoundingClientRect();
    const lx1 = x1 - rect.left;
    const ly1 = y1 - rect.top;
    const lx2 = x2 - rect.left;
    const ly2 = y2 - rect.top;

    trailCtx.save();
    trailCtx.strokeStyle = scfg.trailColor ?? 'rgba(255, 245, 220, 0.92)';
    trailCtx.lineWidth = scfg.trailWidth ?? 2.5;
    trailCtx.lineCap = 'round';
    trailCtx.lineJoin = 'round';
    trailCtx.shadowColor = 'rgba(255, 200, 90, 0.55)';
    trailCtx.shadowBlur = scfg.trailGlowBlur ?? 3;
    trailCtx.beginPath();
    trailCtx.moveTo(lx1, ly1);
    trailCtx.lineTo(lx2, ly2);
    trailCtx.stroke();
    trailCtx.restore();
  }

  function trailLoopTick() {
    if (trailCtx && (isBlade || trailFading)) {
      fadeTrailFrame();
    }
    if (isBlade || trailFading) {
      trailRafId = requestAnimationFrame(trailLoopTick);
    } else {
      trailRafId = null;
    }
  }

  function startTrailLoop() {
    if (trailRafId) return;
    trailRafId = requestAnimationFrame(trailLoopTick);
  }

  function clearTrail(immediate = false) {
    stopTrailLoop();
    trailFading = false;

    if (!trailCanvas) return;

    if (immediate) {
      trailCanvas.remove();
      trailCanvas = null;
      trailCtx = null;
      return;
    }

    trailFading = true;
    let frames = 0;
    const maxFrames = Math.ceil((scfg.trailFadeMs ?? 380) / 16);

    const fadeOut = () => {
      fadeTrailFrame();
      frames += 1;
      if (frames < maxFrames) {
        trailRafId = requestAnimationFrame(fadeOut);
      } else {
        trailCanvas?.remove();
        trailCanvas = null;
        trailCtx = null;
        trailRafId = null;
        trailFading = false;
      }
    };
    trailRafId = requestAnimationFrame(fadeOut);
  }

  function ensureTrail() {
    if (!stage || trailCanvas) return;
    trailCanvas = document.createElement('canvas');
    trailCanvas.className = 'home-slice-blade-canvas';
    trailCanvas.setAttribute('aria-hidden', 'true');
    stage.appendChild(trailCanvas);
    trailCtx = trailCanvas.getContext('2d');
    resizeTrailCanvas();
    startTrailLoop();
  }

  function processMoveSegment(x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const hits = collectHitsOnSegment(container, x1, y1, x2, y2);

    hits.forEach((btn) => {
      if (slicedSet.has(btn)) return;
      slicedSet.add(btn);
      const food = getFoodFromBtn(btn);
      if (food) onSlice(btn, food, angle, midX, midY);
    });
  }

  function shouldIgnoreSliceTarget(target) {
    if (!target?.closest) return false;
    return !!target.closest(
      '#nutrition-tip, .tutorial-card, #tutorial-overlay, #tutorial-spotlight, #food-photo-modal.is-open, #footer-buttons, #stats-panel .icon-btn, .menu-sheet, .exit-modal, #shop-upgrade-hint, #shop-screen, .shop-tutorial, #purchase-layer:not([hidden])'
    );
  }

  function onPointerDown(e) {
    if (isBlocked?.()) return;
    if (e.button > 0) return;
    if (shouldIgnoreSliceTarget(e.target)) return;

    clearTrail(true);
    downSpawn = e.target.closest?.('.home-spawn') || null;
    slicedSet = new Set();
    isBlade = false;
    active = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;

    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (e.pointerType === 'touch') {
      e.preventDefault();
    }
  }

  function onPointerMove(e) {
    if (!active || e.pointerId !== pointerId) return;

    const x = e.clientX;
    const y = e.clientY;
    const segLen = Math.hypot(x - lastX, y - lastY);
    const minSeg = scfg.minSegmentPx ?? 4;

    if (segLen < minSeg) return;

    const totalFromStart = Math.hypot(x - startX, y - startY);
    const minDraw = scfg.minDrawPx ?? 8;

    if (!isBlade && totalFromStart < minDraw) return;

    if (!isBlade) {
      isBlade = true;
      trailFading = false;
      ensureTrail();
      drawTrailSegment(startX, startY, startX, startY);
      e.preventDefault();
    }

    e.preventDefault();
    processMoveSegment(lastX, lastY, x, y);
    drawTrailSegment(lastX, lastY, x, y);
    lastX = x;
    lastY = y;
  }

  function finishPointer(e) {
    if (!active || e.pointerId !== pointerId) return;
    active = false;

    try {
      target.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const tapSlop = scfg.tapMaxMovePx ?? 14;
    const totalLen = Math.hypot(lastX - startX, lastY - startY);

    if (!isBlade && totalLen <= tapSlop && downSpawn && container?.contains(downSpawn)) {
      if (
        !downSpawn.classList.contains('is-collected') &&
        !downSpawn.classList.contains('home-spawn--flying')
      ) {
        const food = getFoodFromBtn(downSpawn);
        if (food) onTap(downSpawn, food, e.clientX, e.clientY);
      }
      clearTrail(true);
    } else if (!isBlade && totalLen <= tapSlop) {
      onEmptyTap?.(e.clientX, e.clientY);
      clearTrail(true);
    } else if (isBlade) {
      clearTrail(false);
    } else {
      clearTrail(true);
    }

    downSpawn = null;
    slicedSet = null;
    isBlade = false;
  }

  const opts = { capture: true, passive: false };

  target.addEventListener('pointerdown', onPointerDown, opts);
  target.addEventListener('pointermove', onPointerMove, opts);
  target.addEventListener('pointerup', finishPointer, opts);
  target.addEventListener('pointercancel', finishPointer, opts);

  return () => {
    target.removeEventListener('pointerdown', onPointerDown, opts);
    target.removeEventListener('pointermove', onPointerMove, opts);
    target.removeEventListener('pointerup', finishPointer, opts);
    target.removeEventListener('pointercancel', finishPointer, opts);
    clearTrail(true);
  };
}
