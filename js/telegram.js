import { CONFIG } from './config.js';

let ready = false;

function cloudCfg() {
  return CONFIG.cloudSync ?? {};
}

function parseUserFromInitData(raw) {
  if (!raw) return null;
  try {
    const params = new URLSearchParams(raw);
    const userJson = params.get('user');
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

function readTelegramUser() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  const unsafe = tg.initDataUnsafe?.user;
  if (unsafe?.id != null) return unsafe;

  return parseUserFromInitData(tg.initData);
}

export function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand();
  } catch {
    /* ignore */
  }
  ready = true;
  return tg;
}

export function isTelegramEnv() {
  return !!window.Telegram?.WebApp;
}

/** Mini App внутри Telegram (не просто браузер со скриптом). */
export function isTelegramMiniApp() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;
  if (tg.platform && tg.platform !== 'unknown') return true;
  if (tg.initData) return true;
  return getTelegramUserId() != null;
}

/** Ждём user.id — в TG иногда приходит с задержкой. */
export function waitForTelegramUser(maxMs = null) {
  const limit = maxMs ?? cloudCfg().telegramWaitMs ?? 5000;
  const existing = getTelegramUserId();
  if (existing != null) return Promise.resolve(existing);

  if (!isTelegramEnv()) return Promise.resolve(null);

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const id = getTelegramUserId();
      if (id != null) {
        resolve(id);
        return;
      }
      if (Date.now() - started >= limit) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

/** @returns {number|null} */
export function getTelegramUserId() {
  const sync = cloudCfg();
  if (sync.devBypass && sync.devTelegramId != null) {
    return Number(sync.devTelegramId);
  }
  const user = readTelegramUser();
  const id = user?.id;
  return id != null ? Number(id) : null;
}

export function getTelegramUser() {
  if (cloudCfg().devBypass && cloudCfg().devTelegramId != null) {
    return {
      id: Number(cloudCfg().devTelegramId),
      username: 'dev_user',
      first_name: 'Dev',
    };
  }
  return readTelegramUser();
}

export function canUseCloudSync() {
  if (!CONFIG.firebase?.enabled) return false;
  if (getTelegramUserId() != null) return true;
  return !!(cloudCfg().devBypass && cloudCfg().devTelegramId != null);
}

export function isTelegramReady() {
  return ready;
}
