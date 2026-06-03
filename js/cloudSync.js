import { CONFIG } from './config.js';
import { eventBus } from './eventBus.js';
import { gameState } from './state.js';
import { getFirestoreDb, isFirebaseEnabled } from './firebaseApp.js';
import {
  getCooldownDurationMs,
  getRemainingMs,
  isCooldownEnabled,
  setLastFeedTimestamp,
  clearLastFeedTimestamp,
} from './feedCooldown.js';
import { canUseCloudSync, getTelegramUser, getTelegramUserId } from './telegram.js';
import { getCachedWebPhone, getWebPhoneUserDocId } from './webIdentity.js';

function getSyncUserDocId() {
  const tgId = getTelegramUserId();
  if (tgId != null) return String(tgId);
  return getWebPhoneUserDocId();
}

let dirty = false;
let syncTimerId = null;
let lastPull = null;

function cfg() {
  return CONFIG.cloudSync ?? {};
}

function usersCollectionPath(userDocId) {
  return `users/${String(userDocId)}`;
}

function feedCooldownUntilFromLocal(now = Date.now()) {
  const remaining = getRemainingMs(now);
  return remaining > 0 ? now + remaining : 0;
}

function applyFeedCooldownFromCloud(untilMs) {
  if (!isCooldownEnabled()) {
    clearLastFeedTimestamp();
    return;
  }
  const until = Number(untilMs) || 0;
  const now = Date.now();
  if (until > now) {
    const duration = getCooldownDurationMs();
    const remaining = until - now;
    setLastFeedTimestamp(now - (duration - remaining));
  } else {
    clearLastFeedTimestamp();
  }
}

function cloudUpdatedAtMs(data) {
  const u = data?.updatedAt;
  if (u == null) return 0;
  if (typeof u === 'number') return u;
  if (typeof u.toMillis === 'function') return u.toMillis();
  return 0;
}

function withTimeout(promise, ms, label = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

export function getLastPullInfo() {
  return lastPull;
}

async function pullProfileInternal() {
  const userDocId = getSyncUserDocId();
  const tgUser = getTelegramUser();
  const webPhone = getCachedWebPhone();

  const db = await getFirestoreDb();
  const { doc, getDoc } = await import(
    'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
  );
  const snap = await getDoc(doc(db, usersCollectionPath(userDocId)));
    if (!snap.exists()) {
      lastPull = {
        ok: true,
        isNewUser: true,
        telegramId: getTelegramUserId(),
        webPhone,
        userDocId,
        telegramUsername: tgUser?.username ?? null,
      };
      gameState.setCloudIdentity({
        telegramId: getTelegramUserId(),
        telegramUsername: tgUser?.username ?? null,
        telegramFirstName: tgUser?.first_name ?? null,
        phoneNumber: webPhone,
      });
      dirty = true;
      return lastPull;
    }

    const cloud = snap.data();
    const cloudTs = cloudUpdatedAtMs(cloud);
    const localTs = gameState.getRaw().lastPlayed ?? 0;

    if (cloudTs >= localTs) {
      gameState.importFromCloud(cloud);
      applyFeedCooldownFromCloud(cloud.feedCooldownUntil);
    } else {
      applyFeedCooldownFromCloud(cloud.feedCooldownUntil);
    }

    gameState.setCloudIdentity({
      telegramId: getTelegramUserId(),
      telegramUsername: tgUser?.username ?? cloud.telegramUsername ?? null,
      telegramFirstName: tgUser?.first_name ?? cloud.telegramFirstName ?? null,
      phoneNumber: cloud.phoneNumber ?? webPhone ?? null,
    });

    const needsName = !gameState.getKolobokName();
    lastPull = {
      ok: true,
      isNewUser: needsName,
      telegramId: getTelegramUserId(),
      webPhone: cloud.phoneNumber ?? webPhone ?? null,
      userDocId,
      hadCloud: true,
      cloudTs,
      localTs,
    };
    if (cloudTs < localTs) dirty = true;
    return lastPull;
}

export async function pullProfile() {
  if (!isFirebaseEnabled() || !canUseCloudSync()) {
    lastPull = { ok: false, skipped: true, reason: 'no-sync' };
    return lastPull;
  }

  try {
    const timeoutMs = cfg().pullTimeoutMs ?? 8000;
    return await withTimeout(pullProfileInternal(), timeoutMs, 'cloud-pull-timeout');
  } catch (err) {
    console.warn('cloudSync.pull', err);
    lastPull = { ok: false, error: err?.message ?? 'pull-failed' };
    return lastPull;
  }
}

async function pushProfileInternal(userDocId) {
  const payload = gameState.exportToCloud({
    userDocId,
    telegramId: getTelegramUserId(),
    feedCooldownUntil: feedCooldownUntilFromLocal(),
  });
  const db = await getFirestoreDb();
  const { doc, setDoc, serverTimestamp } = await import(
    'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
  );
  await setDoc(
    doc(db, usersCollectionPath(userDocId)),
    {
      ...payload,
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true }
  );
  dirty = false;
  return { ok: true };
}

export async function pushProfile() {
  if (!isFirebaseEnabled() || !canUseCloudSync()) return { ok: false, skipped: true };
  if (!dirty) return { ok: true, skipped: true };

  const userDocId = getSyncUserDocId();
  if (userDocId == null) return { ok: false, skipped: true };

  try {
    const timeoutMs = cfg().pushTimeoutMs ?? 8000;
    return await withTimeout(
      pushProfileInternal(userDocId),
      timeoutMs,
      'cloud-push-timeout'
    );
  } catch (err) {
    console.warn('cloudSync.push', err);
    return { ok: false, error: err?.message ?? 'push-failed' };
  }
}

function markDirty() {
  dirty = true;
}

export function startCloudSync() {
  if (!isFirebaseEnabled() || !canUseCloudSync()) return;

  eventBus.on('state:changed', markDirty);

  const interval = cfg().syncIntervalMs ?? 10000;
  if (syncTimerId) window.clearInterval(syncTimerId);
  syncTimerId = window.setInterval(() => {
    pushProfile();
  }, interval);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      pushProfile();
    }
  });
}

export function stopCloudSync() {
  if (syncTimerId) {
    window.clearInterval(syncTimerId);
    syncTimerId = null;
  }
}

export async function flushCloudSync() {
  return pushProfile();
}

export function markCloudDirty() {
  dirty = true;
}

function markCloudAsNewUser() {
  const userDocId = getSyncUserDocId();
  lastPull = {
    ok: true,
    isNewUser: true,
    hadCloud: false,
    telegramId: getTelegramUserId(),
    userDocId: userDocId ?? null,
  };
  dirty = true;
}

/** Удалить профиль в Firestore — как новый игрок в облаке. */
export async function wipeCloudProfile() {
  if (!isFirebaseEnabled() || !canUseCloudSync()) {
    markCloudAsNewUser();
    return { ok: false, skipped: true };
  }

  const userDocId = getSyncUserDocId();
  if (userDocId == null) {
    markCloudAsNewUser();
    return { ok: false, skipped: true };
  }

  try {
    const db = await getFirestoreDb();
    const { doc, deleteDoc } = await import(
      'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js'
    );
    const timeoutMs = cfg().pushTimeoutMs ?? 8000;
    await withTimeout(
      deleteDoc(doc(db, usersCollectionPath(userDocId))),
      timeoutMs,
      'cloud-wipe-timeout'
    );
    markCloudAsNewUser();
    dirty = false;
    return { ok: true };
  } catch (err) {
    console.warn('cloudSync.wipe', err);
    markCloudAsNewUser();
    return { ok: false, error: err?.message ?? 'wipe-failed' };
  }
}
