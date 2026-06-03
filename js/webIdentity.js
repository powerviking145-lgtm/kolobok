import { CONFIG } from './config.js';
import { gameState } from './state.js';

function phoneStorageKey() {
  return CONFIG.cloudSync?.webPhoneStorageKey ?? 'kolobok_web_phone';
}

/** @returns {string|null} 11 цифр, начинается с 7 */
export function normalizeRuPhone(input) {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('8') && digits.length >= 11) digits = `7${digits.slice(1)}`;
  if (digits.startsWith('8') && digits.length === 10) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  if (digits.length !== 11 || !digits.startsWith('7')) return null;
  return digits;
}

export function formatRuPhoneMask(rawDigits) {
  let d = String(rawDigits ?? '').replace(/\D/g, '');
  if (d.startsWith('8')) d = `7${d.slice(1)}`;
  if (!d.startsWith('7')) d = `7${d}`;
  d = d.slice(0, 11);
  if (d.length <= 1) return '+7 ';
  let s = '+7';
  if (d.length > 1) s += ` ${d.slice(1, 4)}`;
  if (d.length > 4) s += ` ${d.slice(4, 7)}`;
  if (d.length > 7) s += ` ${d.slice(7, 9)}`;
  if (d.length > 9) s += ` ${d.slice(9, 11)}`;
  return s;
}

export function getCachedWebPhone() {
  try {
    const fromStorage = localStorage.getItem(phoneStorageKey());
    const normalized = normalizeRuPhone(fromStorage);
    if (normalized) return normalized;
  } catch {
    /* ignore */
  }
  const fromState = normalizeRuPhone(gameState.getRaw?.()?.cloud?.phoneNumber);
  if (fromState) {
    try {
      localStorage.setItem(phoneStorageKey(), fromState);
    } catch {
      /* ignore */
    }
    return fromState;
  }
  return null;
}

export function setCachedWebPhone(digits) {
  const normalized = normalizeRuPhone(digits);
  if (!normalized) return false;
  try {
    localStorage.setItem(phoneStorageKey(), normalized);
  } catch {
    /* ignore */
  }
  gameState.setCloudIdentity({ phoneNumber: normalized });
  gameState.save();
  return true;
}

export function clearCachedWebPhone() {
  try {
    localStorage.removeItem(phoneStorageKey());
  } catch {
    /* ignore */
  }
  if (gameState.getRaw?.()?.cloud) {
    gameState.getRaw().cloud.phoneNumber = null;
  }
}

/** Firestore doc id для браузера без Telegram */
export function getWebPhoneUserDocId() {
  const phone = getCachedWebPhone();
  return phone ? `web_${phone}` : null;
}

function phoneCfg() {
  return CONFIG.onboarding?.phone ?? {};
}

function showPhoneModal() {
  const overlay = document.getElementById('web-phone-overlay');
  const input = document.getElementById('web-phone-input');
  const submit = document.getElementById('web-phone-submit');
  const errorEl = document.getElementById('web-phone-error');

  if (!overlay || !input || !submit) {
    return Promise.resolve(false);
  }

  const cfg = phoneCfg();
  const titleEl = document.getElementById('web-phone-title');
  const hintEl = overlay.querySelector('.onboarding-modal__hint');
  if (titleEl && cfg.title) titleEl.textContent = cfg.title;
  if (hintEl && cfg.hint) hintEl.textContent = cfg.hint;
  if (cfg.button) submit.textContent = cfg.button;

  document.documentElement.classList.add('is-onboarding-active');
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('is-open');
  input.value = '+7 ';
  if (errorEl) errorEl.textContent = '';

  const onInput = () => {
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    input.value = formatRuPhoneMask(digits || '7');
  };
  input.addEventListener('input', onInput);

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      input.removeEventListener('input', onInput);
    };

    const closeOverlay = () => {
      overlay.classList.remove('is-open');
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('is-onboarding-active');
    };

    const finish = () => {
      const normalized = normalizeRuPhone(input.value);
      if (!normalized) {
        if (errorEl) {
          errorEl.textContent =
            cfg.errorInvalid ?? 'Введи полный номер: +7 и 10 цифр после него.';
        }
        return;
      }
      if (settled) return;
      settled = true;
      setCachedWebPhone(normalized);
      cleanup();
      closeOverlay();
      resolve(true);
    };

    const onSubmit = (e) => {
      e.preventDefault();
      finish();
    };

    submit.addEventListener('click', onSubmit, { once: true });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    });
  });
}

/** @returns {Promise<boolean>} */
export async function runWebPhoneOnboardingIfNeeded() {
  if (getCachedWebPhone()) return true;
  return showPhoneModal();
}
