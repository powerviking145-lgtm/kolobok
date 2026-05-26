import { CONFIG } from './config.js';
import { eventBus } from './eventBus.js';
import { gameState } from './state.js';
import {
  getMood,
  pickPhrase,
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
import { getCriticalWarnPhrase } from './phrases.js';
import { positionSpeechBubble } from './speechPosition.js';
import { createRunner } from './runner/runner.js';
import { createTapFx } from './tapFx.js';
import { createHomeSpawns } from './homeSpawns.js';
import { runBootLoader } from './loader.js';
import { createKolobokLecture } from './kolobokLecture.js';
import { createBadFoodTip } from './badFoodTip.js';
import {
  vibrate,
  vibrateTap,
  pickTapReaction,
  initHomeParticles,
} from './homeUi.js';
import { createReplySystem } from './replySystem.js';
import { createTutorialController, isTutorialCompleted, resetTutorialFlag } from './tutorial.js';

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
  btnRun: null,
  footer: null,
};

let currentMood = 'normal';
let currentPhrase = '';
let decayTimerId = null;
let phraseTimerId = null;
let autosaveTimerId = null;
let purchase = null;
let runner = null;
let tapFx = null;
let homeSpawns = null;
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

function updateStatsBars(stats) {
  const max = CONFIG.stats.max;
  const themes = CONFIG.topPanel?.statThemes ?? {};
  const criticalRatio = CONFIG.topPanel?.criticalRatio ?? 0.15;

  CONFIG.statBars.forEach((bar) => {
    const value = Math.round(stats[bar.key]);
    const theme = themes[bar.key] ?? { rgb: '245, 166, 35', hex: '#F5A623', dark: '#C48412' };
    const fill = ui.statsBars?.querySelector(`[data-fill="${bar.key}"]`);
    const pctEl = ui.statsBars?.querySelector(`[data-pct="${bar.key}"]`);
    const row = ui.statsBars?.querySelector(`[data-stat="${bar.key}"]`);
    const pct = Math.max(0, Math.min(100, (value / max) * 100));

    if (row) {
      row.style.setProperty('--stat-rgb', theme.rgb);
      row.style.setProperty('--stat-color', theme.hex);
      row.style.setProperty('--stat-color-dark', theme.dark);
    }

    if (pctEl) pctEl.textContent = `${Math.round(pct)}%`;

    if (fill) {
      fill.style.width = `${pct}%`;
      fill.style.background = `linear-gradient(90deg, ${theme.dark} 0%, ${theme.hex} 100%)`;
      fill.style.boxShadow = `0 0 0.375rem ${theme.hex}`;
      fill.style.transition = 'width 0.4s ease';
    }

    const isCritical = value / max < criticalRatio;
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

function handleResetProgress(closeMenuSheet) {
  const tp = CONFIG.topPanel ?? {};
  const message = tp.resetConfirm ?? 'Сбросить весь прогресс? Очки обнулятся, статы вернутся к старту.';
  if (!window.confirm(message)) return;

  closeMenuSheet?.();
  kolobokLecture?.dismiss();
  replySystem?.hideAll();
  purchase?.forceReset?.();
  activateHomeScreen();
  gameState.resetProgress();
  currentPhrase = '';
  renderUI(false);
  refreshPhrase(true);
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

      const value = Math.round(gameState.get()[key]);
      const tip = btn.querySelector('.top-stat__tip');
      if (!tip) return;

      tip.textContent = `${value} / ${CONFIG.stats.max}`;
      tip.removeAttribute('hidden');
      btn.classList.add('top-stat--tip-visible');

      if (statTipTimerId) window.clearTimeout(statTipTimerId);
      const hideMs = tp.statTipHideMs ?? 1500;
      statTipTimerId = window.setTimeout(() => {
        tip.setAttribute('hidden', '');
        btn.classList.remove('top-stat--tip-visible');
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

function updateReceiptButton(stats) {
  if (!ui.btnReceipt) return;
  const allowed = canRequestReceipt(stats);
  ui.btnReceipt.disabled = !allowed;
  ui.btnReceipt.classList.toggle('btn--disabled', !allowed);
  ui.btnReceipt.setAttribute('aria-disabled', String(!allowed));
}

function rotateHomePhrase() {
  if (
    purchase?.isActive() ||
    runner?.isActive() ||
    kolobokLecture?.isActive() ||
    tutorial?.isActive() ||
    badFoodTip?.isActive()
  ) {
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

function showPhrase(text, animate = true, { autoHide = false } = {}) {
  currentPhrase = text;
  replySystem?.showIdle(text, { animate, autoHide });
}

function refreshPhrase(animate = true) {
  const stats = gameState.get();
  if (isBurnRunReady(stats)) {
    updateBurnRunUI(stats);
    return;
  }
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

  if (moodChanged && !burnRunActive) {
    refreshPhrase(true);
  }
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
  if (ready) return Promise.resolve();

  const { videoType } = CONFIG.kolobokHome;

  if (videoType) {
    videoEl.innerHTML = '';
    const source = document.createElement('source');
    source.src = clip.src;
    source.type = videoType;
    videoEl.appendChild(source);
  } else {
    videoEl.src = clip.src;
  }

  videoEl.removeAttribute('poster');
  videoEl.load();
  return whenCanPlayThrough(videoEl, options.timeoutMs);
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
  incoming.classList.add('is-visible', 'is-back');
  incoming.play().catch(() => {
    homeVideo.prerolling = false;
    incoming.classList.remove('is-visible', 'is-back');
  });
}

function cutHomeVideos() {
  const outgoing = homeVideo.active;
  const incoming = homeVideo.buffer;
  if (!outgoing || !incoming) return;

  outgoing.classList.remove('is-visible', 'is-front');
  outgoing.pause();
  outgoing.currentTime = 0;

  incoming.classList.remove('is-back');
  incoming.classList.add('is-visible', 'is-front');

  homeVideo.active = incoming;
  homeVideo.buffer = outgoing;
  homeVideo.prerolling = false;
  homeVideo.preloading = false;

  assignClipToElement(outgoing, pickNextHomeVideoIndex()).catch(() => {});
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

  const incoming = homeVideo.buffer;
  if (!homeVideo.prerolling && incoming) {
    if (incoming.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      await assignClipToElement(incoming, pickNextHomeVideoIndex());
    }
    incoming.currentTime = 0;
    incoming.classList.add('is-visible', 'is-back');
    try {
      await incoming.play();
      homeVideo.prerolling = true;
    } catch {
      await assignClipToElement(incoming, pickNextHomeVideoIndex());
      await incoming.play();
      homeVideo.prerolling = true;
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

  if (options.warmed) {
    startPlayback();
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

function resumeTimers() {
  if (!decayTimerId) {
    const homeTickMs = Math.round(CONFIG.statDecay.tickMs * CONFIG.statDecay.homeSlowdown);
    decayTimerId = setInterval(() => gameState.tickDecay(), homeTickMs);
  }
  if (!phraseTimerId) {
    phraseTimerId = setInterval(() => {
      if (
        !purchase?.isActive() &&
        !runner?.isActive() &&
        !kolobokLecture?.isActive() &&
        !tutorial?.isActive() &&
        !badFoodTip?.isActive()
      ) {
        rotateHomePhrase();
      }
    }, CONFIG.timers.phraseRotateMs);
  }
  if (!autosaveTimerId) {
    autosaveTimerId = setInterval(() => gameState.save(), CONFIG.timers.autosaveMs);
  }
  if (
    !isSpawnBlocked()
  ) {
    homeSpawns?.start();
  }
}

function isHomeBlocked() {
  return (
    purchase?.isActive() ||
    runner?.isActive() ||
    kolobokLecture?.isActive() ||
    tutorial?.isActive() ||
    badFoodTip?.isActive()
  );
}

function isSpawnBlocked() {
  return (
    purchase?.isActive() ||
    runner?.isActive() ||
    tutorial?.isActive() ||
    badFoodTip?.isActive()
  );
}

function isSliceBlocked() {
  return purchase?.isActive() || runner?.isActive() || badFoodTip?.isActive();
}

function clearPurchaseOverlayState() {
  ui.app?.classList.remove('is-purchase-active', 'is-unpack-reaction');
  const layer = document.getElementById('purchase-layer');
  if (layer) {
    layer.setAttribute('hidden', '');
    layer.hidden = true;
    layer.classList.remove('is-reaction-step');
  }
  ui.footer?.classList.remove('is-hidden');
}

function startHomeFoods() {
  if (isSpawnBlocked() || !homeSpawns) return;
  homeSpawns.start();
}

function activateHomeScreen() {
  clearPurchaseOverlayState();
  startHomeFoods();
}

function kolobokEatAnim() {
  if (!ui.kolobok) return;
  ui.kolobok.classList.add('is-eating');
  window.setTimeout(() => {
    ui.kolobok?.classList.remove('is-eating');
  }, CONFIG.homeFoods.eatAnimMs ?? 300);
}

function resolveFoodPoints(food) {
  if (food.kind === 'bad') return CONFIG.homeFoods.bad?.points ?? -1;
  return CONFIG.homeFoods.good?.points ?? 1;
}

function kolobokBadBiteAnim() {
  if (!ui.kolobok) return;
  ui.kolobok.classList.add('is-bad-bite');
  window.setTimeout(() => {
    ui.kolobok?.classList.remove('is-bad-bite');
  }, CONFIG.homeFoods.badFx?.biteAnimMs ?? 520);
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

function handleFoodCollect({ food, clientX, clientY, sliced = false }) {
  const isBad = food.kind === 'bad';
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

  const scfg = CONFIG.homeFoods.slice ?? {};
  if (sliced) {
    vibrate(
      isBad
        ? (scfg.bombVibrateMs ?? [36, 24, 32, 18])
        : scfg.vibrateMs ?? [14, 22, 16]
    );
  } else {
    vibrate(isBad ? (scfg.bombVibrateMs ?? [36, 24, 32]) : 12);
  }

  if (isBad) {
    kolobokBadBiteAnim();
  } else {
    kolobokEatAnim();
  }

  replySystem?.showFoodTapFloats(clientX, clientY, {
    points,
    statPenalty: null,
    sliced,
  });

  gameState.recordFoodInteraction();
  homeSpawns?.trySpawnToMax?.();

  const stats = gameState.get();
  currentMood = getMood(stats);
  updateKolobokMood(currentMood);

  if (tutorial?.isActive()) {
    tutorial.onFoodCollected();
    return;
  }

  if (isBad) {
    startHomeFoods();
    return;
  }

  kolobokLecture.tryShowFoodTap(food).finally(() => {
    startHomeFoods();
  });
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
  if (purchase?.isActive() || runner?.isActive() || tutorial?.isActive()) return;

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
    if (purchase?.isActive() || runner?.isActive() || tutorial?.isActive()) return;

    kolobokLecture?.dismiss();
    replySystem?.hideAll();

    const stats = gameState.get();
    if (!canRequestReceipt(stats)) {
      showPhrase(getReceiptBlockedPhrase(), true);
      return;
    }
    homeSpawns?.stop();
    purchase.start();
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
}

function setActionButtonLabels() {
  const receiptStore = document.getElementById('unpack-receipt-store');
  if (receiptStore && CONFIG.ui.receiptStoreHeading) {
    receiptStore.textContent = CONFIG.ui.receiptStoreHeading;
  }
  if (ui.btnReceipt) {
    ui.btnReceipt.innerHTML = `<span class="btn-icon" aria-hidden="true">${CONFIG.ui.receiptButtonIcon}</span><span class="btn__text">${CONFIG.ui.unpackButton}</span>`;
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
  ui.btnRun = document.getElementById('btn-run');
  ui.footer = document.getElementById('footer-buttons');
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
      },
      onEnd: async (cartItems) => {
        clearPurchaseOverlayState();
        resumeTimers();
        const stats = gameState.get();
        currentMood = getMood(stats);
        updateStatsBars(stats);
        updateKolobokMood(currentMood);
        if (cartItems?.length) {
          homeSpawns?.spawnCartItems?.(cartItems);
        }
        startHomeFoods();
        resumeHomeVideo();
        window.setTimeout(() => resumeHomeVideo(), 120);
        try {
          await kolobokLecture.showPurchaseReview(cartItems || []);
        } finally {
          clearPurchaseOverlayState();
          startHomeFoods();
          resumeHomeVideo();
          window.setTimeout(() => resumeHomeVideo(), 120);
          refreshPhrase(true);
          positionSpeechBubble({
            bubble: document.getElementById('idle-chat-bubble'),
            dock: document.getElementById('idle-chat-dock'),
            kolobokEl: ui.kolobok,
            stageEl: ui.kolobokStage,
          });
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

function forceHideBootLoader() {
  const root = document.getElementById('boot-loader');
  document.documentElement.classList.remove('boot-loading');
  if (!root) return;
  root.classList.add('is-done');
  root.setAttribute('aria-busy', 'false');
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
}

async function init() {
  const bootRoot = document.getElementById('boot-loader');

  try {
    initViewport();
    document.documentElement.style.setProperty(
      '--purchase-fly-target-y',
      `${CONFIG.purchase.layout.flyTargetY}%`
    );
    cacheElements();

    await runBootLoader({
      rootEl: bootRoot,
      tipEl: document.getElementById('boot-loader-tip'),
      barEl: document.getElementById('boot-loader-bar'),
      percentEl: document.getElementById('boot-loader-percent'),
      progressEl: document.getElementById('boot-loader-progress'),
      preloadHomeVideos: bootPreloadHomeVideos,
    });

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
        if (!purchase?.isActive() && !runner?.isActive() && !tutorial?.isActive()) {
          resumeTimers();
          startHomeFoods();
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
    initPurchase();
    initRunner();

    disposeParticles = initHomeParticles(ui.homeParticles);

    gameState.load();
    renderUI(false);
    bindEvents();
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
    clearPurchaseOverlayState();

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
    startHomeFoods();
    resumeHomeVideo();
  } finally {
    forceHideBootLoader();
  }
}

init();
