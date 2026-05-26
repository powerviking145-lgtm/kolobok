import { CONFIG } from './config.js';
import { phrases, getCantRunPhrase } from './phrases.js';

const MOOD_PRIORITY = ['sleepy', 'overstuffed', 'sick', 'angry', 'hungry', 'thirsty', 'happy', 'normal'];

export function getMood(stats) {
  const t = CONFIG.moodThresholds;

  const checks = {
    sleepy: stats.hunger >= (t.sleepyHunger ?? 110),
    overstuffed:
      stats.hunger >= t.overstuffed && stats.hunger < (t.sleepyHunger ?? 110),
    sick: stats.health < t.healthLow,
    angry: stats.mood < (t.angryMood ?? 20),
    hungry: stats.hunger < t.hungerLow,
    thirsty: stats.thirst < t.thirstLow,
    happy:
      stats.mood >= t.moodHigh &&
      stats.hunger >= t.allGoodMin &&
      stats.thirst >= t.allGoodMin &&
      stats.health >= t.allGoodMin,
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
  return [stats.hunger, stats.thirst, stats.health, stats.mood].every((v) => v > min);
}

export function pickBurnRunPhrase(lastPhrase = '') {
  const list = phrases.burnRun || phrases.overstuffed;
  return pickRandom(list, lastPhrase);
}

export function pickPhrase(mood, lastPhrase = '') {
  if (mood === 'normal') {
    const combined = [...phrases.normal, ...phrases.idle];
    return pickRandom(combined, lastPhrase);
  }
  return pickRandom(phrases[mood] || phrases.normal, lastPhrase);
}

export function getMoodClass(mood) {
  return `kolobok--${mood}`;
}

export function canStartRun(stats) {
  return (
    stats.hunger > 0 &&
    stats.thirst > 0 &&
    stats.health > 0 &&
    stats.mood > 0
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
    stats.health < min ||
    stats.mood < min
  );
}

export function getReceiptBlockedPhrase() {
  const list = CONFIG.ui.receiptBlockedPhrases || phrases.normal;
  return pickRandom(list);
}
