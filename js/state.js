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

function defaultFeedLog() {
  return {
    dayKey: todayKey(),
    foodToday: 0,
    drinkToday: 0,
    totalToday: 0,
    lastType: null,
  };
}

function defaultTutorialMetrics() {
  return {
    tutorialToFirstFeedCompleteAt: null,
  };
}

function defaultDailyMissions(day = todayKey()) {
  return {
    dayKey: day,
    items: [],
    reward: Math.max(0, Math.floor(CONFIG.dailyMissions?.rewardStars ?? 120)),
    claimed: false,
  };
}

function seededShuffle(list, seedStr) {
  const arr = list.slice();
  let seed = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const rand = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeDailyMissions(raw) {
  const cfg = CONFIG.dailyMissions ?? {};
  const day = todayKey();
  const def = defaultDailyMissions(day);
  const src = raw && typeof raw === 'object' ? raw : {};

  const pickCount = Math.max(1, Math.floor(cfg.countPerDay ?? 3));
  const pool = Array.isArray(cfg.pool) ? cfg.pool : [];
  const rewardsByDifficulty = cfg.rewardsByDifficulty ?? {};
  const missionReward = (difficulty) => {
    const key = String(difficulty ?? 'medium');
    const mapped = Number(rewardsByDifficulty[key]);
    if (Number.isFinite(mapped) && mapped > 0) return Math.floor(mapped);
    return 0;
  };
  const calcReward = (items) => {
    const sum = items.reduce((acc, it) => acc + missionReward(it.difficulty), 0);
    if (sum > 0) return sum;
    return Math.max(0, Math.floor(cfg.rewardStars ?? def.reward));
  };
  const missionBucket = (m) => {
    if (m?.bucket) return String(m.bucket);
    const t = String(m?.type ?? '');
    if (t.startsWith('feed_')) return 'feed';
    if (t === 'runner_run' || t === 'tap_count' || t === 'swipe_count') return 'action';
    if (t === 'score_gain') return 'score';
    return 'other';
  };
  const toMission = (m) => ({
    id: String(m.id ?? `${m.type}-${m.target}`),
    type: String(m.type ?? 'feed_any'),
    difficulty: String(m.difficulty ?? 'medium'),
    label: String(m.label ?? 'Задание'),
    target: Math.max(1, Math.floor(m.target ?? 1)),
    progress: 0,
    done: false,
  });
  const buildItems = (seedDay, avoidIds = new Set()) => {
    const shuffled = seededShuffle(pool, seedDay);
    const byBucket = new Map();
    shuffled.forEach((m) => {
      const bucket = missionBucket(m);
      if (!byBucket.has(bucket)) byBucket.set(bucket, []);
      byBucket.get(bucket).push(m);
    });

    const preferredOrder = ['feed', 'action', 'score'];
    const picked = [];
    const pickFromBucket = (arr) => {
      if (!arr?.length) return null;
      const idx = arr.findIndex((m) => !avoidIds.has(String(m.id ?? '')));
      if (idx >= 0) return arr.splice(idx, 1)[0];
      return arr.shift();
    };
    preferredOrder.forEach((bucket) => {
      const arr = byBucket.get(bucket);
      if (arr?.length && picked.length < pickCount) {
        const mission = pickFromBucket(arr);
        if (mission) picked.push(mission);
      }
    });

    const rest = seededShuffle(
      shuffled.filter((m) => !picked.includes(m)),
      `${seedDay}-rest`
    );
    rest.sort((a, b) => {
      const aAvoid = avoidIds.has(String(a.id ?? '')) ? 1 : 0;
      const bAvoid = avoidIds.has(String(b.id ?? '')) ? 1 : 0;
      return aAvoid - bAvoid;
    });
    for (let i = 0; i < rest.length && picked.length < pickCount; i += 1) {
      picked.push(rest[i]);
    }

    return picked.map(toMission);
  };

  const baseItems = Array.isArray(src.items) ? src.items : [];
  const sameDay = src.dayKey === day;
  const previousIds = new Set(
    !sameDay && Array.isArray(src.items)
      ? src.items.map((it) => String(it?.id ?? '')).filter(Boolean)
      : []
  );

  const items = sameDay
    ? baseItems.map((it) => {
        const target = Math.max(1, Math.floor(it.target ?? 1));
        const progress = Math.max(0, Math.floor(it.progress ?? 0));
        return {
          id: String(it.id ?? `${it.type}-${target}`),
          type: String(it.type ?? 'feed_any'),
          difficulty: String(it.difficulty ?? 'medium'),
          label: String(it.label ?? 'Задание'),
          target,
          progress: Math.min(target, progress),
          done: progress >= target || !!it.done,
        };
      })
    : buildItems(day, previousIds);

  if (!items.length) {
    return { ...def, items: buildItems(day, previousIds) };
  }

  return {
    dayKey: day,
    items,
    reward: sameDay
      ? Math.max(0, Math.floor(src.reward ?? calcReward(items)))
      : calcReward(items),
    claimed: sameDay ? !!src.claimed : false,
  };
}

function dayKeyShift(daysAgo = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - Math.max(0, Math.floor(daysAgo)));
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function defaultFeedHistoryEntry(day = todayKey()) {
  return {
    dayKey: day,
    total: 0,
    food: 0,
    drink: 0,
    good: 0,
    neutral: 0,
    bad: 0,
  };
}

function normalizeFeedHistory(raw, keepDays = 14) {
  if (!Array.isArray(raw)) return [];
  const max = Math.max(3, Math.floor(keepDays));
  const byDay = new Map();

  raw.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const day = typeof entry.dayKey === 'string' ? entry.dayKey : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    const base = byDay.get(day) ?? defaultFeedHistoryEntry(day);
    base.total += Math.max(0, Math.floor(entry.total ?? 0));
    base.food += Math.max(0, Math.floor(entry.food ?? 0));
    base.drink += Math.max(0, Math.floor(entry.drink ?? 0));
    base.good += Math.max(0, Math.floor(entry.good ?? 0));
    base.neutral += Math.max(0, Math.floor(entry.neutral ?? 0));
    base.bad += Math.max(0, Math.floor(entry.bad ?? 0));
    byDay.set(day, base);
  });

  return [...byDay.values()]
    .sort((a, b) => String(b.dayKey).localeCompare(String(a.dayKey)))
    .slice(0, max);
}

function normalizeFeedLog(raw) {
  const def = defaultFeedLog();
  const src = raw && typeof raw === 'object' ? raw : {};
  const day = src.dayKey === def.dayKey ? src.dayKey : def.dayKey;
  return {
    dayKey: day,
    foodToday: day === def.dayKey ? Math.max(0, Math.floor(src.foodToday ?? 0)) : 0,
    drinkToday: day === def.dayKey ? Math.max(0, Math.floor(src.drinkToday ?? 0)) : 0,
    totalToday: day === def.dayKey ? Math.max(0, Math.floor(src.totalToday ?? 0)) : 0,
    lastType: src.lastType === 'food' || src.lastType === 'drink' ? src.lastType : null,
  };
}

function migrateStatsTo80Base(target, savedVersion) {
  if (savedVersion >= 8) return;
  bumpLegacy40StatsToStart(target);
}

/** Старые сейвы: 48/120 (=40% HUD) → старт 80%. Безопасно повторять. */
function bumpLegacy40StatsToStart(target) {
  const legacyAbs = percentToAbsolute(40);
  const newAbs = percentToAbsolute(statStartPercent());
  STAT_KEYS.forEach((key) => {
    const entry = target.stats?.[key];
    if (!entry || (entry.level ?? 0) > 0) return;
    const cur = entry.current ?? legacyAbs;
    if (cur === legacyAbs || cur === 40) {
      entry.current = clampStat(key, newAbs, target);
    }
  });
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
    bornAt: Date.now(),
    lastPlayed: Date.now(),
    badFoodTipDay: null,
    foodInteractCount: 0,
    feedLog: defaultFeedLog(),
    feedHistory: [],
    dailyMissions: defaultDailyMissions(),
    tutorialMetrics: defaultTutorialMetrics(),
    tutorialCompleted: false,
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
  migrateStatsTo80Base(merged, savedVersion);
  bumpLegacy40StatsToStart(merged);

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
  if (raw.bornAt != null) merged.bornAt = Number(raw.bornAt) || merged.bornAt;
  else if (raw.firstPlayed != null) merged.bornAt = Number(raw.firstPlayed) || merged.bornAt;
  else if (raw.lastPlayed != null) merged.bornAt = Number(raw.lastPlayed) || merged.bornAt;
  if (raw.lastPlayed != null) merged.lastPlayed = raw.lastPlayed;
  if (raw.badFoodTipDay != null) merged.badFoodTipDay = raw.badFoodTipDay;
  if (raw.foodInteractCount != null) {
    merged.foodInteractCount = Math.max(0, Math.floor(raw.foodInteractCount));
  }
  merged.feedLog = normalizeFeedLog(raw.feedLog);
  merged.feedHistory = normalizeFeedHistory(raw.feedHistory);
  merged.dailyMissions = normalizeDailyMissions(raw.dailyMissions);
  merged.tutorialMetrics = {
    ...defaultTutorialMetrics(),
    ...(raw.tutorialMetrics && typeof raw.tutorialMetrics === 'object' ? raw.tutorialMetrics : {}),
  };
  merged.tutorialCompleted = !!raw.tutorialCompleted;

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
    bornAt: src.bornAt ?? Date.now(),
    lastPlayed: src.lastPlayed,
    badFoodTipDay: src.badFoodTipDay,
    foodInteractCount: src.foodInteractCount ?? 0,
    feedLog: normalizeFeedLog(src.feedLog),
    feedHistory: normalizeFeedHistory(src.feedHistory),
    dailyMissions: normalizeDailyMissions(src.dailyMissions),
    tutorialMetrics:
      src.tutorialMetrics && typeof src.tutorialMetrics === 'object'
        ? { ...defaultTutorialMetrics(), ...src.tutorialMetrics }
        : defaultTutorialMetrics(),
    tutorialCompleted: !!src.tutorialCompleted,
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
  if (d.useFixedTickDecay) {
    const dropPct = d.fixedDropDisplayPercent ?? 1;
    const scale = statScaleMax();
    const perTick = (dropPct / 100) * scale;
    return {
      hunger: perTick,
      thirst: perTick,
      health: 0,
      mood: 0,
    };
  }
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

function getHomeDecayTickMs() {
  const d = CONFIG.statDecay ?? {};
  if (d.useFixedTickDecay) {
    return Math.max(500, Math.round(d.fixedTickMs ?? 2500));
  }
  return Math.max(1000, Math.round((d.tickMs ?? 10000) * (d.homeSlowdown ?? 1)));
}

function ensureDecayRemainder() {
  if (!state._decayRemainder) {
    state._decayRemainder = { hunger: 0, thirst: 0, health: 0, mood: 0 };
  }
}

function ensureHealthHybridRuntime() {
  if (!state._healthHybridRuntime) {
    state._healthHybridRuntime = {
      lastTickTs: Date.now(),
      exhaustionAccumMs: 0,
    };
  }
}

function applyHealthHybridAfterDecay() {
  const cfg = CONFIG.healthHybrid ?? {};
  if (cfg.enabled === false) return false;
  ensureHealthHybridRuntime();

  let changed = false;
  const runtime = state._healthHybridRuntime;
  const now = Date.now();
  const dt = Math.max(0, now - (runtime.lastTickTs || now));
  runtime.lastTickTs = now;

  const hunger = getStatCurrent('hunger', state);
  const thirst = getStatCurrent('thirst', state);
  const target = Math.round((hunger + thirst) / 2);
  const syncStep = Math.max(0, Math.floor(cfg.syncStepPerTick ?? 1));

  if (syncStep > 0) {
    ['health', 'mood'].forEach((key) => {
      const current = getStatCurrent(key, state);
      if (current < target) {
        state.stats[key].current = clampStat(key, current + syncStep, state);
        changed = true;
      } else if (current > target) {
        state.stats[key].current = clampStat(key, current - syncStep, state);
        changed = true;
      }
    });
  }

  const starving = hunger <= 0 && thirst <= 0;
  if (!starving) {
    runtime.exhaustionAccumMs = 0;
    return changed;
  }

  runtime.exhaustionAccumMs += dt;
  const everyMs = Math.max(60_000, Number(cfg.exhaustionPenaltyEveryMs) || 30 * 60 * 1000);
  const penaltyAmount = Math.max(1, Math.floor(cfg.exhaustionPenaltyAmount ?? 1));
  const hits = Math.floor(runtime.exhaustionAccumMs / everyMs);
  if (hits > 0) {
    runtime.exhaustionAccumMs -= hits * everyMs;
    state.stats.health.current = clampStat(
      'health',
      getStatCurrent('health', state) - hits * penaltyAmount,
      state
    );
    changed = true;
  }

  return changed;
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

  if (applyHealthHybridAfterDecay()) {
    changed = true;
  }

  if (changed) emitChange();
}

function applyOfflineDecay(elapsedMs) {
  const ms = Math.max(0, Number(elapsedMs) || 0);
  if (!ms) return null;
  ensureDecayRemainder();

  const tickMs = getHomeDecayTickMs();
  const ticks = ms / tickMs;
  if (ticks <= 0) return null;

  const rates = getHomeDecayPerTick();
  let changed = false;
  const drops = { hunger: 0, thirst: 0, health: 0, mood: 0 };

  STAT_DECAY_KEYS.forEach((key) => {
    const drop = Math.floor((rates[key] ?? 0) * ticks);
    if (drop > 0) {
      state.stats[key].current = clampStat(key, state.stats[key].current - drop, state);
      drops[key] += drop;
      changed = true;
    }
  });

  const hc = CONFIG.healthHybrid ?? {};
  if (hc.enabled !== false) {
    const hunger = getStatCurrent('hunger', state);
    const thirst = getStatCurrent('thirst', state);
    if (hunger <= 0 && thirst <= 0) {
      const everyMs = Math.max(
        60_000,
        Number(hc.exhaustionPenaltyEveryMs) || 30 * 60 * 1000
      );
      const amount = Math.max(1, Math.floor(hc.exhaustionPenaltyAmount ?? 1));
      const hits = Math.floor(ms / everyMs);
      if (hits > 0) {
        const hpLoss = hits * amount;
        state.stats.health.current = clampStat(
          'health',
          getStatCurrent('health', state) - hpLoss,
          state
        );
        drops.health += hpLoss;
        changed = true;
      }
    }
  }

  if (!changed) return null;
  return { elapsedMs: ms, drops };
}

function applyOfflineProgressSinceLastPlayed() {
  const last = Number(state.lastPlayed) || 0;
  if (!last) return null;

  const elapsed = Date.now() - last;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return null;

  const maxHours = Math.max(1, Math.floor(CONFIG.statDecay?.offlineMaxHours ?? 168));
  const cappedElapsed = Math.min(elapsed, maxHours * 60 * 60 * 1000);
  return applyOfflineDecay(cappedElapsed);
}

let state = createDefaultState();
let lastOfflineDecayReport = null;

function emitChange() {
  eventBus.emit('state:changed', gameState.get());
}

function isStatKey(key) {
  return STAT_KEYS.includes(key);
}

function ensureDailyMissions() {
  state.dailyMissions = normalizeDailyMissions(state.dailyMissions);
}

function progressDailyMission(type, delta = 1) {
  ensureDailyMissions();
  if (!type || delta <= 0) return false;
  let changed = false;
  state.dailyMissions.items.forEach((item) => {
    if (item.type !== type || item.done) return;
    item.progress = Math.min(item.target, item.progress + Math.floor(delta));
    if (item.progress >= item.target) item.done = true;
    changed = true;
  });
  return changed;
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

  getDailyFeedStatus() {
    state.feedLog = normalizeFeedLog(state.feedLog);
    return {
      ...state.feedLog,
      isFed: (state.feedLog.foodToday ?? 0) > 0,
      isWatered: (state.feedLog.drinkToday ?? 0) > 0,
      isFullyServed: (state.feedLog.foodToday ?? 0) > 0 && (state.feedLog.drinkToday ?? 0) > 0,
    };
  },

  getDailyMissions() {
    ensureDailyMissions();
    const dm = state.dailyMissions;
    const doneCount = dm.items.filter((it) => it.done).length;
    return {
      ...dm,
      items: dm.items.map((it) => ({ ...it })),
      doneCount,
      totalCount: dm.items.length,
      allDone: dm.items.length > 0 && doneCount === dm.items.length,
    };
  },

  incrementDailyMission(type, amount = 1) {
    const changed = progressDailyMission(type, amount);
    if (changed) emitChange();
    return changed;
  },

  claimDailyMissionsReward() {
    ensureDailyMissions();
    const dm = state.dailyMissions;
    const allDone = dm.items.length > 0 && dm.items.every((it) => it.done);
    if (!allDone || dm.claimed) return 0;
    const reward = Math.max(0, Math.floor(dm.reward ?? 0));
    dm.claimed = true;
    if (reward > 0) {
      state.stars = Math.max(0, (state.stars ?? 0) + reward);
      state.tapScore = Math.max(0, (state.tapScore ?? 0) + reward);
    }
    emitChange();
    return reward;
  },

  getNutritionPattern(days = 7) {
    const windowDays = Math.max(3, Math.min(14, Math.floor(days || 7)));
    const history = normalizeFeedHistory(state.feedHistory, 14);
    const byDay = new Map(history.map((h) => [h.dayKey, { ...h }]));
    const today = normalizeFeedLog(state.feedLog);
    const todayEntry = byDay.get(today.dayKey) ?? defaultFeedHistoryEntry(today.dayKey);
    todayEntry.total = Math.max(todayEntry.total, today.totalToday ?? 0);
    todayEntry.food = Math.max(todayEntry.food, today.foodToday ?? 0);
    todayEntry.drink = Math.max(todayEntry.drink, today.drinkToday ?? 0);
    byDay.set(today.dayKey, todayEntry);

    const rows = [];
    for (let i = 0; i < windowDays; i += 1) {
      const day = dayKeyShift(i);
      const row = byDay.get(day);
      if (row) rows.push(row);
    }

    const total = rows.reduce((s, r) => s + (r.total ?? 0), 0);
    const drink = rows.reduce((s, r) => s + (r.drink ?? 0), 0);
    const bad = rows.reduce((s, r) => s + (r.bad ?? 0), 0);
    const uniqueKinds = new Set();
    rows.forEach((r) => {
      if ((r.good ?? 0) > 0) uniqueKinds.add('good');
      if ((r.neutral ?? 0) > 0) uniqueKinds.add('neutral');
      if ((r.bad ?? 0) > 0) uniqueKinds.add('bad');
    });

    return {
      windowDays,
      scanCount: total,
      drinkShare: total > 0 ? drink / total : 0,
      badShare: total > 0 ? bad / total : 0,
      diversityKinds: uniqueKinds.size,
      hasWaterGap: total >= 4 && drink === 0,
      hasBadOveruse: total >= 4 && bad / total >= 0.45,
      hasLowDiversity: total >= 5 && uniqueKinds.size <= 1,
    };
  },

  consumeOfflineDecayReport() {
    const report = lastOfflineDecayReport;
    lastOfflineDecayReport = null;
    return report;
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

  getDecayTickMs() {
    return getHomeDecayTickMs();
  },

  fillStatToMax(statKey) {
    if (!isStatKey(statKey)) return;
    ensureStatsShape(state);
    state.stats[statKey].current = getStatMax(statKey, state);
    emitChange();
  },

  /** Поднять стата минимум до display % (не опускает, если уже выше). Возвращает прирост в пунктах шкалы. */
  raiseStatToDisplayPercent(statKey, percent) {
    if (!isStatKey(statKey)) return 0;
    ensureStatsShape(state);
    const target = percentToAbsolute(percent);
    const prev = state.stats[statKey].current;
    const next = clampStat(statKey, Math.max(prev, target));
    state.stats[statKey].current = next;
    if (next !== prev) emitChange();
    return next - prev;
  },

  /** Синхронно подтянуть health/mood к среднему hunger+thirst (для явного апдейта после кормления). */
  syncDerivedFromPrimary({ immediate = false, step = null } = {}) {
    ensureStatsShape(state);
    const target = Math.round((getStatCurrent('hunger', state) + getStatCurrent('thirst', state)) / 2);
    const deltas = { health: 0, mood: 0 };
    const syncStep = Math.max(1, Math.floor(step ?? (CONFIG.healthHybrid?.syncStepPerTick ?? 1)));
    let changed = false;

    ['health', 'mood'].forEach((key) => {
      const prev = getStatCurrent(key, state);
      let next = prev;
      if (immediate) {
        next = target;
      } else if (prev < target) {
        next = prev + syncStep;
      } else if (prev > target) {
        next = prev - syncStep;
      }
      next = clampStat(key, next, state);
      if (next !== prev) {
        state.stats[key].current = next;
        deltas[key] = next - prev;
        changed = true;
      }
    });

    if (changed) emitChange();
    return deltas;
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
      lastOfflineDecayReport = applyOfflineProgressSinceLastPlayed();
      if (lastOfflineDecayReport) {
        gameState.save();
      }
      return true;
    } catch {
      state = createDefaultState();
      return false;
    }
  },

  save() {
    state.saveVersion = CONFIG.saveVersion;
    state.lastPlayed = Date.now();
    const { _decayRemainder, _healthHybridRuntime, cloud, ...payload } = state;
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
    progressDailyMission('score_gain', a);
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

  recordPhotoFeed(food = null) {
    state.feedLog = normalizeFeedLog(state.feedLog);
    state.feedHistory = normalizeFeedHistory(state.feedHistory, 14);
    const drinkIds = CONFIG.feedLoop?.drinkFoodIds ?? [];
    const id = String(food?.id ?? '').toLowerCase();
    const isDrink = !!food?.thirstPriority || drinkIds.includes(id);
    const kind = food?.kind === 'good' || food?.kind === 'neutral' || food?.kind === 'bad' ? food.kind : 'neutral';
    state.feedLog.totalToday += 1;
    if (isDrink) state.feedLog.drinkToday += 1;
    else state.feedLog.foodToday += 1;
    state.feedLog.lastType = isDrink ? 'drink' : 'food';

    const day = state.feedLog.dayKey;
    let entry = state.feedHistory.find((h) => h.dayKey === day);
    if (!entry) {
      entry = defaultFeedHistoryEntry(day);
      state.feedHistory.unshift(entry);
    }
    entry.total += 1;
    if (isDrink) entry.drink += 1;
    else entry.food += 1;
    entry[kind] += 1;
    state.feedHistory = normalizeFeedHistory(state.feedHistory, 14);
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
    progressDailyMission('score_gain', a);
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

  getTutorialMetrics() {
    return {
      ...defaultTutorialMetrics(),
      ...(state.tutorialMetrics && typeof state.tutorialMetrics === 'object'
        ? state.tutorialMetrics
        : {}),
    };
  },

  markTutorialFirstFeedComplete() {
    if (!state.tutorialMetrics || typeof state.tutorialMetrics !== 'object') {
      state.tutorialMetrics = defaultTutorialMetrics();
    }
    if (state.tutorialMetrics.tutorialToFirstFeedCompleteAt) return false;
    state.tutorialMetrics.tutorialToFirstFeedCompleteAt = Date.now();
    emitChange();
    return true;
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
      tutorialMetrics: cloud.tutorialMetrics ?? raw.tutorialMetrics,
      tutorialCompleted: cloud.tutorialCompleted ?? raw.tutorialCompleted,
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
      tutorialMetrics: raw.tutorialMetrics ?? defaultTutorialMetrics(),
      tutorialCompleted: !!raw.tutorialCompleted,
      saveVersion: CONFIG.saveVersion,
    };
  },

  getTutorialCompleted() {
    return !!state.tutorialCompleted;
  },

  setTutorialCompleted(value = true) {
    const next = !!value;
    if (!!state.tutorialCompleted === next) return;
    state.tutorialCompleted = next;
    emitChange();
  },
};
