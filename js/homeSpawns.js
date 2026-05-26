import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { bindHomeSliceInput, playSliceFx, playBadQuarterSliceFx } from './homeSlice.js';
import { playTapBurstFx } from './homeTapBurst.js';
import { vibrate, pickFoodHaptic } from './homeUi.js';

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
  { left: 10, top: 18 },
  { left: 88, top: 20 },
  { left: 22, top: 32 },
  { left: 76, top: 34 },
  { left: 14, top: 52 },
  { left: 82, top: 54 },
  { left: 36, top: 24 },
  { left: 64, top: 26 },
  { left: 30, top: 62 },
  { left: 70, top: 64 },
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

  function isTooCloseToOthers(left, top, extra = [], gapScale = 1) {
    const minDist = getMinCenterDistance() * gapScale;
    const others = [...positions, ...extra];
    return others.some((p) => Math.hypot(p.left - left, p.top - top) < minDist);
  }

  function shuffleSlots(slots) {
    const copy = slots.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getUsableSlots() {
    return START_SLOTS.filter((s) => !isInForbiddenZone(s.left, s.top));
  }

  function takeSlotFromPool(pool, gapScale = 1) {
    while (pool.length) {
      const slot = pool.shift();
      if (isTooCloseToOthers(slot.left, slot.top, [], gapScale)) continue;
      positions.push({ left: slot.left, top: slot.top });
      return { left: slot.left, top: slot.top };
    }
    return null;
  }

  function appendSpawn(food, pos, extraClass = '') {
    const btn = createFoodButton(food, pos.left, pos.top);
    if (extraClass) btn.classList.add(extraClass);
    container.appendChild(btn);
    return btn;
  }

  function foodFromCartItem(item) {
    const template = foods.find((f) => f.id === item.id);
    return template
      ? { ...template }
      : {
          id: item.id,
          emoji: item.emoji,
          name: item.name,
          kind: 'good',
          points: 8,
        };
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

  function getSpawnCenterPx(btn, hostRect) {
    const rect = btn.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - hostRect.left,
      y: rect.top + rect.height / 2 - hostRect.top,
      half: Math.max(rect.width, rect.height) / 2,
    };
  }

  function findBlastTargets(originBtn) {
    if (!container || !originBtn) return [originBtn];
    const hostRect = container.getBoundingClientRect();
    if (!hostRect.width || !hostRect.height) return [originBtn];

    const origin = getSpawnCenterPx(originBtn, hostRect);
    const touchPad = cfg.tapBlast?.touchPaddingPx ?? 4;
    const touchMul = cfg.tapBlast?.touchRadiusMul ?? 1;

    const targets = [originBtn];
    container
      .querySelectorAll('.home-spawn:not(.is-collected):not(.home-spawn--flying)')
      .forEach((btn) => {
        if (btn === originBtn) return;
        const c = getSpawnCenterPx(btn, hostRect);
        const centerDist = Math.hypot(c.x - origin.x, c.y - origin.y);
        const touchLimit = (origin.half + c.half + touchPad) * touchMul;
        if (centerDist <= touchLimit) {
          targets.push(btn);
        }
      });
    return targets;
  }

  async function handleTapBlast(originBtn, food, clientX, clientY) {
    if (
      originBtn.classList.contains('is-collected') ||
      originBtn.classList.contains('home-spawn--flying')
    ) {
      return;
    }

    const targets = findBlastTargets(originBtn).filter(
      (btn) =>
        btn.isConnected &&
        !btn.classList.contains('is-collected') &&
        !btn.classList.contains('home-spawn--flying')
    );
    if (!targets.length) return;

    const hasBad = targets.some((btn) => isBadFood(getFoodFromBtn(btn)));
    if (hasBad && onBeforeBadCollect) {
      await onBeforeBadCollect({ food, clientX, clientY, sliced: false });
    }

    vibrate(pickFoodHaptic('tapBlast', { blastCount: targets.length }));

    targets.forEach((btn) => markCollected(btn));

    const mainScale = cfg.tapBlast?.visualScale ?? 2;
    const secondaryScale = cfg.tapBlast?.secondaryVisualScale ?? 1.25;

    if (targets.length > 1) {
      stage?.classList.add('home-stage--bomb-shake');
      window.setTimeout(
        () => stage?.classList.remove('home-stage--bomb-shake'),
        cfg.tapBlast?.waveShakeMs ?? 420
      );
    }

    await Promise.all(
      targets.map((btn) => {
        const f = getFoodFromBtn(btn) || food;
        const scaleMul = btn === originBtn ? mainScale : secondaryScale;
        if (isBadFood(f)) {
          return playBadQuarterSliceFx({ container, btn, food: f, scaleMul });
        }
        return playTapBurstFx({ container, btn, food: f });
      })
    );

    let blastEatAnim = false;
    targets.forEach((btn) => {
      const f = getFoodFromBtn(btn);
      if (!f) return;
      const isGood = f.kind !== 'bad';
      const doEat = isGood && !blastEatAnim;
      if (doEat) blastEatAnim = true;
      btn.classList.add('home-spawn--tap-pop');
      onCollect({
        food: f,
        clientX,
        clientY,
        element: btn,
        sliced: false,
        fromBlast: btn !== originBtn,
        skipHaptic: true,
        blastEatAnim: doEat,
      });
      removeSpawn(btn);
    });
  }

  async function dismissBadFood(btn, food, clientX, clientY, sliced, angleRad = 0) {
    if (!markCollected(btn)) return;
    if (onBeforeBadCollect) {
      await onBeforeBadCollect({ food, clientX, clientY, sliced });
    }
    btn.classList.add(sliced ? 'home-spawn--sliced' : 'home-spawn--tap-pop');
    if (sliced) {
      await playSliceFx({ container, btn, food, angleRad });
    } else {
      await playBadQuarterSliceFx({ container, btn, food });
    }
    onCollect({ food, clientX, clientY, element: btn, sliced });
    removeSpawn(btn);
  }

  function handleTap(btn, food, clientX, clientY) {
    handleTapBlast(btn, food, clientX, clientY);
  }

  async function handleSlice(btn, food, angle, clientX, clientY) {
    if (isBadFood(food)) {
      vibrate(pickFoodHaptic('sliceBad'));
      await dismissBadFood(btn, food, clientX, clientY, true, angle);
      return;
    }
    if (!markCollected(btn)) return;
    vibrate(pickFoodHaptic('slice'));
    btn.classList.add('home-spawn--sliced');
    await playSliceFx({ container, btn, food, angleRad: angle });
    onCollect({
      food,
      clientX,
      clientY,
      element: btn,
      sliced: true,
      skipHaptic: true,
    });
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

  }

  function createFoodButton(food, left, top) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `home-spawn is-ready ${getFoodGlowClass(food)}`;
    btn.textContent = food.emoji;
    const hint = isBadFood(food)
      ? 'Неполезное: тап — взрыв рядом (0 очков), свайп — убрать'
      : 'Тап — взрыв рядом, свайп — порезать';
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

    const onScreen = countOnScreen(container);
    const min = Math.min(cfg.minOnScreen ?? 5, getMaxOnScreen(cfg));
    const mustFillMin = onScreen < min;
    if (!force && !mustFillMin && isBlocked()) return;

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

  function trySpawnToMax(ignoreBlock = false) {
    if (!container) return;
    running = true;
    ensureSliceBindings();
    let guard = 0;
    const cap = getMaxOnScreen(cfg);
    while (countOnScreen(container) < cap && guard < cap * 3) {
      if (!ignoreBlock && isBlocked()) break;
      const pos = pickPosition();
      if (!pos) break;
      const food = pickFood(foods);
      const btn = createFoodButton(food, pos.left, pos.top);
      container.appendChild(btn);
      guard += 1;
    }
  }

  function ensureSpawnLoop() {
    if (!running || !container) return;
    if (spawnTimerId) {
      window.clearTimeout(spawnTimerId);
      spawnTimerId = null;
    }
    const min = Math.min(cfg.minOnScreen ?? 5, getMaxOnScreen(cfg));
    if (countOnScreen(container) < min) {
      spawnOne(true);
    }
    scheduleNext();
  }

  /** Полный респавн после кормления — слоты + добивка, без isBlocked. */
  function repopulate(cartItems = []) {
    if (!container) return;
    if (spawnTimerId) {
      window.clearTimeout(spawnTimerId);
      spawnTimerId = null;
    }
    running = true;
    ensureSliceBindings();
    container.replaceChildren();
    clearPositions();

    const cap = getMaxOnScreen(cfg);
    const minTarget = Math.min(cfg.minOnScreen ?? 5, cap);
    let slotPool = shuffleSlots(getUsableSlots());

    cartItems.slice(0, 5).forEach((item) => {
      const pos = takeSlotFromPool(slotPool, 1) || pickPosition();
      if (!pos) return;
      appendSpawn(foodFromCartItem(item), pos, 'cart-spawn');
    });

    let guard = 0;
    while (countOnScreen(container) < cap && guard < cap * 8) {
      const pos =
        takeSlotFromPool(slotPool, 1) ||
        takeSlotFromPool(shuffleSlots(getUsableSlots()), 0.55) ||
        pickPosition();
      if (!pos) break;
      appendSpawn(pickFood(foods), pos);
      guard += 1;
    }

    if (countOnScreen(container) < minTarget) {
      getUsableSlots().forEach((slot) => {
        if (countOnScreen(container) >= minTarget) return;
        if (positions.some((p) => p.left === slot.left && p.top === slot.top)) return;
        positions.push({ left: slot.left, top: slot.top });
        appendSpawn(pickFood(foods), slot);
      });
    }

    ensureSpawnLoop();
  }

  /** Добить экран до min/max без очистки (после кулдауна / если респавн не добрал). */
  function topUp(ignoreBlock = true) {
    if (!container) return;
    running = true;
    ensureSliceBindings();
    ensureMinSpawns(ignoreBlock);
    trySpawnToMax(ignoreBlock);
    ensureSpawnLoop();
  }

  return {
    fillToMinimum() {
      ensureMinSpawns(true);
    },

    trySpawnToMax,
    repopulate,
    topUp,
    ensureSpawnLoop,

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
