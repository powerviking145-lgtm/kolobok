import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { bindHomeSliceInput, playSliceFx } from './homeSlice.js';
import { playTapBurstFx, spawnTapGhostFly } from './homeTapBurst.js';
import { playBadTapFx } from './homeBadFx.js';

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickFood(foods) {
  const badPool = foods.filter((f) => f.kind === 'bad');
  const neutralPool = foods.filter((f) => f.kind === 'neutral');
  const badChance = CONFIG.homeFoods.badSpawnChance ?? 0.28;
  const neutralChance = CONFIG.homeFoods.neutralSpawnChance ?? 0.32;
  const roll = Math.random();

  if (badPool.length && roll < badChance) {
    return badPool[Math.floor(Math.random() * badPool.length)];
  }
  if (neutralPool.length && roll < badChance + neutralChance) {
    return neutralPool[Math.floor(Math.random() * neutralPool.length)];
  }

  const goodPool = foods.filter((f) => f.kind === 'good');
  const pool = goodPool.length ? goodPool : foods;
  const bias = CONFIG.homeFoods.waterSpawnBias ?? 0;
  const thirstPool = pool.filter((f) => f.thirstPriority);
  if (thirstPool.length && Math.random() < bias) {
    return thirstPool[Math.floor(Math.random() * thirstPool.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function countOnScreen(container) {
  return container.querySelectorAll(
    '.home-spawn:not(.home-spawn--flying):not(.is-collected)'
  ).length;
}

function getFoodGlowClass(food) {
  if (food.kind === 'bad') return 'home-spawn--bad';
  if (food.kind === 'good') return 'home-spawn--good';
  if (food.kind === 'neutral') return 'home-spawn--neutral';
  return 'home-spawn--neutral';
}

function getMaxOnScreen(cfg) {
  const dyn = cfg.dynamicMax ?? {};
  const base = dyn.base ?? cfg.minOnScreen ?? 4;
  const cap = dyn.cap ?? cfg.maxOnScreen ?? 12;
  const every = dyn.everyInteractions ?? 5;
  const plus = dyn.plusPerStep ?? 1;
  const count = gameState.getFoodInteractCount?.() ?? 0;
  const bonus = Math.floor(count / every) * plus;
  return Math.min(cap, base + bonus);
}

function isBadFood(food) {
  return food?.kind === 'bad';
}

const START_SLOTS = [
  { left: 14, top: 20 },
  { left: 84, top: 24 },
  { left: 50, top: 14 },
  { left: 18, top: 48 },
  { left: 78, top: 50 },
  { left: 42, top: 36 },
  { left: 62, top: 58 },
];

export function createHomeSpawns({
  container,
  stage,
  kolobokEl,
  isBlocked,
  isSliceBlocked = isBlocked,
  onCollect,
  onBeforeBadCollect,
  onEmptyTap,
}) {
  const cfg = CONFIG.homeFoods;
  const foods = cfg.list;
  const foodById = new Map(foods.map((f) => [f.id, f]));
  let running = false;
  let spawnTimerId = null;
  let unbindSlice = null;
  const positions = [];
  const expireByBtn = new WeakMap();

  function clearPositions() {
    positions.length = 0;
  }

  function syncPositionsFromDom() {
    positions.length = 0;
    if (!container) return;
    container
      .querySelectorAll('.home-spawn:not(.is-collected):not(.home-spawn--flying)')
      .forEach((btn) => {
        const left = parseFloat(btn.dataset.left);
        const top = parseFloat(btn.dataset.top);
        if (!Number.isNaN(left) && !Number.isNaN(top)) {
          positions.push({ left, top });
        }
      });
  }

  function getMinCenterDistance() {
    const r = cfg.spawnRadiusPercent ?? 8.5;
    const touch = cfg.maxOverlapPercent ?? 2.5;
    const gap = cfg.minCenterGapPercent ?? 19;
    return Math.max(gap, r * 2 - touch);
  }

  function isTooCloseToOthers(left, top, extra = []) {
    const minDist = getMinCenterDistance();
    const others = [...positions, ...extra];
    return others.some((p) => Math.hypot(p.left - left, p.top - top) < minDist);
  }

  function getFoodFromBtn(btn) {
    return btn?._homeFood || foodById.get(btn?.dataset.foodId);
  }

  function isInForbiddenZone(left, top) {
    const f = cfg.forbiddenZone;
    return left >= f.leftMin && left <= f.leftMax && top >= f.topMin && top <= f.topMax;
  }

  function pickPosition() {
    syncPositionsFromDom();
    const m = cfg.marginPercent;
    const max = 100 - m;
    const attempts = cfg.positionAttempts ?? 32;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const left = randBetween(m, max);
      const top = randBetween(m, max);
      if (isInForbiddenZone(left, top)) continue;
      if (isTooCloseToOthers(left, top)) continue;
      positions.push({ left, top });
      return { left, top };
    }

    for (const slot of START_SLOTS) {
      if (isInForbiddenZone(slot.left, slot.top)) continue;
      if (isTooCloseToOthers(slot.left, slot.top)) continue;
      positions.push({ left: slot.left, top: slot.top });
      return { left: slot.left, top: slot.top };
    }

    return null;
  }

  function removePosition(el) {
    const left = parseFloat(el.dataset.left);
    const top = parseFloat(el.dataset.top);
    const idx = positions.findIndex((p) => p.left === left && p.top === top);
    if (idx >= 0) positions.splice(idx, 1);
  }

  function removeSpawn(el) {
    if (!el?.isConnected) return;
    const expireId = expireByBtn.get(el);
    if (expireId) window.clearTimeout(expireId);
    removePosition(el);
    el.remove();
  }

  function clearExpire(btn) {
    const expireId = expireByBtn.get(btn);
    if (expireId) {
      window.clearTimeout(expireId);
      expireByBtn.delete(btn);
    }
  }

  function markCollected(btn) {
    if (!btn || btn.classList.contains('is-collected')) return false;
    clearExpire(btn);
    btn.classList.add('is-collected');
    return true;
  }

  async function flyToKolobok(btn, food, clientX, clientY) {
    btn.classList.add('home-spawn--tap-pop');

    const burstCfg = cfg.tapBurst ?? {};
    const burstPromise = playTapBurstFx({ container, btn, food });

    const ghostDelay = burstCfg.ghostDelayMs ?? 140;

    await burstPromise;

    await new Promise((resolve) => {
      window.setTimeout(resolve, ghostDelay);
    });

    onCollect({ food, clientX, clientY, element: btn, sliced: false });

    if (kolobokEl && stage) {
      await spawnTapGhostFly({
        container,
        stage,
        kolobokEl,
        food,
        clientX,
        clientY,
      });
    }

    removeSpawn(btn);
  }

  async function rejectBadFood(btn, food, clientX, clientY, sliced, angle = 0) {
    if (onBeforeBadCollect) {
      await onBeforeBadCollect({ food, clientX, clientY, sliced });
    }
    btn.classList.add(sliced ? 'home-spawn--sliced' : 'home-spawn--tap-pop');
    await playBadTapFx({ container, btn, food, stage });
    onCollect({ food, clientX, clientY, element: btn, sliced });
    removeSpawn(btn);
  }

  function handleTap(btn, food, clientX, clientY) {
    if (!markCollected(btn)) return;
    if (isBadFood(food)) {
      rejectBadFood(btn, food, clientX, clientY, false);
      return;
    }
    flyToKolobok(btn, food, clientX, clientY);
  }

  async function handleSlice(btn, food, angle, clientX, clientY) {
    if (!markCollected(btn)) return;
    if (isBadFood(food)) {
      await rejectBadFood(btn, food, clientX, clientY, true, angle);
      return;
    }
    btn.classList.add('home-spawn--sliced');
    await playSliceFx({ container, btn, food, angleRad: angle });
    onCollect({ food, clientX, clientY, element: btn, sliced: true });
    removeSpawn(btn);
  }

  function attachFoodButton(btn, food, expireMs = cfg.lifetimeMs ?? 8000) {
    btn._homeFood = food;
    if (expireMs > 0) {
      const expireId = window.setTimeout(() => {
        if (!btn.isConnected || btn.classList.contains('is-collected')) return;
        if (btn.classList.contains('tutorial-food')) return;
        btn.classList.add('is-expiring');
        window.setTimeout(() => removeSpawn(btn), cfg.expireFadeMs ?? 500);
      }, expireMs);
      expireByBtn.set(btn, expireId);
    }

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (
        btn.classList.contains('is-collected') ||
        btn.classList.contains('home-spawn--flying')
      ) {
        return;
      }
      handleTap(btn, food, e.clientX, e.clientY);
    });
  }

  function createFoodButton(food, left, top) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `home-spawn is-ready ${getFoodGlowClass(food)}`;
    btn.textContent = food.emoji;
    const hint = isBadFood(food)
      ? 'Неполезное: тап или свайп — −1 очко'
      : 'Тап — съесть, свайп — порезать';
    btn.setAttribute('aria-label', `${food.name}. ${hint}`);
    btn.dataset.left = String(left);
    btn.dataset.top = String(top);
    btn.dataset.foodId = food.id;
    btn.style.left = `${left}%`;
    btn.style.top = `${top}%`;
    attachFoodButton(btn, food);
    return btn;
  }

  function spawnOne(force = false) {
    if (!container) return;
    if (!force && isBlocked()) return;

    const onScreen = countOnScreen(container);
    if (onScreen >= getMaxOnScreen(cfg)) return;

    const pos = pickPosition();
    if (!pos) return;

    const food = pickFood(foods);
    const btn = createFoodButton(food, pos.left, pos.top);
    container.appendChild(btn);
  }

  function ensureMinSpawns(force = true) {
    const min = Math.min(cfg.minOnScreen ?? 5, getMaxOnScreen(cfg));
    let guard = 0;
    while (countOnScreen(container) < min && guard < min + 4) {
      if (!force && isBlocked()) break;
      const pos = pickPosition();
      if (!pos) break;
      const food = pickFood(foods);
      const btn = createFoodButton(food, pos.left, pos.top);
      container.appendChild(btn);
      guard += 1;
    }
  }

  function scheduleNext() {
    if (!running) return;
    const delay = randBetween(cfg.intervalMinMs, cfg.intervalMaxMs);
    spawnTimerId = window.setTimeout(() => {
      spawnTimerId = null;
      spawnOne(false);
      scheduleNext();
    }, delay);
  }

  function ensureSliceBindings() {
    if (unbindSlice) return;
    unbindSlice = bindHomeSliceInput({
      stage,
      container,
      isBlocked: isSliceBlocked,
      getFoodFromBtn,
      onTap: handleTap,
      onSlice: handleSlice,
      onEmptyTap,
    });
  }

  function trySpawnToMax() {
    if (!running || !container) return;
    let guard = 0;
    const cap = getMaxOnScreen(cfg);
    while (countOnScreen(container) < cap && guard < cap) {
      if (isBlocked()) break;
      spawnOne(true);
      guard += 1;
    }
  }

  return {
    fillToMinimum() {
      ensureMinSpawns(true);
    },

    trySpawnToMax,

    start() {
      if (!container) return;
      running = true;
      ensureSliceBindings();
      ensureMinSpawns(true);
      if (spawnTimerId) return;
      const delay = cfg.firstDelayMs ?? 800;
      spawnTimerId = window.setTimeout(() => {
        spawnTimerId = null;
        if (!running) return;
        spawnOne(false);
        scheduleNext();
      }, delay);
    },

    ensureMinOnScreen() {
      ensureMinSpawns(true);
    },

    stop() {
      running = false;
      if (spawnTimerId) {
        window.clearTimeout(spawnTimerId);
        spawnTimerId = null;
      }
      if (container) container.replaceChildren();
      clearPositions();
    },

    spawnCartItems(cartItems) {
      if (!container || !cartItems?.length) return;
      running = true;
      ensureSliceBindings();
      syncPositionsFromDom();
      cartItems.slice(0, 5).forEach((item) => {
        const pos = pickPosition();
        if (!pos) return;
        const template = foods.find((f) => f.id === item.id);
        const food = template
          ? { ...template }
          : {
              id: item.id,
              emoji: item.emoji,
              name: item.name,
              kind: 'good',
              points: 8,
            };
        const btn = createFoodButton(food, pos.left, pos.top);
        btn.classList.add('cart-spawn');
        container.appendChild(btn);
        positions.push(pos);
      });
      if (!spawnTimerId) scheduleNext();
    },

    spawnTutorialFood() {
      if (!container) return;
      running = true;
      ensureSliceBindings();
      container.querySelectorAll('.tutorial-food').forEach((el) => el.remove());
      const food = foods.find((f) => f.id === 'apple') || foods[0];
      const hint = CONFIG.tutorial.foodHint ?? 'тап или свайп';
      const btn = createFoodButton(food, 58, 38);
      clearExpire(btn);
      btn.classList.add('tutorial-food', 'tutorial-food--pulse');
      btn.replaceChildren();
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'tutorial-food__emoji';
      emojiSpan.setAttribute('aria-hidden', 'true');
      emojiSpan.textContent = food.emoji;
      const hintSpan = document.createElement('span');
      hintSpan.className = 'tutorial-food__hint';
      hintSpan.textContent = hint;
      btn.append(emojiSpan, hintSpan);
      btn.setAttribute('aria-label', `${food.name}. ${hint} — съесть`);
      container.appendChild(btn);
    },
  };
}
