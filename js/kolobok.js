import { CONFIG } from './config.js';
import { phrases, getCantRunPhrase, pickNamedFrom, formatPhrase } from './phrases.js';

const MOOD_PRIORITY = ['sleepy', 'overstuffed', 'sick', 'weak', 'hungry', 'thirsty', 'happy', 'normal'];

export function getMood(stats) {
  const t = CONFIG.moodThresholds;

  const checks = {
    sleepy: stats.hunger >= (t.sleepyHunger ?? 110),
    overstuffed:
      stats.hunger >= t.overstuffed && stats.hunger < (t.sleepyHunger ?? 110),
    sick: stats.hunger <= 0 && stats.thirst <= 0,
    weak:
      stats.strength < (t.strengthLow ?? 30) ||
      stats.agility < (t.agilityLow ?? 30),
    hungry: stats.hunger < t.hungerLow,
    thirsty: stats.thirst < t.thirstLow,
    happy:
      stats.hunger >= t.allGoodMin &&
      stats.thirst >= t.allGoodMin &&
      stats.strength >= t.allGoodMin &&
      stats.agility >= t.allGoodMin,
    normal: true,
  };

  for (const mood of MOOD_PRIORITY) {
    if (checks[mood]) return mood;
  }

  return 'normal';
}

function pickRandom(list, exclude) {
  const pool = exclude ? list.filter((p) => p !== exclude) : list.slice();
  if (pool.length === 0) return list[Math.floor(Math.random() * list.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function isBurnRunReady(stats) {
  const min = CONFIG.moodThresholds.burnRunAbove ?? 100;
  return stats.hunger > min && stats.thirst > min;
}

export function pickBurnRunPhrase(lastPhrase = '') {
  const list = phrases.burnRun || phrases.overstuffed;
  return pickNamedFrom(list, lastPhrase);
}

export function pickGreetingPhrase(name) {
  const templates = CONFIG.greeting?.templates ?? [];
  if (!templates.length || !name) return null;
  return formatPhrase(pickRandom(templates), name);
}

export function pickPhrase(mood, lastPhrase = '') {
  const phraseKey = mood === 'weak' ? 'angry' : mood;
  if (phraseKey === 'normal') {
    const combined = [...phrases.normal, ...phrases.idle];
    return pickNamedFrom(combined, lastPhrase);
  }
  return pickNamedFrom(phrases[phraseKey] || phrases.normal, lastPhrase);
}

export function getMoodClass(mood) {
  const key = mood === 'weak' ? 'angry' : mood;
  return `kolobok--${key}`;
}

export function canStartRun(stats) {
  return (
    stats.hunger > 0 &&
    stats.thirst > 0 &&
    stats.strength > 0 &&
    stats.agility > 0
  );
}

export function getBlockRunPhrase(stats) {
  return getCantRunPhrase(stats);
}

export function canRequestReceipt(stats) {
  if (CONFIG.purchase.testMode) return true;
  const min = CONFIG.purchase.receiptMinStat ?? 20;
  return (
    stats.hunger < min ||
    stats.thirst < min ||
    stats.strength < min ||
    stats.agility < min
  );
}

export function getReceiptBlockedPhrase() {
  const list = CONFIG.ui.receiptBlockedPhrases || phrases.normal;
  return pickNamedFrom(list);
}
