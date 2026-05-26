import { CONFIG } from './config.js';
import { eventBus } from './eventBus.js';

/** hunger = сытость (food), thirst = жажда (water) */
export const STAT_KEYS = ['hunger', 'thirst', 'health', 'mood'];

function statScaleMax() {
  return CONFIG.stats.max ?? 120;
}

function statBasePercent() {
  return CONFIG.stats.basePercent ?? CONFIG.stats.startPercent ?? CONFIG.stats.start ?? 40;
}

function statStartPercent() {
  return CONFIG.stats.startPercent ?? statBasePercent();
}

function statLevelCap() {
  return CONFIG.stats.levelCap ?? 80;
}

function legacyStatCap(level) {
  return (CONFIG.stats.base ?? 40) + Math.max(0, Math.min(statLevelCap(), level));
}

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Проценты → абсолют на шкале 0…120 */
export function percentToAbsolute(percent) {
  const scale = statScaleMax();
  return Math.round((Math.max(0, percent) / 100) * scale);
}

/** Потолок стата в %: 40 + level (прокачка +1% к max) */
export function getStatMaxPercent(statKey, src = state) {
  const level = getStatLevel(statKey, src);
  const pct = statBasePercent() + Math.max(0, Math.min(statLevelCap(), level));
  return Math.min(100, pct);
}

/** Абсолютный потолок (пункты на шкале 120) */
export function getStatMax(statKey, src = state) {
  return Math.min(statScaleMax(), percentToAbsolute(getStatMaxPercent(statKey, src)));
}

export function getStatCurrent(statKey, src = state) {
  return src.stats?.[statKey]?.current ?? percentToAbsolute(statStartPercent());
}

export function getStatLevel(statKey, src = state) {
  return src.stats?.[statKey]?.level ?? 0;
}

/** Отображаемый % на HUD (от шкалы 120, не от личного max) */
export function getStatDisplayPercentValue(current) {
  const scale = statScaleMax();
  const v = Math.max(0, Math.min(scale, current));
  return scale > 0 ? Math.round((v / scale) * 100) : 0;
}

export function getUpgradeCost(level) {
  const base = CONFIG.shop?.upgradeBaseCost ?? 100;
  const mul = CONFIG.shop?.upgradeCostMultiplier ?? 1.15;
  const lv = Math.max(0, Math.floor(level ?? 0));
  return Math.round(base * mul ** lv);
}

function clampStat(statKey, value, src = state) {
  const min = CONFIG.stats.min ?? 0;
  const max = getStatMax(statKey, src);
  return Math.max(min, Math.min(max, Math.round(value)));
}

function defaultStatEntry(current = null, level = 0) {
  const cur = current ?? percentToAbsolute(statStartPercent());
  return { current: cur, level: Math.max(0, Math.min(statLevelCap(), level)) };
}

function defaultStats() {
  return {
    hunger: defaultStatEntry(),
    thirst: defaultStatEntry(),
    health: defaultStatEntry(),
    mood: defaultStatEntry(),
  };
}

function defaultHouses() {
  const h = CONFIG.houses?.defaultActive ?? 'izba';
  return {
    owned: [...(CONFIG.houses?.starterOwned ?? ['izba'])],
    active: h,
  };
}

function defaultTutorials() {
  return {
    shopOpened: false,
    upgradeHintShown: false,
  };
}

function migrateStatsToPercentScale(target, savedVersion) {
  if (savedVersion >= 7) return;

  STAT_KEYS.forEach((key) => {
    const entry = target.stats[key];
    if (!entry) return;

    const level = entry.level ?? 0;
    const oldCap = legacyStatCap(level);
    const newCap = getStatMax(key, target);
    let cur = entry.current ?? percentToAbsolute(statStartPercent());

    if (cur >= oldCap - 1) {
      cur = newCap;
    } else if (level === 0 && cur === (CONFIG.stats.base ?? 40)) {
      cur = percentToAbsolute(statStartPercent());
    } else if (oldCap > 0) {
      cur = Math.round((cur / oldCap) * newCap);
    }

    entry.current = clampStat(key, cur, target);
  });
}

function ensureStatsShape(target) {
  if (!target.stats || typeof target.stats !== 'object') {
    target.stats = defaultStats();
  }
  STAT_KEYS.forEach((key) => {
    if (!target.stats[key] || typeof target.stats[key] !== 'object') {
      target.stats[key] = defaultStatEntry();
    }
    const entry = target.stats[key];
    entry.level = Math.max(0, Math.min(statLevelCap(), Math.floor(entry.level ?? 0)));
    entry.current = clampStat(key, entry.current ?? percentToAbsolute(statStartPercent()), target);
  });
}

function migrateFlatStats(saved, target) {
  const oldMax = CONFIG.stats.max ?? statScaleMax();

  STAT_KEYS.forEach((key) => {
    let current = percentToAbsolute(statStartPercent());
    let level = 0;

    if (saved.stats?.[key]?.current != null) {
      current = saved.stats[key].current;
      level = saved.stats[key].level ?? 0;
    } else if (saved[key] != null) {
      current = saved[key];
    }

    const wasLegacyFull = saved[key] === oldMax && oldMax > statBasePercent();
    if (wasLegacyFull) {
      current = percentToAbsolute(statStartPercent());
      level = 0;
    }

    target.stats[key] = defaultStatEntry(current, level);
  });

  ensureStatsShape(target);
}

export function normalizeState(raw = {}) {
  const savedVersion = raw.saveVersion ?? 0;
  const merged = {
    saveVersion: CONFIG.saveVersion,
    stars: 0,
    tapScore: 0,
    runScore: 0,
    stats: defaultStats(),
    houses: defaultHouses(),
    tutorials: defaultTutorials(),
    bestDistance: 0,
    bestScore: 0,
    kolobokName: null,
    pvpWins: 0,
    pvpLosses: 0,
    lastPlayed: Date.now(),
    badFoodTipDay: null,
    foodInteractCount: 0,
    cloud: {
      telegramId: null,
      telegramUsername: null,
      telegramFirstName: null,
    },
  };

  if (raw.stars != null) merged.stars = Math.max(0, Math.floor(raw.stars));
  if (raw.tapScore != null) merged.tapScore = Math.max(0, Math.floor(raw.tapScore));
  if (raw.runScore != null) merged.runScore = Math.max(0, Math.floor(raw.runScore));
  if (merged.stars === 0 && (merged.tapScore || merged.runScore)) {
    merged.stars = merged.tapScore + merged.runScore;
  }

  migrateFlatStats(raw, merged);
  migrateStatsToPercentScale(merged, savedVersion);

  if (raw.houses && typeof raw.houses === 'object') {
    const owned = Array.isArray(raw.houses.owned) ? raw.houses.owned : defaultHouses().owned;
    const active = raw.houses.active ?? defaultHouses().active;
    merged.houses = {
      owned: owned.includes('izba') ? owned : ['izba', ...owned],
      active: owned.includes(active) ? active : owned[0] ?? 'izba',
    };
  }

  if (raw.tutorials && typeof raw.tutorials === 'object') {
    merged.tutorials = {
      shopOpened: !!raw.tutorials.shopOpened,
      upgradeHintShown: !!raw.tutorials.upgradeHintShown,
    };
  }

  if (raw.bestDistance != null) merged.bestDistance = Math.max(0, Math.floor(raw.bestDistance));
  if (raw.bestScore != null) merged.bestScore = Math.max(0, Math.floor(raw.bestScore));
  if (raw.kolobokName != null && String(raw.kolobokName).trim()) {
    merged.kolobokName = String(raw.kolobokName).trim().slice(0, 32);
  }
  if (raw.pvpWins != null) merged.pvpWins = Math.max(0, Math.floor(raw.pvpWins));
  if (raw.pvpLosses != null) merged.pvpLosses = Math.max(0, Math.floor(raw.pvpLosses));
  if (raw.lastPlayed != null) merged.lastPlayed = raw.lastPlayed;
  if (raw.badFoodTipDay != null) merged.badFoodTipDay = raw.badFoodTipDay;
  if (raw.foodInteractCount != null) {
    merged.foodInteractCount = Math.max(0, Math.floor(raw.foodInteractCount));
  }

  return merged;
}

function createDefaultState() {
  return normalizeState({});
}

function migrateSave(saved) {
  return normalizeState(saved);
}

function flattenForUi(src = state) {
  const flat = {
    saveVersion: src.saveVersion,
    stars: src.stars ?? 0,
    tapScore: src.tapScore ?? 0,
    runScore: src.runScore ?? 0,
    stats: {},
    houses: { owned: [...src.houses.owned], active: src.houses.active },
    tutorials: { ...src.tutorials },
    bestDistance: src.bestDistance ?? 0,
    bestScore: src.bestScore ?? 0,
    lastPlayed: src.lastPlayed,
    badFoodTipDay: src.badFoodTipDay,
    foodInteractCount: src.foodInteractCount ?? 0,
  };

  STAT_KEYS.forEach((key) => {
    const current = getStatCurrent(key, src);
    flat.stats[key] = {
      ...src.stats[key],
      current,
      max: getStatMax(key, src),
      maxPercent: getStatMaxPercent(key, src),
      displayPercent: getStatDisplayPercentValue(current),
    };
    flat[key] = current;
  });

  return flat;
}

const STAT_DECAY_KEYS = STAT_KEYS;

function getHomeDecayPerTick() {
  const d = CONFIG.statDecay;
  const ms90 = 90 * 60 * 1000;
  const homeTickMs = d.tickMs * (d.homeSlowdown ?? 1);
  const refWeight = d.hunger ?? 1;
  const rates = {};
  STAT_DECAY_KEYS.forEach((key) => {
    const max = getStatMax(key, state);
    const basePer90 = ((d.displayPercentPer90Min ?? 1) / 100) * max;
    const weight = d[key] ?? 1;
    rates[key] = basePer90 * (weight / refWeight) * (homeTickMs / ms90);
  });
  return rates;
}

function ensureDecayRemainder() {
  if (!state._decayRemainder) {
    state._decayRemainder = { hunger: 0, thirst: 0, health: 0, mood: 0 };
  }
}

function applyDecayTick(multiplier = 1) {
  ensureDecayRemainder();
  const rates = getHomeDecayPerTick();
  let changed = false;

  STAT_DECAY_KEYS.forEach((key) => {
    state._decayRemainder[key] += rates[key] * multiplier;
    const drop = Math.floor(state._decayRemainder[key]);
    if (drop > 0) {
      state._decayRemainder[key] -= drop;
      state.stats[key].current = clampStat(key, state.stats[key].current - drop);
      changed = true;
    }
  });

  if (changed) emitChange();
}

let state = createDefaultState();

function emitChange() {
  eventBus.emit('state:changed', gameState.get());
}

function isStatKey(key) {
  return STAT_KEYS.includes(key);
}

export const gameState = {
  get() {
    return flattenForUi(state);
  },

  getRaw() {
    return JSON.parse(JSON.stringify(state));
  },

  getTotalScore() {
    if (state.stars != null) return state.stars;
    return (state.tapScore ?? 0) + (state.runScore ?? 0);
  },

  getStars() {
    return gameState.getTotalScore();
  },

  getStatMax(statKey) {
    return getStatMax(statKey, state);
  },

  getStatMaxPercent(statKey) {
    return getStatMaxPercent(statKey, state);
  },

  getStatDisplayPercent(statKey) {
    return getStatDisplayPercentValue(getStatCurrent(statKey, state));
  },

  fillStatToMax(statKey) {
    if (!isStatKey(statKey)) return;
    ensureStatsShape(state);
    state.stats[statKey].current = getStatMax(statKey, state);
    emitChange();
  },

  load() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) {
        state = createDefaultState();
        return false;
      }

      const saved = JSON.parse(raw);
      if (saved.saveVersion !== CONFIG.saveVersion) {
        state = migrateSave(saved);
        gameState.save();
        return true;
      }

      state = normalizeState(saved);
      return true;
    } catch {
      state = createDefaultState();
      return false;
    }
  },

  save() {
    state.saveVersion = CONFIG.saveVersion;
    state.lastPlayed = Date.now();
    const { _decayRemainder, cloud, ...payload } = state;
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(payload));
    eventBus.emit('state:saved', gameState.get());
  },

  resetProgress() {
    state = createDefaultState();
    gameState.save();
    emitChange();
    eventBus.emit('state:saved', gameState.get());
  },

  /** Полная зачистка localStorage + дефолтный стейт (имя, статы, дома). */
  resetAll() {
    try {
      localStorage.removeItem(CONFIG.storageKey);
      localStorage.removeItem('tutorialCompleted');
      localStorage.removeItem(CONFIG.feedCooldown?.storageKey ?? 'lastFeedTimestamp');
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    state = createDefaultState();
    gameState.save();
    emitChange();
    eventBus.emit('state:saved', gameState.get());
  },

  changeStat(key, delta) {
    if (!isStatKey(key)) return;
    ensureStatsShape(state);
    state.stats[key].current = clampStat(key, state.stats[key].current + delta);
    emitChange();
  },

  setStat(key, value) {
    if (!isStatKey(key)) return;
    ensureStatsShape(state);
    state.stats[key].current = clampStat(key, value);
    emitChange();
  },

  setStatLevel(key, level) {
    if (!isStatKey(key)) return;
    ensureStatsShape(state);
    const oldMax = getStatMax(key, state);
    state.stats[key].level = Math.max(0, Math.min(statLevelCap(), Math.floor(level)));
    const newMax = getStatMax(key, state);
    const maxGain = Math.max(0, newMax - oldMax);
    state.stats[key].current = clampStat(key, state.stats[key].current + maxGain);
    emitChange();
  },

  addStars(amount) {
    const a = Math.floor(amount);
    if (!a) return;
    state.stars = Math.max(0, (state.stars ?? 0) + a);
    emitChange();
  },

  spendStars(amount) {
    const a = Math.floor(amount);
    if (a <= 0) return true;
    if ((state.stars ?? 0) < a) return false;
    state.stars -= a;
    emitChange();
    return true;
  },

  addTapScore(amount) {
    const a = Math.floor(amount);
    if (!a) return;
    state.tapScore = Math.max(0, (state.tapScore ?? 0) + a);
    state.stars = Math.max(0, (state.stars ?? 0) + a);
    emitChange();
  },

  markBadFoodTipShown() {
    state.badFoodTipDay = todayKey();
    emitChange();
  },

  recordFoodInteraction() {
    state.foodInteractCount = Math.max(0, (state.foodInteractCount || 0) + 1);
    emitChange();
  },

  getFoodInteractCount() {
    return state.foodInteractCount || 0;
  },

  addRunScore(amount) {
    if (amount <= 0) return;
    const a = Math.floor(amount);
    state.runScore = (state.runScore ?? 0) + a;
    state.stars = Math.max(0, (state.stars ?? 0) + a);
    emitChange();
  },

  tickDecay() {
    applyDecayTick(1);
  },

  tickDecayRun(multiplier = CONFIG.statDecay.runMultiplier) {
    applyDecayTick(multiplier);
  },

  applyItem(effects) {
    Object.entries(effects).forEach(([key, delta]) => {
      if (isStatKey(key)) {
        state.stats[key].current = clampStat(key, state.stats[key].current + delta);
      }
    });
    emitChange();
  },

  updateBestDistance(meters) {
    const m = Math.floor(meters);
    if (m > state.bestDistance) {
      state.bestDistance = m;
      emitChange();
    }
  },

  updateBestScore(points) {
    const s = Math.floor(points);
    if (s > state.bestScore) {
      state.bestScore = s;
      emitChange();
    }
  },

  getHouses() {
    return { owned: [...state.houses.owned], active: state.houses.active };
  },

  setHouseActive(id) {
    if (!state.houses.owned.includes(id)) return false;
    state.houses.active = id;
    emitChange();
    return true;
  },

  buyHouse(id) {
    const def = CONFIG.houses?.list?.[id];
    if (!def || state.houses.owned.includes(id)) return false;
    const price = def.price ?? 0;
    if (price > 0 && !gameState.spendStars(price)) return false;
    state.houses.owned.push(id);
    emitChange();
    return true;
  },

  getUpgradeCost(statKey) {
    if (!isStatKey(statKey)) return 0;
    return getUpgradeCost(getStatLevel(statKey, state));
  },

  upgradeStat(statKey) {
    if (!isStatKey(statKey)) return false;
    ensureStatsShape(state);
    const level = getStatLevel(statKey, state);
    if (level >= statLevelCap()) return false;
    const cost = getUpgradeCost(level);
    if (!gameState.spendStars(cost)) return false;
    const oldMax = getStatMax(statKey, state);
    state.stats[statKey].level = level + 1;
    const newMax = getStatMax(statKey, state);
    const maxGain = newMax - oldMax;
    state.stats[statKey].current = clampStat(
      statKey,
      state.stats[statKey].current + maxGain
    );
    emitChange();
    return true;
  },

  getTutorials() {
    return { ...state.tutorials };
  },

  setTutorialFlag(key, value = true) {
    if (!state.tutorials || !(key in state.tutorials)) return;
    state.tutorials[key] = !!value;
    emitChange();
  },

  getKolobokName() {
    const n = state.kolobokName;
    return n && String(n).trim() ? String(n).trim() : null;
  },

  setKolobokName(name) {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) return;
    state.kolobokName = trimmed.slice(0, 32);
    emitChange();
  },

  setCloudIdentity({ telegramId, telegramUsername, telegramFirstName }) {
    if (!state.cloud) state.cloud = {};
    if (telegramId != null) state.cloud.telegramId = telegramId;
    if (telegramUsername != null) state.cloud.telegramUsername = telegramUsername;
    if (telegramFirstName != null) state.cloud.telegramFirstName = telegramFirstName;
  },

  importFromCloud(cloud = {}) {
    const raw = gameState.getRaw();
    const merged = normalizeState({
      ...raw,
      stars: cloud.stars ?? raw.stars,
      stats: cloud.stats ?? raw.stats,
      houses: cloud.houses ?? raw.houses,
      bestDistance: Math.max(raw.bestDistance ?? 0, cloud.bestDistance ?? 0),
      bestScore: Math.max(raw.bestScore ?? 0, cloud.bestScore ?? 0),
      kolobokName: cloud.kolobokName ?? raw.kolobokName,
      pvpWins: cloud.pvpWins ?? raw.pvpWins,
      pvpLosses: cloud.pvpLosses ?? raw.pvpLosses,
      tapScore: cloud.tapScore ?? raw.tapScore,
      runScore: cloud.runScore ?? raw.runScore,
    });
    state = merged;
    emitChange();
    gameState.save();
  },

  exportToCloud({ telegramId, feedCooldownUntil = 0 } = {}) {
    const raw = gameState.getRaw();
    return {
      telegramId: Number(telegramId),
      telegramUsername: state.cloud?.telegramUsername ?? null,
      telegramFirstName: state.cloud?.telegramFirstName ?? null,
      kolobokName: gameState.getKolobokName(),
      stars: raw.stars ?? 0,
      tapScore: raw.tapScore ?? 0,
      runScore: raw.runScore ?? 0,
      stats: raw.stats,
      houses: raw.houses,
      feedCooldownUntil: Number(feedCooldownUntil) || 0,
      pvpWins: raw.pvpWins ?? 0,
      pvpLosses: raw.pvpLosses ?? 0,
      bestDistance: raw.bestDistance ?? 0,
      bestScore: raw.bestScore ?? 0,
      saveVersion: CONFIG.saveVersion,
    };
  },
};
