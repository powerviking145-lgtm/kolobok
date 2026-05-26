import { CONFIG } from './config.js';

const SDK = '11.6.0';

let app = null;
let db = null;
let initPromise = null;

function cfg() {
  return CONFIG.firebase ?? {};
}

export function isFirebaseEnabled() {
  const c = cfg();
  return !!c.enabled && !!c.apiKey && !!c.projectId;
}

function withTimeout(promise, ms, label = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

export async function getFirestoreDb() {
  if (!isFirebaseEnabled()) return null;
  if (db) return db;
  const timeoutMs = CONFIG.firebase?.initTimeoutMs ?? 12000;
  if (!initPromise) {
    initPromise = (async () => {
      const { initializeApp } = await import(
        `https://www.gstatic.com/firebasejs/${SDK}/firebase-app.js`
      );
      const { getFirestore } = await import(
        `https://www.gstatic.com/firebasejs/${SDK}/firebase-firestore.js`
      );
      const c = cfg();
      app = initializeApp({
        apiKey: c.apiKey,
        authDomain: c.authDomain,
        projectId: c.projectId,
        storageBucket: c.storageBucket,
        messagingSenderId: c.messagingSenderId,
        appId: c.appId,
      });
      db = getFirestore(app);
      return db;
    })();
  }
  return withTimeout(initPromise, timeoutMs, 'firebase-init-timeout');
}
