import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { canUseCloudSync, waitForTelegramUser } from './telegram.js';
import { flushCloudSync, getLastPullInfo, markCloudDirty } from './cloudSync.js';

function cfg() {
  return CONFIG.onboarding ?? {};
}

function showNameModal() {
  const overlay = document.getElementById('onboarding-overlay');
  const input = document.getElementById('onboarding-name-input');
  const submit = document.getElementById('onboarding-name-submit');
  const errorEl = document.getElementById('onboarding-name-error');

  if (!overlay || !input || !submit) {
    return Promise.resolve(true);
  }

  const minLen = cfg().nameMinLength ?? 2;
  const maxLen = cfg().nameMaxLength ?? 16;

  const titleEl = document.getElementById('onboarding-title');
  const hintEl = overlay.querySelector('.onboarding-modal__hint');
  if (titleEl && cfg().title) titleEl.textContent = cfg().title;
  if (hintEl && cfg().hint) hintEl.textContent = cfg().hint;
  if (cfg().button) submit.textContent = cfg().button;

  document.documentElement.classList.add('is-onboarding-active');
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('is-open');
  input.value = '';
  if (errorEl) errorEl.textContent = '';

  return new Promise((resolve) => {
    const validate = () => {
      const raw = input.value.trim();
      if (raw.length < minLen) {
        return cfg().errorTooShort ?? 'Минимум 2 символа, бро.';
      }
      if (raw.length > maxLen) {
        return cfg().errorTooLong ?? 'Короче, макс 16 символов.';
      }
      return null;
    };

    const finish = async () => {
      const err = validate();
      if (err) {
        if (errorEl) errorEl.textContent = err;
        return;
      }
      gameState.setKolobokName(input.value.trim());
      markCloudDirty();
      overlay.classList.remove('is-open');
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('is-onboarding-active');
      resolve(true);
      await flushCloudSync().catch(() => {});
    };

    const onSubmit = (e) => {
      e.preventDefault();
      finish();
    };

    submit.addEventListener('click', onSubmit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    });
  });
}

/**
 * @returns {Promise<boolean>}
 */
export async function runOnboardingIfNeeded() {
  await waitForTelegramUser();

  if (!canUseCloudSync()) {
    return true;
  }

  const pull = getLastPullInfo();
  const localName = gameState.getKolobokName();

  if (localName && pull?.hadCloud) {
    return true;
  }

  if (localName && !pull?.hadCloud) {
    markCloudDirty();
    await flushCloudSync().catch(() => {});
    return true;
  }

  return showNameModal();
}
