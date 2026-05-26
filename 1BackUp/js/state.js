import { CONFIG } from './config.js';

import { eventBus } from './eventBus.js';



function createDefaultState() {

  const start = CONFIG.stats.start;

  return {

    saveVersion: CONFIG.saveVersion,

    hunger: start,

    thirst: start,

    health: start,

    mood: start,

    tapScore: 0,

    runScore: 0,

    bestDistance: 0,

    bestScore: 0,

    lastPlayed: Date.now(),

    badFoodTipDay: null,

    foodInteractCount: 0,

  };

}

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}



const STAT_DECAY_KEYS = ['hunger', 'thirst', 'health', 'mood'];

function getHomeDecayPerTick() {
  const d = CONFIG.statDecay;
  const max = CONFIG.stats.max;
  const ms90 = 90 * 60 * 1000;
  const homeTickMs = d.tickMs * (d.homeSlowdown ?? 1);
  const basePer90 = ((d.displayPercentPer90Min ?? 1) / 100) * max;
  const refWeight = d.hunger ?? 1;
  const rates = {};
  STAT_DECAY_KEYS.forEach((key) => {
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
      state[key] = clamp(state[key] - drop);
      changed = true;
    }
  });

  if (changed) emitChange();
}

function clamp(value) {

  return Math.max(CONFIG.stats.min, Math.min(CONFIG.stats.max, value));

}



function migrateSave(saved) {

  const base = createDefaultState();

  const merged = { ...base, ...saved, saveVersion: CONFIG.saveVersion };

  if (merged.tapScore == null) merged.tapScore = 0;

  if (merged.runScore == null) merged.runScore = 0;

  if (merged.badFoodTipDay == null) merged.badFoodTipDay = null;

  if (merged.foodInteractCount == null) merged.foodInteractCount = 0;

  delete merged.coins;

  return merged;

}



let state = createDefaultState();



function emitChange() {

  eventBus.emit('state:changed', gameState.get());

}



export const gameState = {

  get() {

    return { ...state };

  },



  getTotalScore() {

    return state.tapScore + state.runScore;

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

        localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));

        return true;

      }

      state = { ...createDefaultState(), ...saved };

      return true;

    } catch {

      state = createDefaultState();

      return false;

    }

  },



  save() {

    state.saveVersion = CONFIG.saveVersion;

    state.lastPlayed = Date.now();

    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));

    eventBus.emit('state:saved', gameState.get());

  },



  resetProgress() {

    state = createDefaultState();

    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));

    emitChange();

    eventBus.emit('state:saved', gameState.get());

  },



  changeStat(key, delta) {

    if (

      !(key in state) ||

      key === 'saveVersion' ||

      key === 'tapScore' ||

      key === 'runScore' ||

      key === 'lastPlayed' ||

      key === 'bestDistance' ||

      key === 'bestScore'

    )

      return;

    state[key] = clamp(state[key] + delta);

    emitChange();

  },



  setStat(key, value) {

    if (

      !(key in state) ||

      key === 'saveVersion' ||

      key === 'tapScore' ||

      key === 'runScore' ||

      key === 'lastPlayed' ||

      key === 'bestDistance' ||

      key === 'bestScore'

    )

      return;

    state[key] = clamp(value);

    emitChange();

  },



  addTapScore(amount) {

    if (!amount) return;

    state.tapScore = Math.max(0, state.tapScore + Math.floor(amount));

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

    state.runScore += Math.floor(amount);

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

      if (

        key in state &&

        key !== 'saveVersion' &&

        key !== 'tapScore' &&

        key !== 'runScore' &&

        key !== 'lastPlayed' &&

        key !== 'bestDistance' &&

        key !== 'bestScore'

      ) {

        state[key] = clamp(state[key] + delta);

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

};


