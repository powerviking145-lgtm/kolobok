import { CONFIG } from './config.js';
import { eventBus } from './eventBus.js';
import { gameState } from './state.js';
import {
  getMood,
  pickPhrase,
  pickGreetingPhrase,
  pickBurnRunPhrase,
  isBurnRunReady,
  getMoodClass,
  canStartRun,
  getBlockRunPhrase,
  canRequestReceipt,
  getReceiptBlockedPhrase,
} from './kolobok.js';
import { initViewport } from './viewport.js';
import { createUnpackingFlow } from './unpackingFlow.js';
import { createFoodPhotoFeed } from './foodPhotoFeed.js';
import { getCriticalWarnPhrase, setPhraseNameResolver } from './phrases.js';
import { positionSpeechBubble } from './speechPosition.js';
import { createRunner } from './runner/runner.js';
import { createTapFx } from './tapFx.js';
import { createHomeSpawns } from './homeSpawns.js';
import { runBootLoader } from './loader.js';
import { createKolobokLecture } from './kolobokLecture.js';
import { createBadFoodTip } from './badFoodTip.js';
import { initSocialBanner } from './socialBanner.js';
import { initRoadmap } from './roadmap.js';
import { initShop } from './shop.js';
import { createShopTutorial } from './shopTutorial.js';
import { createShopUpgradeHint } from './shopUpgradeHint.js';
import { initHomeLayout } from './homeLayout.js';
import { getStatDisplayPercent } from './statZones.js';
import {
  isOnCooldown,
  getRemainingMs,
  setLastFeedTimestamp,
  clearLastFeedTimestamp,
  formatFeedButtonLabel,
  formatFeedToast,
} from './feedCooldown.js';
import {
  vibrate,
  vibrateTap,
  pickTapReaction,
  pickFoodHaptic,
  initHomeParticles,
} from './homeUi.js';
import { createReplySystem } from './replySystem.js';
import { createTutorialController, isTutorialCompleted, resetTutorialFlag } from './tutorial.js';
import { initTelegram, isTelegramMiniApp, waitForTelegramUser, canUseCloudSync } from './telegram.js';
import { pullProfile, startCloudSync, flushCloudSync, markCloudDirty, wipeCloudProfile } from './cloudSync.js';
import { runOnboardingIfNeeded } from './onboarding.js';
import { isFirebaseEnabled } from './firebaseApp.js';

const ui = {
  app: null,
  statsBars: null,
  kolobokStage: null,
  kolobok: null,
  kolobokVideoA: null,
  kolobokVideoB: null,
  scoreHub: null,
  scoreTotal: null,
  tapFloats: null,
  homeSpawns: null,
  homeParticles: null,
  btnReceipt: null,
  btnShop: null,
  btnRun: null,
  footer: null,
  homeToast: null,
};

let currentMood = 'normal';
let currentPhrase = '';
let decayTimerId = null;
let phraseTimerId = null;
let autosaveTimerId = null;
let purchase = null;
let foodPhotoFeed = null;
let runner = null;
let tapFx = null;
let homeSpawns = null;
let feedCooldownTimerId = null;
let wasFeedCooldownActive = false;
let homeToastTimerId = null;
let disposeHomeLayout = null;
let roadmapScreen = null;
let shopScreen = null;
let shopTutorial = null;
let shopUpgradeHint = null;
let kolobokLecture = null;
let badFoodTip = null;
let burnRunActive = false;
let lastHomeVideoIndex = -1;
let replySystem = null;
let tutorial = null;
let disposeParticles = null;
let criticalWarnTimerId = null;
let lastCriticalWarnAt = 0;
const TAP_EMOJIS = ['😄', '😋', '🥰', '😎', '❤️'];
const homeVideo = {
  active: null,
  buffer: null,
  preloading: false,
  prerolling: false,
};

function buildStatsBars() {
  const chipLabels = CONFIG.topPanel?.statChipLabels ?? {};

  ui.statsBars.innerHTML = CONFIG.statBars
    .map((bar) => {
      const caption = chipLabels[bar.key] ?? bar.label.toUpperCase();
      return `
    <button type="button" class="stat-chip top-stat" data-stat="${bar.key}" aria-label="${bar.label}">
      <span class="stat-chip__head">
        <span class="stat-chip__icon" aria-hidden="true">${bar.icon}</span>
        <span class="stat-chip__pct" data-pct="${bar.key}">0%</span>
      </span>
      <span class="stat-chip__track top-stat__track">
        <span class="stat-chip__fill top-stat__fill" data-fill="${bar.key}"></span>
      </span>
      <span class="stat-chip__caption">${caption}</span>
      <span class="top-stat__tip" role="status" hidden></span>
    </button>
  `;
    })
    .join('');
}

function hideAllStatTips() {
  ui.statsBars?.querySelectorAll('.top-stat').forEach((btn) => {
    btn.classList.remove('top-stat--tip-visible');
    const tip = btn.querySelector('.top-stat__tip');
    if (tip) tip.setAttribute('hidden', '');
  });
}

function updateStatsBars(stats) {
  const themes = CONFIG.topPanel?.statThemes ?? {};
  const criticalRatio = CONFIG.topPanel?.criticalRatio ?? 0.15;

  const scaleMax = CONFIG.stats.max ?? 120;

  CONFIG.statBars.forEach((bar) => {
    const value = Math.round(stats[bar.key]);
    const pct =
      stats.stats?.[bar.key]?.displayPercent ?? getStatDisplayPercent(value);
    const theme = themes[bar.key] ?? { rgb: '245, 166, 35', hex: '#F5A623', dark: '#C48412' };
    const fill = ui.statsBars?.querySelector(`[data-fill="${bar.key}"]`);
    const pctEl = ui.statsBars?.querySelector(`[data-pct="${bar.key}"]`);
    const row = ui.statsBars?.querySelector(`[data-stat="${bar.key}"]`);

    if (row) {
      row.style.setProperty('--stat-rgb', theme.rgb);
      row.style.setProperty('--stat-color', theme.hex);
      row.style.setProperty('--stat-color-dark', theme.dark);
    }

    if (pctEl) pctEl.textContent = `${pct}%`;

    if (fill) {
      fill.style.width = `${pct}%`;
      fill.style.background = `linear-gradient(90deg, ${theme.dark} 0%, ${theme.hex} 100%)`;
      fill.style.boxShadow = `0 0 0.375rem ${theme.hex}`;
      fill.style.transition = 'width 0.4s ease';
    }

    const isCritical = scaleMax > 0 && value / scaleMax < criticalRatio;
    row?.classList.toggle('stat-chip--critical', isCritical);
  });
}

function pulseStat(statKey) {
  const fill = ui.statsBars?.querySelector(`[data-fill="${statKey}"]`);
  if (!fill) return;
  fill.classList.remove('top-stat__fill--pulse');
  void fill.offsetWidth;
  fill.classList.add('top-stat__fill--pulse');
}

async function handleResetProgress(closeMenuSheet) {
  const tp = CONFIG.topPanel ?? {};
  const message =
    tp.resetConfirm ??
    'Сбросить всё? Имя, очки, статы, туториал и облачное сохранение — как новый игрок.';
  if (!window.confirm(message)) return;

  closeMenuSheet?.();
  kolobokLecture?.dismiss();
  replySystem?.hideAll();
  purchase?.forceReset?.();
  shopTutorial?.forceReset?.();
  clearLastFeedTimestamp();
  stopFeedCooldownTicker();

  gameState.resetAll();
  resetTutorialFlag();

  await wipeCloudProfile();
  markCloudDirty();
  await flushCloudSync().catch(() => {});

  activateHomeScreen();
  currentPhrase = '';
  renderUI(false);

  await runOnboardingIfNeeded();

  if (!isTutorialCompleted()) {
    pauseGameTimers();
    homeSpawns?.stop();
    tutorial?.start();
    resumeHomeVideo();
  } else {
    refreshPhrase(true);
  }
}

function initTopPanelChrome() {
  const tp = CONFIG.topPanel ?? {};
  let statTipTimerId = null;

  const menuSheet = document.getElementById('menu-sheet');
  const menuBackdrop = document.getElementById('menu-sheet-backdrop');
  const menuClose = document.getElementById('menu-sheet-close');
  const menuList = document.getElementById('menu-sheet-list');

  const exitModal = document.getElementById('exit-modal');
  const exitBackdrop = document.getElementById('exit-modal-backdrop');
  const exitStay = document.getElementById('exit-modal-stay');
  const exitLeave = document.getElementById('exit-modal-leave');
  const exitTitle = document.getElementById('exit-modal-title');
  const exitText = document.getElementById('exit-modal-text');

  function openMenuSheet() {
    if (!menuSheet) return;
    menuSheet.removeAttribute('hidden');
    menuSheet.setAttribute('aria-hidden', 'false');
    menuSheet.classList.add('is-open');
  }

  function closeMenuSheet() {
    if (!menuSheet) return;
    menuSheet.classList.remove('is-open');
    menuSheet.setAttribute('hidden', '');
    menuSheet.setAttribute('aria-hidden', 'true');
  }

  function openExitModal() {
    if (!exitModal) return;
    if (exitTitle && tp.exit?.title) exitTitle.textContent = tp.exit.title;
    if (exitText && tp.exit?.text) {
      exitText.innerHTML = tp.exit.text.replace(/\n/g, '<br>');
    }
    if (exitStay && tp.exit?.stayLabel) exitStay.textContent = tp.exit.stayLabel;
    if (exitLeave && tp.exit?.leaveLabel) exitLeave.textContent = tp.exit.leaveLabel;
    exitModal.removeAttribute('hidden');
    exitModal.setAttribute('aria-hidden', 'false');
    exitModal.classList.add('is-open');
  }

  function closeExitModal() {
    if (!exitModal) return;
    exitModal.classList.remove('is-open');
    exitModal.setAttribute('hidden', '');
    exitModal.setAttribute('aria-hidden', 'true');
  }

  const versionEl = document.getElementById('menu-sheet-version');
  if (versionEl) {
    versionEl.textContent = `Версия ${CONFIG.build}`;
  }

  if (menuList && tp.menuItems?.length) {
    menuList.innerHTML = tp.menuItems
      .map(
        (item) =>
          `<li><button type="button" class="menu-sheet__item" data-menu-action="${item.action ?? 'stub'}">${item.icon} ${item.label}</button></li>`
      )
      .join('');
    menuList.querySelectorAll('.menu-sheet__item').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.menuAction === 'resetProgress') {
          handleResetProgress(closeMenuSheet);
          return;
        }
        closeMenuSheet();
      });
    });
  }

  document.getElementById('btn-menu')?.addEventListener('click', openMenuSheet);
  menuBackdrop?.addEventListener('click', closeMenuSheet);
  menuClose?.addEventListener('click', closeMenuSheet);

  document.getElementById('btn-exit')?.addEventListener('click', openExitModal);
  exitBackdrop?.addEventListener('click', closeExitModal);
  exitStay?.addEventListener('click', closeExitModal);
  exitLeave?.addEventListener('click', closeExitModal);

  ui.statsBars?.querySelectorAll('.top-stat').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.stat;
      const bar = CONFIG.statBars.find((b) => b.key === key);
      if (!bar) return;

      const snap = gameState.get();
      const value = Math.round(snap[key]);
      const tip = btn.querySelector('.top-stat__tip');
      if (!tip) return;

      hideAllStatTips();

      const pct =
        snap.stats?.[key]?.displayPercent ?? getStatDisplayPercent(value);
      tip.textContent = `${pct}%`;
      tip.removeAttribute('hidden');
      btn.classList.add('top-stat--tip-visible');

      if (statTipTimerId) window.clearTimeout(statTipTimerId);
      const hideMs = tp.statTipHideMs ?? 1500;
      statTipTimerId = window.setTimeout(() => {
        hideAllStatTips();
        statTipTimerId = null;
      }, hideMs);
    });
  });
}

function formatScore(value) {
  const n = Math.floor(value);
  if (n < 1_000_000) return n.toLocaleString('ru-RU');
  if (n < 1_000_000_000) {
    const k = n / 1000;
    return `${k.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} к`;
  }
  const m = n / 1_000_000;
  return `${m.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн`;
}

function updateScoreHub(pop = false) {
  if (!ui.scoreTotal) return;
  ui.scoreTotal.textContent = formatScore(gameState.getTotalScore());
  if (pop && ui.scoreHub) {
    ui.scoreHub.classList.remove('is-pop');
    void ui.scoreHub.offsetWidth;
    ui.scoreHub.classList.add('is-pop');
  }
}

function updateKolobokMood(mood) {
  const moodClass = getMoodClass(mood);
  ui.kolobok.className = `kolobok ${moodClass}`;
}

function setReceiptButtonDefault() {
  if (!ui.btnReceipt) return;
  const fp = CONFIG.foodPhoto ?? {};
  const icon = fp.enabled ? (fp.buttonIcon ?? '📸') : (CONFIG.ui.receiptButtonIcon ?? '🍔');
  const text = fp.enabled ? (fp.buttonText ?? CONFIG.ui.unpackButton) : CONFIG.ui.unpackButton;
  ui.btnReceipt.innerHTML = `<span class="btn-icon" aria-hidden="true">${icon}</span><span class="btn__text">${text}</span>`;
}

function showHomeToast(text) {
  const el = ui.homeToast;
  if (!el || !text) return;
  el.textContent = text;
  el.removeAttribute('hidden');
  el.classList.add('is-visible');
  if (homeToastTimerId) window.clearTimeout(homeToastTimerId);
  const hideMs = CONFIG.feedCooldown?.toastMs ?? 2800;
  homeToastTimerId = window.setTimeout(() => {
    el.classList.remove('is-visible');
    el.setAttribute('hidden', '');
    homeToastTimerId = null;
  }, hideMs);
}

function stopFeedCooldownTicker() {
  if (feedCooldownTimerId) {
    window.clearInterval(feedCooldownTimerId);
    feedCooldownTimerId = null;
  }
}

function clearStuckFeedVisualState() {
  if (isFeedFlowOnScreen()) return;
  ui.app?.classList.remove('is-purchase-active', 'is-unpack-reaction', 'is-feed-active');
  const layer = document.getElementById('purchase-layer');
  if (layer) {
    layer.hidden = true;
    layer.setAttribute('hidden', '');
    layer.classList.remove('is-reaction-step');
  }
}

function ensureHomeScreenAwake({ refreshSpeech = false } = {}) {
  if (runner?.isActive() || tutorial?.isActive() || isFeedFlowOnScreen()) return;

  clearStuckFeedVisualState();

  if (homeSpawns && !isSpawnBlocked()) {
    homeSpawns.topUp(true);
    homeSpawns.ensureSpawnLoop();
  }

  if (refreshSpeech && !isHomePhraseBlocked()) {
    refreshPhrase(true);
  }
}

function ensureFeedCooldownTicker() {
  if (feedCooldownTimerId || !isOnCooldown()) return;

  const tickMs = CONFIG.feedCooldown?.tickMs ?? 1000;

  const tick = () => {
    if (runner?.isActive()) return;
    clearStuckFeedVisualState();
    ensureHomeScreenAwake();
    if (isFeedFlowOnScreen()) return;
    updateReceiptButton(gameState.get());
    if (!isOnCooldown()) {
      stopFeedCooldownTicker();
    }
  };

  tick();
  feedCooldownTimerId = window.setInterval(tick, tickMs);
}

function updateReceiptButton(stats) {
  if (!ui.btnReceipt) return;

  const onCooldownNow = getRemainingMs() > 0;
  const cooldownJustEnded = wasFeedCooldownActive && !onCooldownNow;
  wasFeedCooldownActive = onCooldownNow;

  if (tutorial?.isActive()) {
    setReceiptButtonDefault();
    ui.btnReceipt.classList.remove('btn--feed-cooldown', 'btn--disabled');
    ui.btnReceipt.disabled = false;
    ui.btnReceipt.setAttribute('aria-disabled', 'false');
    return;
  }

  const remaining = getRemainingMs();
  if (remaining > 0) {
    const label = formatFeedButtonLabel();
    ui.btnReceipt.innerHTML = `<span class="btn-icon" aria-hidden="true">${label.icon}</span><span class="btn__text">${label.text}</span>`;
    ui.btnReceipt.disabled = false;
    ui.btnReceipt.classList.add('btn--feed-cooldown');
    ui.btnReceipt.classList.remove('btn--disabled');
    ui.btnReceipt.setAttribute('aria-disabled', 'true');
    if (!feedCooldownTimerId) ensureFeedCooldownTicker();
    return;
  }

  ui.btnReceipt.classList.remove('btn--feed-cooldown');
  setReceiptButtonDefault();

  const allowed = canRequestReceipt(stats);
  ui.btnReceipt.disabled = !allowed;
  ui.btnReceipt.classList.toggle('btn--disabled', !allowed);
  ui.btnReceipt.setAttribute('aria-disabled', String(!allowed));

  if (cooldownJustEnded) {
    ensureHomeScreenAwake({ refreshSpeech: true });
  }
}

function isHomePhraseBlocked() {
  return (
    isFeedFlowOnScreen() ||
    runner?.isActive() ||
    tutorial?.isActive() ||
    badFoodTip?.isActive() ||
    shopUpgradeHint?.isActive()
  );
}

function rotateHomePhrase() {
  if (isHomePhraseBlocked()) {
    return;
  }
  const stats = gameState.get();
  if (isBurnRunReady(stats)) {
    replySystem?.showActionPrompt(pickBurnRunPhrase(currentPhrase), 'run');
  } else {
    replySystem?.hideActionPrompt();
    refreshPhrase(true);
  }
}

function updateBurnRunUI(stats) {
  if (!ui.btnRun) return;

  const ready = isBurnRunReady(stats);
  const wasReady = burnRunActive;
  burnRunActive = ready;

  const canRun = canStartRun(stats);
  ui.btnRun.classList.toggle('btn--burn-ready', ready && canRun);
  ui.btnRun.setAttribute('aria-label', ready ? 'Сжечь калории — побежать' : 'Бежать');

  document.documentElement.classList.toggle('is-burn-run-ready', ready);

  if (ready) {
    replySystem?.showActionPrompt(pickBurnRunPhrase(currentPhrase), 'run');
  } else {
    replySystem?.hideActionPrompt();
    if (wasReady) refreshPhrase(true);
  }
}

function showPhrase(text, animate = true, { autoHide, hideMs } = {}) {
  currentPhrase = text;
  const shouldHide = autoHide ?? CONFIG.replies?.homeIdleAutoHide ?? false;
  replySystem?.showIdle(text, { animate, autoHide: shouldHide, hideMs });
}

function refreshPhrase(animate = true) {
  if (shopUpgradeHint?.isActive()) return;
  const stats = gameState.get();
  if (isBurnRunReady(stats)) {
    updateBurnRunUI(stats);
    return;
  }
  replySystem?.hideActionPrompt();
  const phrase = pickPhrase(currentMood, currentPhrase);
  showPhrase(phrase, animate);
}

function renderUI(animatePhrase = false) {
  const stats = gameState.get();
  currentMood = getMood(stats);

  updateStatsBars(stats);
  updateScoreHub();
  updateKolobokMood(currentMood);
  updateReceiptButton(stats);
  updateBurnRunUI(stats);
  updateShopButton();

  if (!currentPhrase) {
    refreshPhrase(false);
  } else if (animatePhrase) {
    refreshPhrase(true);
  }
}

function onStateChanged() {
  const stats = gameState.get();
  const newMood = getMood(stats);
  const moodChanged = newMood !== currentMood;

  currentMood = newMood;
  updateStatsBars(stats);
  updateScoreHub();
  updateKolobokMood(currentMood);
  updateReceiptButton(stats);
  updateBurnRunUI(stats);
  updateShopButton();

  if (moodChanged && !burnRunActive) {
    refreshPhrase(true);
  }

  tryShowShopUpgradeHint();
}

function pickNextHomeVideoIndex() {
  const clips = CONFIG.kolobokHome.videos;
  if (!clips?.length) return 0;
  if (clips.length === 1) return 0;
  let idx;
  do {
    idx = Math.floor(Math.random() * clips.length);
  } while (idx === lastHomeVideoIndex);
  return idx;
}

function whenCanPlayThrough(videoEl, timeoutMs = CONFIG.loader?.videoTimeoutMs ?? 8000) {
  return new Promise((resolve) => {
    if (!videoEl) {
      resolve();
      return;
    }
    if (videoEl.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      resolve();
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    videoEl.addEventListener('canplaythrough', done, { once: true });
    videoEl.addEventListener('loadeddata', done, { once: true });
    videoEl.addEventListener('error', done, { once: true });
    window.setTimeout(done, timeoutMs);
  });
}

function clipSrcOnElement(videoEl, src) {
  const source = videoEl.querySelector('source');
  if (source) {
    return source.getAttribute('src') === src || source.src.endsWith(src);
  }
  return videoEl.getAttribute('src') === src || videoEl.currentSrc.endsWith(src);
}

function applyClipPoster(videoEl, clip) {
  if (!videoEl || !clip?.poster) return;
  videoEl.poster = clip.poster;
}

function schedulePosterClearOnPlay(videoEl) {
  if (!videoEl?.poster) return;
  const onFrame = () => {
    if (videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    videoEl.removeAttribute('poster');
    videoEl.removeEventListener('playing', onPlaying);
    videoEl.removeEventListener('timeupdate', onFrame);
  };
  const onPlaying = () => {
    videoEl.addEventListener('timeupdate', onFrame, { once: true });
  };
  videoEl.addEventListener('playing', onPlaying, { once: true });
}

function assignClipToElement(videoEl, index, options = {}) {
  const clips = CONFIG.kolobokHome.videos;
  if (!videoEl || !clips?.length) return Promise.resolve();

  const clip = clips[index];
  if (!clip) return Promise.resolve();

  const ready =
    !options.force &&
    clipSrcOnElement(videoEl, clip.src) &&
    videoEl.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA;

  lastHomeVideoIndex = index;
  applyClipPoster(videoEl, clip);
  if (ready) return Promise.resolve();

  const { videoType } = CONFIG.kolobokHome;

  const srcChanged =
    videoType
      ? !clipSrcOnElement(videoEl, clip.src)
      : videoEl.currentSrc !== clip.src && !clipSrcOnElement(videoEl, clip.src);

  if (srcChanged) {
    if (videoType) {
      let source = videoEl.querySelector('source');
      if (!source) {
        source = document.createElement('source');
        videoEl.appendChild(source);
      }
      source.src = clip.src;
      source.type = videoType;
    } else {
      videoEl.src = clip.src;
    }
    schedulePosterClearOnPlay(videoEl);
    videoEl.load();
    return whenCanPlayThrough(videoEl, options.timeoutMs);
  }

  if (videoEl.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
    videoEl.load();
    return whenCanPlayThrough(videoEl, options.timeoutMs);
  }

  return Promise.resolve();
}

function primeHomeVideoPosters() {
  const clips = CONFIG.kolobokHome.videos;
  if (!clips?.length) return;
  applyClipPoster(ui.kolobokVideoA, clips[0]);
  applyClipPoster(ui.kolobokVideoB, clips[1] ?? clips[0]);
  if (ui.kolobokVideoA) {
    ui.kolobokVideoA.classList.add('is-visible', 'is-front');
  }
}

async function bootPreloadHomeVideos(onProgress) {
  const clips = CONFIG.kolobokHome.videos || [];
  const total = Math.max(1, clips.length);
  const a = ui.kolobokVideoA;
  const b = ui.kolobokVideoB;
  const cache = document.getElementById('boot-video-cache');
  const targets = [a, b, cache].filter(Boolean);
  const perClipMs = Math.max(
    1500,
    Math.floor((CONFIG.loader?.videoTimeoutMs ?? 10000) / total)
  );

  onProgress(0.08);

  for (let i = 0; i < clips.length; i += 1) {
    const el = targets[i] || cache;
    if (el) {
      try {
        await assignClipToElement(el, i, { force: true, timeoutMs: perClipMs });
      } catch {
        /* нет файла / сеть — не вешаем загрузку */
      }
    }
    onProgress((i + 1) / total);
  }
}

function preloadNextHomeVideo() {
  if (homeVideo.preloading || !homeVideo.buffer) return;
  homeVideo.preloading = true;
  assignClipToElement(homeVideo.buffer, pickNextHomeVideoIndex())
    .catch(() => {})
    .finally(() => {
      homeVideo.preloading = false;
    });
}

function isHomeVideoContext() {
  return !runner?.isActive() && !document.getElementById('home-ui')?.hidden;
}

function onHomeVideoTimeUpdate(e) {
  if (!isHomeVideoContext()) return;
  if (e.target !== homeVideo.active) return;
  const video = homeVideo.active;
  const incoming = homeVideo.buffer;
  if (!video?.duration || !incoming) return;

  const left = video.duration - video.currentTime;
  const preloadLead = CONFIG.kolobokHome.preloadBeforeEndSec ?? 1;
  const prerollLead = CONFIG.kolobokHome.prerollBeforeEndSec ?? 0.12;

  if (left <= preloadLead) preloadNextHomeVideo();
  if (left <= prerollLead) startHomeVideoPreroll();
}

function startHomeVideoPreroll() {
  const incoming = homeVideo.buffer;
  if (homeVideo.prerolling || !incoming) return;
  if (incoming.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;

  homeVideo.prerolling = true;
  incoming.currentTime = 0;
  incoming.classList.remove('is-exiting', 'is-front');
  incoming.classList.add('is-visible', 'is-back');
  incoming.play().catch(() => {
    homeVideo.prerolling = false;
    incoming.classList.remove('is-visible', 'is-back');
  });
}

async function ensureIncomingReadyForCut() {
  const incoming = homeVideo.buffer;
  if (!incoming) return false;

  const idx = pickNextHomeVideoIndex();
  await assignClipToElement(incoming, idx);
  incoming.currentTime = 0;
  incoming.classList.remove('is-exiting', 'is-front');
  incoming.classList.add('is-visible', 'is-back');

  try {
    await incoming.play();
  } catch {
    return false;
  }

  homeVideo.prerolling = true;
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  return incoming.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
}

function cutHomeVideos() {
  const outgoing = homeVideo.active;
  const incoming = homeVideo.buffer;
  if (!outgoing || !incoming || !homeVideo.prerolling) return;

  const exitMs = CONFIG.kolobokHome.videoExitFadeMs ?? CONFIG.kolobokHome.videoCrossfadeMs ?? 520;

  incoming.classList.remove('is-back', 'is-exiting');
  incoming.classList.add('is-visible', 'is-front');

  outgoing.classList.remove('is-front');
  outgoing.classList.add('is-back', 'is-visible', 'is-exiting');

  homeVideo.active = incoming;
  homeVideo.buffer = outgoing;
  homeVideo.prerolling = false;
  homeVideo.preloading = false;

  window.setTimeout(() => {
    outgoing.classList.remove('is-visible', 'is-back', 'is-exiting');
    outgoing.pause();
    outgoing.currentTime = 0;
    assignClipToElement(outgoing, pickNextHomeVideoIndex()).catch(() => {});
  }, exitMs);
}

async function onHomeVideoEnded(e) {
  if (e.target !== homeVideo.active) return;

  if (!isHomeVideoContext()) {
    if (runner?.isActive() || purchase?.isActive()) {
      e.target.currentTime = 0;
      e.target.play().catch(() => {});
    }
    return;
  }

  const outgoing = homeVideo.active;
  if (!homeVideo.prerolling) {
    const ok = await ensureIncomingReadyForCut();
    if (!ok && outgoing) {
      outgoing.currentTime = Math.max(0, (outgoing.duration || 1) - 0.08);
      outgoing.play().catch(() => {});
      return;
    }
  }

  cutHomeVideos();
}

function initKolobokVideo(options = {}) {
  const a = ui.kolobokVideoA;
  const b = ui.kolobokVideoB;
  if (!a || !b) return;

  homeVideo.active = a;
  homeVideo.buffer = b;
  a.loop = false;
  b.loop = false;

  a.addEventListener('timeupdate', onHomeVideoTimeUpdate);
  b.addEventListener('timeupdate', onHomeVideoTimeUpdate);
  a.addEventListener('ended', onHomeVideoEnded);
  b.addEventListener('ended', onHomeVideoEnded);

  const startPlayback = () => {
    a.classList.add('is-visible', 'is-front');
    a.play().catch(() => {});
  };

  primeHomeVideoPosters();

  if (options.warmed) {
    startPlayback();
    assignClipToElement(b, pickNextHomeVideoIndex()).catch(() => {});
    return;
  }

  assignClipToElement(a, pickNextHomeVideoIndex()).then(() => {
    startPlayback();
    assignClipToElement(b, pickNextHomeVideoIndex()).catch(() => {});
  });
}

function pauseKolobokVideo() {
  homeVideo.prerolling = false;
  homeVideo.preloading = false;
  ui.kolobokVideoA?.pause();
  ui.kolobokVideoB?.pause();
}

async function resumeHomeVideo() {
  const a = ui.kolobokVideoA;
  const b = ui.kolobokVideoB;
  if (!a || !b) return;

  homeVideo.prerolling = false;
  homeVideo.preloading = false;

  let active = homeVideo.active;
  let buffer = homeVideo.buffer;
  if (!active?.isConnected) active = a;
  if (!buffer?.isConnected || buffer === active) buffer = active === a ? b : a;

  a.classList.remove('is-back');
  b.classList.remove('is-back');
  active.classList.add('is-visible', 'is-front');
  buffer.classList.remove('is-visible', 'is-front', 'is-back');

  homeVideo.active = active;
  homeVideo.buffer = buffer;

  const playActive = async () => {
    if (active.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !active.currentSrc) {
      const idx =
        lastHomeVideoIndex >= 0 ? lastHomeVideoIndex : pickNextHomeVideoIndex();
      await assignClipToElement(active, idx, { force: true });
    }
    if (active.currentTime >= (active.duration || 0) - 0.05) {
      active.currentTime = 0;
    }
    try {
      await active.play();
    } catch {
      await assignClipToElement(active, pickNextHomeVideoIndex(), { force: true });
      await active.play().catch(() => {});
    }
    preloadNextHomeVideo();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      playActive();
    });
  });
}

function playKolobokVideo() {
  resumeHomeVideo();
}

function pauseGameTimers() {
  clearInterval(decayTimerId);
  clearInterval(phraseTimerId);
  clearInterval(autosaveTimerId);
  clearInterval(criticalWarnTimerId);
  decayTimerId = null;
  phraseTimerId = null;
  autosaveTimerId = null;
  criticalWarnTimerId = null;
}

function pauseTimers() {
  pauseGameTimers();
  homeSpawns?.stop();
}

function resumeGameTimersOnly() {
  if (!decayTimerId) {
    const homeTickMs = Math.round(CONFIG.statDecay.tickMs * CONFIG.statDecay.homeSlowdown);
    decayTimerId = setInterval(() => gameState.tickDecay(), homeTickMs);
  }
  if (!phraseTimerId) {
    phraseTimerId = setInterval(() => {
      if (!isHomePhraseBlocked()) {
        rotateHomePhrase();
      }
    }, CONFIG.timers.phraseRotateMs);
  }
  if (!criticalWarnTimerId) {
    criticalWarnTimerId = setInterval(tickCriticalWarnings, 5000);
  }
  if (!autosaveTimerId) {
    autosaveTimerId = setInterval(() => gameState.save(), CONFIG.timers.autosaveMs);
  }
}

function resumeTimers() {
  resumeGameTimersOnly();
  if (!isSpawnBlocked()) {
    homeSpawns?.start();
  }
}

/** Возврат на главный после кормления — без двойного stop() спавнов. */
function resumeHomeAfterFeed(cartItems) {
  purchase?.forceReset?.();
  badFoodTip?.dismiss?.();
  kolobokLecture?.dismiss?.();
  replySystem?.hideNutrition?.();
  replySystem?.hideAll();
  document.documentElement.classList.remove(
    'is-lecture-active',
    'is-shop-hint-active',
    'is-tutorial-active'
  );
  ui.app?.classList.remove(
    'is-purchase-active',
    'is-unpack-reaction',
    'is-shop-active',
    'is-feed-active'
  );
  document.getElementById('home-ui')?.classList.remove('is-shop-active');
  if (shopScreen?.isOpen?.()) {
    shopScreen.close();
  }
  clearPurchaseOverlayState();
  ui.footer?.classList.remove('is-hidden');
  syncPurchaseStuckState();
  updateShopButton();
  resumeGameTimersOnly();

  homeSpawns?.repopulate?.(cartItems || []);
  ensureHomeScreenAwake({ refreshSpeech: true });
  requestAnimationFrame(() => {
    homeSpawns?.topUp?.(true);
    ensureHomeScreenAwake();
  });
}

function isHomeBlocked() {
  return (
    isFeedFlowOnScreen() ||
    runner?.isActive() ||
    kolobokLecture?.isActive() ||
    tutorial?.isActive() ||
    badFoodTip?.isActive() ||
    shopUpgradeHint?.isActive() ||
    roadmapScreen?.isOpen()
  );
}

/** Чек реально на экране (не залипший флаг flowBusy). */
function isFoodPhotoFeedActive() {
  return foodPhotoFeed?.isActive?.() ?? false;
}

function isFeedFlowOnScreen() {
  return isPurchaseLayerVisible() || isFoodPhotoFeedActive();
}

function isSpawnBlocked() {
  return (
    isFeedFlowOnScreen() ||
    runner?.isActive() ||
    tutorial?.isActive() ||
    badFoodTip?.isActive() ||
    shopScreen?.isOpen() ||
    roadmapScreen?.isOpen()
  );
}

function tryShowShopUpgradeHint() {
  if (isFeedFlowOnScreen()) return;
  if (runner?.isActive() || tutorial?.isActive() || badFoodTip?.isActive()) return;
  if (shopScreen?.isOpen() || roadmapScreen?.isOpen()) return;
  shopUpgradeHint?.tryShow();
}

function isSliceBlocked() {
  return isFeedFlowOnScreen() || runner?.isActive() || badFoodTip?.isActive();
}

function isPurchaseLayerVisible() {
  const layer = document.getElementById('purchase-layer');
  if (!layer || layer.hidden) return false;
  const style = window.getComputedStyle(layer);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function syncPurchaseStuckState() {
  if (!purchase) return false;
  let recovered = false;

  if (purchase.isActive() && !isPurchaseLayerVisible()) {
    purchase.forceReset();
    recovered = true;
  }

  if (
    !purchase?.isActive() &&
    (ui.app?.classList.contains('is-purchase-active') || isPurchaseLayerVisible())
  ) {
    clearPurchaseOverlayState();
    recovered = true;
  }

  return recovered;
}

function canOpenShop() {
  syncPurchaseStuckState();
  return !(
    isFeedFlowOnScreen() ||
    runner?.isActive() ||
    tutorial?.isActive() ||
    badFoodTip?.isActive() ||
    roadmapScreen?.isOpen()
  );
}

function clearPurchaseOverlayState() {
  if (purchase?.isActive?.() && !isPurchaseLayerVisible()) {
    purchase.forceReset();
  } else if (purchase && !purchase.isActive()) {
    purchase.forceReset();
  }
  ui.app?.classList.remove('is-purchase-active', 'is-unpack-reaction', 'is-feed-active');
  document.documentElement.classList.remove('is-lecture-active');
  const layer = document.getElementById('purchase-layer');
  if (layer) {
    layer.setAttribute('hidden', '');
    layer.hidden = true;
    layer.classList.remove('is-reaction-step');
  }
  ui.footer?.classList.remove('is-hidden');
}

function ensureHomeDockVisible() {
  kolobokLecture?.dismiss?.();
  replySystem?.hideNutrition?.();
  clearPurchaseOverlayState();
}

function kickHomeSpawns() {
  if (!homeSpawns) return;
  homeSpawns.stop();
  if (!isSpawnBlocked()) {
    homeSpawns.start();
  }
}

/** То же, что «оживляет» главный экран после туториала — сброс залипших оверлеев. */
function restoreHomeIdleState() {
  purchase?.forceReset?.();
  badFoodTip?.dismiss?.();
  kolobokLecture?.dismiss?.();
  replySystem?.hideNutrition?.();
  replySystem?.hideAll();

  document.documentElement.classList.remove(
    'is-lecture-active',
    'is-shop-hint-active',
    'is-tutorial-active'
  );

  clearPurchaseOverlayState();

  if (shopScreen?.isOpen?.()) {
    shopScreen.close();
  }

  ui.footer?.classList.remove('is-hidden');
  syncPurchaseStuckState();
  updateShopButton();
  resumeTimers();
  kickHomeSpawns();
}

function updateShopButton() {
  if (!ui.btnShop) return;
  const allowed = canOpenShop();
  ui.btnShop.classList.toggle('btn--shop-muted', !allowed);
  ui.btnShop.setAttribute('aria-disabled', String(!allowed));
}

function startHomeFoods() {
  if (isSpawnBlocked() || !homeSpawns) return;
  homeSpawns.start();
}

function tryShowHomeGreeting() {
  const cfg = CONFIG.greeting ?? {};
  if (cfg.enabled === false) return;

  const name = gameState.getKolobokName();
  if (!name) return;
  if (tutorial?.isActive?.()) return;
  if (purchase?.isActive?.()) return;
  if (shopUpgradeHint?.isActive?.()) return;

  const sessionKey = cfg.sessionKey ?? 'kolobok-greeting-shown';
  try {
    if (sessionStorage.getItem(sessionKey) === '1') return;
  } catch {
    /* ignore */
  }

  const text = pickGreetingPhrase(name);
  if (!text) return;

  const hideMs = cfg.hideMs ?? 9000;
  showPhrase(text, true, { autoHide: true, hideMs });

  try {
    sessionStorage.setItem(sessionKey, '1');
  } catch {
    /* ignore */
  }

  window.setTimeout(() => {
    if (!tutorial?.isActive?.() && !purchase?.isActive?.()) {
      refreshPhrase(true);
    }
  }, hideMs + 250);
}

function activateHomeScreen() {
  restoreHomeIdleState();
  const greetDelay = CONFIG.greeting?.delayMs ?? 600;
  window.setTimeout(() => tryShowHomeGreeting(), greetDelay);
  window.setTimeout(() => tryShowShopUpgradeHint(), 400);
}

function kolobokEatAnim() {
  if (!ui.kolobok) return;
  ui.kolobok.classList.add('is-eating');
  window.setTimeout(() => {
    ui.kolobok?.classList.remove('is-eating');
  }, CONFIG.homeFoods.eatAnimMs ?? 300);
}

function resolveFoodPoints(food) {
  if (food.kind === 'bad') return 0;
  return CONFIG.homeFoods.good?.points ?? 1;
}

/** +1 к каждому стату за каждые 1000 очков от еды (суммарно по tapScore). */
function applyFoodStatBoostFromTapScore(prevTapScore, nextTapScore) {
  const hcfg = CONFIG.homeFoods ?? {};
  const per = hcfg.statBoostPerPoints ?? 100;
  const amount = hcfg.statBoostAmount ?? 1;
  if (per <= 0 || amount <= 0) return 0;

  const steps =
    Math.floor(nextTapScore / per) - Math.floor(prevTapScore / per);
  if (steps <= 0) return 0;

  CONFIG.statBars.forEach((bar) => {
    gameState.changeStat(bar.key, steps * amount);
    pulseStat(bar.key);
  });
  return steps * amount;
}

function handleFoodCollect({
  food,
  clientX,
  clientY,
  sliced = false,
  fromBlast = false,
  skipHaptic = false,
  blastEatAnim = false,
}) {
  const isBad = food.kind === 'bad';

  if (isBad) {
    if (!skipHaptic) {
      vibrate(pickFoodHaptic(sliced ? 'sliceBad' : 'collectBad'));
    }
    gameState.recordFoodInteraction();
    homeSpawns?.trySpawnToMax?.(true);
    homeSpawns?.ensureSpawnLoop?.();
    if (tutorial?.isActive()) {
      tutorial.onFoodCollected();
      return;
    }
    return;
  }

  const points = resolveFoodPoints(food);

  if (points) {
    const prevTapScore = gameState.get().tapScore;
    gameState.addTapScore(points);
    if (points > 0) {
      const statBoost = applyFoodStatBoostFromTapScore(
        prevTapScore,
        gameState.get().tapScore
      );
      if (statBoost > 0) {
        const effects = {};
        CONFIG.statBars.forEach((bar) => {
          effects[bar.key] = statBoost;
        });
        replySystem?.showFloatingReactions(clientX, clientY, effects);
      }
    }
    updateScoreHub(true);
  }

  if (!skipHaptic) {
    vibrate(pickFoodHaptic(sliced ? 'slice' : 'collectGood'));
  }

  if (blastEatAnim || (!fromBlast && !isBad)) {
    kolobokEatAnim();
  }

  replySystem?.showFoodTapFloats(clientX, clientY, {
    points,
    statPenalty: null,
    sliced,
  });

  gameState.recordFoodInteraction();
  homeSpawns?.trySpawnToMax?.(true);
  homeSpawns?.ensureSpawnLoop?.();

  const stats = gameState.get();
  currentMood = getMood(stats);
  updateKolobokMood(currentMood);

  if (tutorial?.isActive()) {
    tutorial.onFoodCollected();
    return;
  }

  kolobokLecture.tryShowFoodTap(
    food,
    isOnCooldown()
      ? (CONFIG.feedCooldown?.nutritionTipChance ?? 0.4)
      : (CONFIG.replies?.nutritionChance ?? 0.15)
  );
}

function startTimers() {
  const homeTickMs = Math.round(CONFIG.statDecay.tickMs * CONFIG.statDecay.homeSlowdown);
  decayTimerId = setInterval(() => gameState.tickDecay(), homeTickMs);
  phraseTimerId = setInterval(() => rotateHomePhrase(), CONFIG.timers.phraseRotateMs);
  autosaveTimerId = setInterval(() => gameState.save(), CONFIG.timers.autosaveMs);
  criticalWarnTimerId = setInterval(tickCriticalWarnings, 5000);
  if (!isSpawnBlocked()) {
    homeSpawns?.start();
  }
}

function onKolobokEat() {
  /* видео без CSS-анимаций — только loop в файле */
}

/** Тап по пустому месту сцены (эмодзи, очки, улыбка колобка). */
function performStageTap(clientX, clientY) {
  if (shopUpgradeHint?.isActive()) {
    shopUpgradeHint.dismissLater();
    return;
  }
  if (isFeedFlowOnScreen() || runner?.isActive() || tutorial?.isActive()) return;

  if (kolobokLecture?.isActive()) {
    kolobokLecture.dismiss();
  }

  vibrateTap();
  ui.kolobok?.classList.add('is-tap-smile');
  window.setTimeout(() => ui.kolobok?.classList.remove('is-tap-smile'), 400);
  const emoji = TAP_EMOJIS[Math.floor(Math.random() * TAP_EMOJIS.length)];
  const points = tapFx?.perform(clientX, clientY - 30, {
    emojis: [emoji],
    vibrate: false,
  });
  if (points) {
    gameState.changeStat('mood', CONFIG.ui.tapMoodBonus ?? 1);
    gameState.addTapScore(points);
    updateScoreHub(true);
    pulseStat('mood');
  }
  refreshPhrase(true);
}

function bindEvents() {
  eventBus.on('state:changed', onStateChanged);

  ui.btnReceipt.addEventListener('click', () => {
    vibrateTap();
    if (isFeedFlowOnScreen() || runner?.isActive() || tutorial?.isActive()) return;

    kolobokLecture?.dismiss();
    replySystem?.hideAll();

    if (isOnCooldown()) {
      showHomeToast(formatFeedToast(getRemainingMs()));
      return;
    }

    if (CONFIG.foodPhoto?.enabled) {
      homeSpawns?.stop();
      foodPhotoFeed?.open();
      return;
    }

    const stats = gameState.get();
    if (!canRequestReceipt(stats)) {
      showPhrase(getReceiptBlockedPhrase(), true);
      return;
    }
    homeSpawns?.stop();
    purchase.start();
  });

  ui.btnShop?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    vibrateTap();
    openShopScreen();
  });

  ui.btnRun.addEventListener('click', () => {
    vibrateTap();
    if (isHomeBlocked()) return;
    const stats = gameState.get();
    if (!canStartRun(stats)) {
      showPhrase(getBlockRunPhrase(stats), true);
      return;
    }
    runner.start(stats, stats.bestScore || 0);
  });

  ui.kolobok?.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button > 0) return;
      e.stopPropagation();
    },
    true
  );
  ui.kolobok?.addEventListener(
    'pointerup',
    (e) => {
      if (e.button > 0) return;
      performStageTap(e.clientX, e.clientY);
    },
    true
  );
}

function openShopScreen() {
  if (runner?.isActive() || tutorial?.isActive() || badFoodTip?.isActive() || roadmapScreen?.isOpen()) {
    return;
  }
  if (isFeedFlowOnScreen()) return;

  if (purchase?.isActive?.()) {
    purchase.forceReset();
    clearPurchaseOverlayState();
  }

  kolobokLecture?.dismiss?.();
  shopUpgradeHint?.hide();
  replySystem?.hideAll();
  shopTutorial?.forceReset?.();
  shopScreen?.open();
  updateShopButton();
  kickHomeSpawns();
}

function setActionButtonLabels() {
  const receiptStore = document.getElementById('unpack-receipt-store');
  if (receiptStore && CONFIG.ui.receiptStoreHeading) {
    receiptStore.textContent = CONFIG.ui.receiptStoreHeading;
  }
  setReceiptButtonDefault();
  if (ui.btnShop) {
    ui.btnShop.innerHTML = `<span class="btn-icon" aria-hidden="true">${CONFIG.ui.shopButtonIcon ?? '🛍'}</span><span class="btn__text">${CONFIG.ui.shopButton ?? 'Магазин'}</span>`;
  }
  if (ui.btnRun) {
    ui.btnRun.innerHTML = `<span class="btn-icon" aria-hidden="true">${CONFIG.ui.runButtonIcon}</span><span class="btn__text">${CONFIG.ui.runButton}</span>`;
  }
}

function cacheElements() {
  ui.app = document.getElementById('app');
  ui.statsBars = document.getElementById('stats-bars');
  ui.kolobokStage = document.querySelector('.stage-hero') || document.querySelector('.kolobok-stage');
  ui.kolobok = document.getElementById('kolobok');
  ui.kolobokVideoA = document.getElementById('kolobok-video-a');
  ui.kolobokVideoB = document.getElementById('kolobok-video-b');
  ui.scoreHub = document.getElementById('score-hub');
  ui.scoreTotal = document.getElementById('score-total');
  ui.tapFloats = document.getElementById('tap-floats');
  ui.homeSpawns = document.getElementById('home-spawns');
  ui.btnReceipt = document.getElementById('btn-receipt');
  ui.btnShop = document.getElementById('btn-shop');
  ui.btnRun = document.getElementById('btn-run');
  ui.footer = document.getElementById('footer-buttons');
  ui.homeToast = document.getElementById('home-toast');
  ui.homeParticles = document.getElementById('home-particles');
  setActionButtonLabels();
  const btnUnpack = document.getElementById('btn-unpack');
  if (btnUnpack) btnUnpack.textContent = CONFIG.ui.openBagButton;
}

function initRunner() {
  runner = createRunner({
    elements: {
      app: ui.app,
      container: document.getElementById('runner-layer'),
      layer: document.getElementById('runner-layer'),
      canvas: document.getElementById('runner-canvas'),
      homeUi: document.getElementById('home-ui'),
      statsPanel: document.getElementById('runner-stats'),
      statsBars: document.getElementById('runner-stats-bars'),
      hud: document.getElementById('runner-hud'),
      results: document.getElementById('runner-results'),
      distance: document.getElementById('runner-distance'),
      score: document.getElementById('runner-score'),
      toast: document.getElementById('runner-toast'),
      btnSurrender: document.getElementById('runner-surrender'),
      btnAgain: document.getElementById('runner-btn-again'),
      btnHome: document.getElementById('runner-btn-home'),
      resultTitle: document.getElementById('runner-result-title'),
      resultDistance: document.getElementById('runner-result-distance'),
      resultScore: document.getElementById('runner-result-score'),
      resultBest: document.getElementById('runner-result-best'),
      resultRecord: document.getElementById('runner-result-record'),
    },
    callbacks: {
      getStats: () => gameState.get(),
      onStart: () => {
        pauseTimers();
        pauseKolobokVideo();
        replySystem?.hideAll();
      },
      onEnd: (result) => {
        gameState.updateBestDistance(result.distance);
        gameState.updateBestScore(result.score);
        gameState.addRunScore(result.score);
        gameState.save();
        updateScoreHub(true);
        const stats = gameState.get();
        currentMood = getMood(stats);
        updateStatsBars(stats);
      },
      onHome: () => {
        resumeTimers();
        const stats = gameState.get();
        currentMood = getMood(stats);
        updateStatsBars(stats);
        updateScoreHub();
        updateKolobokMood(currentMood);
        resumeHomeVideo();
        activateHomeScreen();
        refreshPhrase(true);
      },
      onRestartBlocked: (phrase) => {
        resumeTimers();
        resumeHomeVideo();
        const stats = gameState.get();
        currentMood = getMood(stats);
        updateStatsBars(stats);
        updateScoreHub();
        updateKolobokMood(currentMood);
        showPhrase(phrase, true);
      },
    },
  });
}

function initFoodPhotoFeed() {
  const hintEl = document.getElementById('food-photo-confirm-hint');
  if (hintEl && CONFIG.foodPhoto?.pickHint) {
    hintEl.textContent = CONFIG.foodPhoto.pickHint;
  }

  foodPhotoFeed = createFoodPhotoFeed({
    callbacks: {
      onStart: () => {
        pauseGameTimers();
        homeSpawns?.stop();
        replySystem?.hideAll();
      },
      onPhrase: (text) => {
        showPhrase(text, true, {
          autoHide: true,
          hideMs: CONFIG.foodPhoto?.phraseHideMs ?? 12000,
        });
      },
      onStatsApplied: () => {
        const stats = gameState.get();
        currentMood = getMood(stats);
        updateStatsBars(stats);
        updateScoreHub(true);
        updateKolobokMood(currentMood);
        CONFIG.statBars.forEach((bar) => pulseStat(bar.key));
      },
      onComplete: () => {
        setLastFeedTimestamp();
        const stats = gameState.get();
        currentMood = getMood(stats);
        updateStatsBars(stats);
        updateKolobokMood(currentMood);
        gameState.save();
        stopFeedCooldownTicker();
        updateReceiptButton(stats);
        ensureFeedCooldownTicker();
        resumeHomeAfterFeed([]);
        resumeHomeVideo();
        refreshPhrase(true);
        positionSpeechBubble({
          bubble: document.getElementById('idle-chat-bubble'),
          dock: document.getElementById('idle-chat-dock'),
          kolobokEl: ui.kolobok,
          stageEl: ui.kolobokStage,
        });
      },
      onClose: () => {
        resumeTimers();
        if (!isOnCooldown()) kickHomeSpawns();
      },
    },
  });
}

function initPurchase() {
  const layer = document.getElementById('purchase-layer');
  purchase = createUnpackingFlow({
    elements: {
      app: ui.app,
      layer,
      stage: ui.kolobokStage,
      kolobok: ui.kolobok,
      speechBubble: document.getElementById('idle-chat-bubble'),
      speechDock: document.getElementById('idle-chat-dock'),
      footer: ui.footer,
      steps: {
        1: layer?.querySelector('[data-unpack-step="1"]'),
        2: layer?.querySelector('[data-unpack-step="2"]'),
        3: layer?.querySelector('[data-unpack-step="3"]'),
        4: layer?.querySelector('[data-unpack-step="4"]'),
      },
      bag: document.getElementById('unpack-bag'),
      confetti: document.getElementById('unpack-confetti'),
      receipt: document.getElementById('unpack-receipt'),
      receiptLines: document.getElementById('unpack-receipt-lines'),
      receiptDivider: document.getElementById('unpack-receipt-divider'),
      receiptTotal: document.getElementById('unpack-receipt-total'),
      btnReceiptNext: document.getElementById('unpack-receipt-next'),
      orbit: document.getElementById('unpack-orbit'),
      btnFridge: document.getElementById('unpack-fridge-btn'),
      statFloats: document.getElementById('unpack-stat-floats'),
      btnHome: document.getElementById('unpack-home-btn'),
    },
    callbacks: {
      onStart: () => {
        pauseGameTimers();
        homeSpawns?.stop();
        replySystem?.hideAll();
      },
      onVideoResume: () => {
        resumeHomeVideo();
      },
      onStatsApplied: () => {
        const stats = gameState.get();
        currentMood = getMood(stats);
        updateStatsBars(stats);
        updateKolobokMood(currentMood);
        CONFIG.statBars.forEach((bar) => pulseStat(bar.key));
        gameState.save();
        updateShopButton();
      },
      onEnd: async (cartItems) => {
        setLastFeedTimestamp();
        const stats = gameState.get();
        currentMood = getMood(stats);
        updateStatsBars(stats);
        updateKolobokMood(currentMood);
        resumeHomeAfterFeed(cartItems);
        resumeHomeVideo();
        window.setTimeout(() => resumeHomeVideo(), 120);
        try {
          await kolobokLecture.showPurchaseReview(cartItems || []);
        } finally {
          syncPurchaseStuckState();
          updateShopButton();
          stopFeedCooldownTicker();
          updateReceiptButton(gameState.get());
          ensureFeedCooldownTicker();
          ensureHomeScreenAwake({ refreshSpeech: true });
          resumeHomeVideo();
          window.setTimeout(() => resumeHomeVideo(), 120);
          refreshPhrase(true);
          positionSpeechBubble({
            bubble: document.getElementById('idle-chat-bubble'),
            dock: document.getElementById('idle-chat-dock'),
            kolobokEl: ui.kolobok,
            stageEl: ui.kolobokStage,
          });
          window.setTimeout(() => tryShowShopUpgradeHint(), 500);
        }
      },
      onPulseStat: pulseStat,
      onKolobokEat,
    },
  });
}

function tickCriticalWarnings() {
  if (isHomeBlocked() || tutorial?.isActive()) return;
  const now = Date.now();
  const interval = CONFIG.criticalStat?.warnIntervalMs ?? 30000;
  if (now - lastCriticalWarnAt < interval) return;

  const stats = gameState.get();
  const threshold = CONFIG.criticalStat?.threshold ?? 15;
  const order = [
    ['thirst', stats.thirst],
    ['hunger', stats.hunger],
    ['health', stats.health],
    ['mood', stats.mood],
  ];
  const low = order.find(([, v]) => v < threshold);
  if (!low) return;

  lastCriticalWarnAt = now;
  showPhrase(getCriticalWarnPhrase(low[0]), true);
}

function dismissBootFatalOverlay() {
  const el = document.getElementById('boot-fatal-error');
  if (el) el.classList.remove('is-visible');
  window.__kolobokLaunched = true;
  if (typeof window.__kolobokClearBootTimer === 'function') {
    window.__kolobokClearBootTimer();
  }
}

function forceHideBootLoader() {
  const root = document.getElementById('boot-loader');
  document.documentElement.classList.remove('boot-loading');
  dismissBootFatalOverlay();
  if (!root) return;
  root.classList.add('is-done');
  root.setAttribute('aria-busy', 'false');
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
}

function showBootFatal(message) {
  const el = document.getElementById('boot-fatal-error');
  const text = document.getElementById('boot-fatal-text');
  if (text) text.textContent = message;
  if (el) el.classList.add('is-visible');
  forceHideBootLoader();
}

async function runCloudOnboardingGate() {
  if (!isFirebaseEnabled()) return;

  await waitForTelegramUser();
  if (!canUseCloudSync()) return;

  try {
    await pullProfile();
  } catch (err) {
    console.warn('Колобок: pull', err);
  }

  await runOnboardingIfNeeded();
  startCloudSync();
  await flushCloudSync().catch(() => {});
}

async function runCloudOnboardingGateCapped() {
  const cap = CONFIG.cloudSync?.blockingMaxMs ?? 6000;
  try {
    await Promise.race([
      runCloudOnboardingGate(),
      new Promise((resolve) => {
        window.setTimeout(resolve, cap);
      }),
    ]);
  } catch (err) {
    console.warn('Колобок: облако', err);
  }
}

export async function launchGame() {
  try {
    document.documentElement.style.setProperty(
      '--purchase-fly-target-y',
      `${CONFIG.purchase.layout.flyTargetY}%`
    );
    cacheElements();
    primeHomeVideoPosters();

    const tgFast = isTelegramMiniApp();
    if (tgFast) {
      assignClipToElement(ui.kolobokVideoA, 0, {
        timeoutMs: CONFIG.loader?.telegramVideoPrimeMs ?? 5000,
      }).catch(() => {});
    }
    if (!tgFast) {
      await runBootLoader({
        rootEl: document.getElementById('boot-loader'),
        tipEl: document.getElementById('boot-loader-tip'),
        barEl: document.getElementById('boot-loader-bar'),
        percentEl: document.getElementById('boot-loader-percent'),
        progressEl: document.getElementById('boot-loader-progress'),
        preloadHomeVideos: bootPreloadHomeVideos,
        telegramFast: false,
      });
    }

    tapFx = createTapFx({
      container: ui.tapFloats,
      kolobokEl: ui.kolobok,
    });
    replySystem = createReplySystem({
      elements: {
        idleBubble: document.getElementById('idle-chat-bubble'),
        nutritionTip: document.getElementById('nutrition-tip'),
        nutritionText: document.getElementById('nutrition-tip-text'),
        nutritionOk: document.getElementById('nutrition-tip-ok'),
        nutritionSkip: document.getElementById('nutrition-tip-skip'),
        actionPrompt: document.getElementById('action-prompt'),
        actionPromptText: document.getElementById('action-prompt-text'),
        floatingReactions: document.getElementById('floating-reactions'),
        stage: ui.kolobokStage,
        speechDock: document.getElementById('idle-chat-dock'),
        kolobokEl: ui.kolobok,
      },
      getHighlightButton: (key) => (key === 'run' ? ui.btnRun : ui.btnReceipt),
    });

    kolobokLecture = createKolobokLecture({
      replySystem,
      onDismiss: () => {
        if (!isFeedFlowOnScreen() && !runner?.isActive() && !tutorial?.isActive()) {
          refreshPhrase(true);
          resumeHomeVideo();
        }
      },
    });

    badFoodTip = createBadFoodTip({
      overlay: document.getElementById('tutorial-overlay'),
      card: document.getElementById('tutorial-card'),
      textEl: document.getElementById('tutorial-text'),
      nextBtn: document.getElementById('tutorial-next'),
      dotsEl: document.getElementById('tutorial-dots'),
      skipBtn: document.getElementById('tutorial-skip'),
      spotlight: document.getElementById('tutorial-spotlight'),
    });

    homeSpawns = createHomeSpawns({
      container: ui.homeSpawns,
      stage: ui.kolobokStage,
      kolobokEl: ui.kolobok,
      isBlocked: () => isSpawnBlocked(),
      isSliceBlocked: () => isSliceBlocked(),
      onBeforeBadCollect: async () => {
        if (tutorial?.isActive() || purchase?.isActive() || runner?.isActive()) return;
        await badFoodTip?.show();
      },
      onCollect: handleFoodCollect,
      onEmptyTap: performStageTap,
    });

    tutorial = createTutorialController({
      overlay: document.getElementById('tutorial-overlay'),
      spotlight: document.getElementById('tutorial-spotlight'),
      card: document.getElementById('tutorial-card'),
      textEl: document.getElementById('tutorial-text'),
      nextBtn: document.getElementById('tutorial-next'),
      skipBtn: document.getElementById('tutorial-skip'),
      dotsEl: document.getElementById('tutorial-dots'),
      stage: ui.kolobokStage,
      kolobokEl: ui.kolobok,
      speechBubble: document.getElementById('idle-chat-bubble'),
      speechDock: document.getElementById('idle-chat-dock'),
      replySystem,
      onStart: () => {
        resumeHomeVideo();
      },
      onComplete: () => {
        document.documentElement.classList.remove('is-tutorial-active');
        resumeTimers();
        activateHomeScreen();
        resumeHomeVideo();
        window.setTimeout(() => resumeHomeVideo(), 120);
        currentPhrase = '';
        refreshPhrase(false);
        tryShowShopUpgradeHint();
      },
      onSpawnTutorialFood: () => homeSpawns?.spawnTutorialFood(),
      onFoodTapped: () => {},
    });

    document.getElementById('btn-tutorial')?.addEventListener('click', (e) => {
      e.stopPropagation();
      resetTutorialFlag();
      document.documentElement.classList.remove('is-tutorial-active');
      pauseTimers();
      homeSpawns?.stop();
      replySystem?.hideAll();
      tutorial?.start({ force: true });
      resumeHomeVideo();
    });
    initKolobokVideo({ warmed: true });
    buildStatsBars();
    initTopPanelChrome();
    roadmapScreen = initRoadmap({
      onOpen: () => {
        replySystem?.hideAll();
        kolobokLecture?.dismiss?.();
      },
    });
    shopTutorial = createShopTutorial();
    shopUpgradeHint = createShopUpgradeHint({
      onOpenShop: () => openShopScreen(),
      onDismiss: () => {
        refreshPhrase(true);
        if (!isSpawnBlocked()) startHomeFoods();
      },
    });
    shopScreen = initShop({
      shopTutorial,
      onShopOpened: () => {
        shopUpgradeHint?.hide();
      },
      onOpen: () => {
        replySystem?.hideAll();
        kolobokLecture?.dismiss?.();
        shopUpgradeHint?.hide();
      },
    });
    initSocialBanner(document.getElementById('social-banner'), {
      onOpenRoadmap: () => {
        homeSpawns?.stop();
        roadmapScreen?.open();
      },
    });
    window.addEventListener('kolobok:roadmap-close', () => {
      if (!isSpawnBlocked()) startHomeFoods();
    });
    window.addEventListener('kolobok:shop-close', () => {
      updateShopButton();
      if (!isSpawnBlocked()) startHomeFoods();
    });
    disposeHomeLayout = initHomeLayout({
      root: ui.app,
      statsPanel: document.getElementById('stats-panel'),
      footer: ui.footer,
      stage: ui.kolobokStage?.querySelector('.stage-hero') || ui.kolobokStage,
    });
    initFoodPhotoFeed();
    initPurchase();
    initRunner();

    disposeParticles = initHomeParticles(ui.homeParticles);

    gameState.load();
    setPhraseNameResolver(() => gameState.getKolobokName());

    renderUI(false);
    bindEvents();

    ensureFeedCooldownTicker();
    startTimers();

    const repositionSpeech = () => {
      const bubble = document.getElementById('idle-chat-bubble');
      if (!bubble?.classList.contains('is-visible')) return;
      positionSpeechBubble({
        bubble,
        dock: document.getElementById('idle-chat-dock'),
        kolobokEl: ui.kolobok,
        stageEl: ui.kolobokStage,
      });
    };

    window.addEventListener('resize', () => {
      if (purchase?.isActive() || tutorial?.isActive()) return;
      repositionSpeech();
    });

    document.documentElement.classList.remove('is-tutorial-active');
    document.querySelectorAll('.tutorial-cutout').forEach((el) => {
      el.classList.remove('tutorial-cutout');
    });
    ensureHomeDockVisible();
    updateShopButton();

    forceHideBootLoader();
    resumeHomeVideo();

    await runCloudOnboardingGateCapped();

    if (!isTutorialCompleted()) {
      pauseGameTimers();
      homeSpawns?.stop();
      tutorial?.start();
      resumeHomeVideo();
    } else {
      activateHomeScreen();
    }

    gameState.save();
    console.log('Колобок: готов');
  } catch (err) {
    console.error('Колобок: ошибка инициализации', err);
    showBootFatal('Не загрузилось, бро. Закрой и открой снова через t.me/Kolobok_na_svazi_Bot/play');
    startHomeFoods();
    resumeHomeVideo();
  } finally {
    forceHideBootLoader();
  }
}

