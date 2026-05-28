import { CONFIG } from './config.js';
import { vibrateAchievement } from './homeUi.js';
import { positionSpeechBubble } from './speechPosition.js';

const STORAGE_KEY = 'tutorialCompleted';

export function isTutorialCompleted() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function resetTutorialFlag() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createTutorialController({
  overlay,
  spotlight,
  card,
  textEl,
  examplesEl,
  nextBtn,
  stepSkipBtn,
  skipBtn,
  dotsEl,
  stage,
  kolobokEl,
  speechBubble,
  speechDock,
  replySystem,
  onComplete,
  onStart,
  onFoodTapped,
  onSpawnTutorialFood,
  onRequestPhotoFeed,
  onUnlock,
}) {
  const steps = CONFIG.tutorial.steps;
  let currentStep = 0;
  let active = false;
  let finishing = false;
  let resizeHandler = null;
  let spotlightTarget = null;
  let stepSkipTimerId = null;

  function hideStepSkip() {
    if (stepSkipTimerId) {
      window.clearTimeout(stepSkipTimerId);
      stepSkipTimerId = null;
    }
    if (!stepSkipBtn) return;
    stepSkipBtn.setAttribute('hidden', '');
    stepSkipBtn.style.display = 'none';
  }

  function scheduleStepSkip(step) {
    hideStepSkip();
    if (!stepSkipBtn) return;
    if (step?.action === 'wait_for_photo_feed') return;
    const isWaitingStep =
      step?.action === 'wait_for_tap' ||
      step?.action === 'wait_for_photo_feed';
    if (!isWaitingStep) return;
    stepSkipBtn.textContent = CONFIG.tutorial?.stepSkipLabel ?? 'Пропустить шаг';
    const isCritical = step?.action === 'wait_for_photo_feed';
    const delay = Math.floor(
      isCritical
        ? (CONFIG.tutorial?.stepSkipDelayCriticalMs ?? 3000)
        : (CONFIG.tutorial?.stepSkipDelayMs ?? 6000)
    );
    stepSkipTimerId = window.setTimeout(() => {
      if (!active) return;
      stepSkipBtn.removeAttribute('hidden');
      stepSkipBtn.style.display = '';
    }, delay);
  }

  function renderDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = steps
      .map((_, i) => `<span class="tutorial-dot${i === currentStep ? ' is-active' : ''}"></span>`)
      .join('');
  }

  function renderExamples(step) {
    if (!examplesEl) return;
    const examples = Array.isArray(step?.examples) ? step.examples : [];
    if (!examples.length) {
      examplesEl.setAttribute('hidden', '');
      examplesEl.replaceChildren();
      return;
    }
    examplesEl.innerHTML = examples
      .map((item) => {
        const src = String(item?.src ?? '').trim();
        if (!src) return '';
        const label = String(item?.label ?? '').trim();
        return `
          <figure class="tutorial-example">
            <img src="${src}" alt="${label || 'Пример фото'}" loading="lazy" decoding="async" />
            ${label ? `<figcaption>${label}</figcaption>` : ''}
          </figure>
        `;
      })
      .join('');
    if (examplesEl.innerHTML.trim()) {
      examplesEl.removeAttribute('hidden');
    } else {
      examplesEl.setAttribute('hidden', '');
    }
  }

  /** Реальные границы оверлея — для spotlight и привязки к target. */
  function overlayBounds() {
    const base = overlay?.getBoundingClientRect();
    if (base?.width && base?.height) return base;
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
  }

  /** Видимая зона оверлея (для clamp карточки на мобилке). */
  function overlayRect() {
    const base = overlayBounds();
    const vv = window.visualViewport;
    if (!vv) return base;

    const top = Math.max(0, vv.offsetTop - base.top);
    const height = Math.min(base.height, vv.height);
    return {
      left: base.left,
      top: base.top + top,
      width: base.width,
      height,
      right: base.right,
      bottom: base.top + top + height,
    };
  }

  function measureCardSize() {
    if (!card) return { w: 280, h: 160 };
    const prev = card.style.visibility;
    card.style.visibility = 'hidden';
    card.style.display = 'block';
    const rect = card.getBoundingClientRect();
    card.style.visibility = prev;
    return {
      w: rect.width || 280,
      h: rect.height || 160,
    };
  }

  function clampInOverlay(left, top, cardW, cardH, pad) {
    const b = overlayBounds();
    const maxLeft = Math.max(pad, b.width - cardW - pad);
    const maxTop = Math.max(pad, b.height - cardH - pad);
    return {
      left: Math.max(pad, Math.min(left, maxLeft)),
      top: Math.max(pad, Math.min(top, maxTop)),
    };
  }

  function getStatsFocusElement() {
    return (
      document.getElementById('stats-bars') ||
      document.querySelector('.top-panel__row--stats')
    );
  }

  function clearSpotlight() {
    spotlight?.setAttribute('hidden', '');
    spotlight?.classList.remove('tutorial-spotlight--full', 'tutorial-spotlight--stats');
    document.querySelectorAll('.tutorial-cutout').forEach((el) => {
      el.classList.remove('tutorial-cutout');
      el.style.removeProperty('--tutorial-dim');
    });
    document.querySelectorAll('.tutorial-highlight').forEach((el) => {
      el.classList.remove('tutorial-highlight');
    });
    spotlightTarget = null;
  }

  function resetTutorialVisuals() {
    clearSpotlight();
    hideStepSkip();
    hideDemoSpeech();
    document.querySelectorAll('.tutorial-food').forEach((el) => el.remove());
    document.querySelectorAll('.food-photo-choice').forEach((el) => {
      el.classList.remove('tutorial-highlight', 'tutorial-cutout');
    });
    document.getElementById('food-photo-done')?.classList.remove('tutorial-highlight', 'tutorial-cutout');
    if (card) {
      card.classList.remove('tutorial-card--examples');
      card.style.removeProperty('display');
    }
    overlay?.setAttribute('hidden', '');
    overlay?.setAttribute('aria-hidden', 'true');
    overlay?.classList.add('tutorial-overlay--off');
    document.documentElement.classList.remove('is-tutorial-active');
  }

  /** Колобок — кнопка на весь stage; подсветка только по центру (персонаж). */
  function getKolobokFocusRect() {
    const stageEl = stage || document.querySelector('.stage-hero');
    if (!stageEl) return null;
    const r = stageEl.getBoundingClientRect();
    const w = r.width * 0.52;
    const h = r.height * 0.48;
    return {
      left: r.left + (r.width - w) / 2,
      top: r.top + r.height * 0.2,
      width: w,
      height: h,
    };
  }

  function applySpotlightRect(rect, dimColor, highlightEl = null) {
    clearSpotlight();
    if (!spotlight || !overlay || !rect) return;

    const pad = CONFIG.tutorial.spotlightPad ?? 10;
    const o = overlayBounds();

    spotlight.classList.remove('tutorial-spotlight--full');
    spotlight.style.left = `${rect.left - o.left - pad}px`;
    spotlight.style.top = `${rect.top - o.top - pad}px`;
    spotlight.style.width = `${rect.width + pad * 2}px`;
    spotlight.style.height = `${rect.height + pad * 2}px`;
    spotlight.style.background = 'transparent';
    spotlight.style.setProperty('--tutorial-dim', dimColor);
    spotlight.style.boxShadow = `0 0 0 9999px ${dimColor}`;
    spotlight.removeAttribute('hidden');

    if (highlightEl) {
      highlightEl.classList.add('tutorial-highlight', 'tutorial-cutout');
      spotlightTarget = highlightEl;
    } else {
      spotlightTarget = null;
    }
  }

  function applySpotlight(target, dimColor, options = {}) {
    clearSpotlight();
    if (!spotlight || !overlay) return;

    const statsFocus = options.statsFocus === true;

    if (target?.id === 'kolobok') {
      const focus = getKolobokFocusRect();
      if (focus) {
        applySpotlightRect(focus, dimColor);
        return;
      }
    }

    const pad = CONFIG.tutorial.spotlightPad ?? 10;
    const o = overlayBounds();

    if (!target) {
      spotlight.classList.add('tutorial-spotlight--full');
      spotlight.style.left = '0';
      spotlight.style.top = '0';
      spotlight.style.width = '100%';
      spotlight.style.height = '100%';
      spotlight.style.borderRadius = '0';
      spotlight.style.background = dimColor;
      spotlight.style.boxShadow = 'none';
      spotlight.removeAttribute('hidden');
      return;
    }

    spotlight.classList.remove('tutorial-spotlight--full');
    const rect = target.getBoundingClientRect();
    spotlight.style.left = `${rect.left - o.left - pad}px`;
    spotlight.style.top = `${rect.top - o.top - pad}px`;
    spotlight.style.width = `${rect.width + pad * 2}px`;
    spotlight.style.height = `${rect.height + pad * 2}px`;
    spotlight.style.background = 'transparent';
    spotlight.style.setProperty('--tutorial-dim', dimColor);
    if (statsFocus) {
      spotlight.classList.add('tutorial-spotlight--stats');
      spotlight.style.boxShadow = `0 0 0 9999px ${dimColor}, 0 0 1.1rem 0.35rem rgba(255, 184, 77, 0.65)`;
    } else {
      spotlight.style.boxShadow = `0 0 0 9999px ${dimColor}`;
    }
    spotlight.removeAttribute('hidden');

    target.classList.add('tutorial-highlight', 'tutorial-cutout');
    spotlightTarget = target;
  }

  function layoutFeedDoneSpotlight(step, attempt = 0) {
    const dim =
      step.dim === 'light'
        ? CONFIG.tutorial.dimLight || 'rgba(0,0,0,0.45)'
        : CONFIG.tutorial.dimStrong || 'rgba(0,0,0,0.75)';
    clearSpotlight();
    const btn = document.getElementById('food-photo-done');
    if (!btn || btn.hidden || !btn.offsetParent) {
      if (attempt < 30) {
        window.setTimeout(() => layoutFeedDoneSpotlight(step, attempt + 1), 50);
      }
      return;
    }
    const pad = step.spotlightPad ?? CONFIG.tutorial.spotlightPad ?? 10;
    const rect = btn.getBoundingClientRect();
    applySpotlightRect(rect, dim, btn);
    spotlightTarget = btn;
    positionCard(step);
  }

  function layoutUnionSpotlight(step) {
    const dim =
      step.dim === 'light'
        ? CONFIG.tutorial.dimLight || 'rgba(0,0,0,0.45)'
        : CONFIG.tutorial.dimStrong || 'rgba(0,0,0,0.75)';
    const selectors = Array.isArray(step.spotlightSelectors) ? step.spotlightSelectors : [];
    const elements = selectors
      .map((sel) => document.querySelector(sel))
      .filter(Boolean);
    const rects = elements
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    clearSpotlight();
    if (!rects.length) {
      applySpotlight(null, dim);
      positionCard(step);
      return;
    }

    const union = rects.reduce(
      (acc, r) => ({
        left: Math.min(acc.left, r.left),
        top: Math.min(acc.top, r.top),
        right: Math.max(acc.right, r.right),
        bottom: Math.max(acc.bottom, r.bottom),
      }),
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
    );
    const rect = {
      left: union.left,
      top: union.top,
      width: union.right - union.left,
      height: union.bottom - union.top,
    };

    elements.forEach((el) => el.classList.add('tutorial-highlight', 'tutorial-cutout'));
    applySpotlightRect(rect, dim);
    spotlightTarget = elements[0] ?? null;
    positionCard(step);
  }

  function layoutConfirmChoicesSpotlight(step, attempt = 0) {
    const dim =
      step.dim === 'light'
        ? CONFIG.tutorial.dimLight || 'rgba(0,0,0,0.45)'
        : CONFIG.tutorial.dimStrong || 'rgba(0,0,0,0.75)';
    const choices =
      document.getElementById('food-photo-choices') ||
      document.querySelector('.food-photo-choices');
    if (!choices || !choices.offsetParent) {
      if (attempt < 30) {
        window.setTimeout(() => layoutConfirmChoicesSpotlight(step, attempt + 1), 50);
      }
      return;
    }
    clearSpotlight();
    const rect = choices.getBoundingClientRect();
    applySpotlightRect(rect, dim, choices);
    choices.querySelectorAll('.food-photo-choice').forEach((btn) => {
      btn.classList.add('tutorial-highlight', 'tutorial-cutout');
    });
    spotlightTarget = choices;
    positionCard(step);
  }

  function layoutStepSpotlight(step) {
    const dim =
      step.dim === 'light'
        ? CONFIG.tutorial.dimLight || 'rgba(0,0,0,0.45)'
        : CONFIG.tutorial.dimStrong || 'rgba(0,0,0,0.75)';

    let target = null;
    if (step.id === 'stats') {
      target = getStatsFocusElement();
    } else if (step.targetSelector) {
      target = document.querySelector(step.targetSelector);
    }

    if (step.noSpotlight) {
      clearSpotlight();
      applySpotlight(null, dim);
      positionCard(step);
      return;
    }

    if (step.id === 'speech_example' && step.demoSpeech) {
      applySpotlight(null, dim);
      showDemoSpeech(step.demoSpeech);
      positionCard(step);
      return;
    }

    if (Array.isArray(step.spotlightSelectors) && step.spotlightSelectors.length) {
      layoutUnionSpotlight(step);
      return;
    }

    if (step.action === 'show_confirm_demo') {
      layoutConfirmChoicesSpotlight(step);
      return;
    }

    if (step.action === 'wait_for_photo_feed' && step.targetSelector === '#food-photo-done') {
      layoutFeedDoneSpotlight(step);
      return;
    }

    if (step.action === 'wait_for_tap') {
      onSpawnTutorialFood?.();
      let food = document.querySelector('.tutorial-food:not(.is-collected)');
      if (!food) {
        onSpawnTutorialFood?.();
        food = document.querySelector('.tutorial-food:not(.is-collected)');
      }
      applySpotlight(food || target, dim);
      positionCard(step);
      return;
    }

    applySpotlight(target, dim, {
      statsFocus: step.id === 'stats' || step.statsFocus === true,
    });
    positionCard(step);
  }

  function positionCardBelowTarget(step, selector) {
    if (!card) return false;
    const target = document.querySelector(selector || step.targetSelector || '');
    if (!target) return false;

    const b = overlayBounds();
    const pad = Math.max(12, Math.min(20, b.width * 0.04));
    const rect = target.getBoundingClientRect();
    const { h: cardH } = measureCardSize();

    card.classList.remove(
      'tutorial-card--center',
      'tutorial-card--top',
      'tutorial-card--bottom',
      'tutorial-card--bottom-left',
      'tutorial-card--side'
    );
    card.classList.add('tutorial-card--below-target');
    const top = Math.min(rect.bottom - b.top + pad, Math.max(pad, b.height - cardH - pad));
    card.style.left = '50%';
    card.style.top = `${top}px`;
    card.style.transform = 'translate(-50%, 0)';
    return true;
  }

  function positionCard(step) {
    if (!card) return;
    const b = overlayBounds();
    const pad = Math.max(12, Math.min(20, b.width * 0.04));
    let placement = step.cardPlacement || 'center';

    if (step.cardPlacement === 'below-target' || step.id === 'welcome') {
      if (positionCardBelowTarget(step, step.targetSelector || '#stats-bars')) return;
    }

    if (step.id === 'feed_wait' || step.id === 'feed_manual_pick') {
      placement = 'top';
      const { w: cardW, h: cardH } = measureCardSize();
      card.classList.remove(
        'tutorial-card--center',
        'tutorial-card--top',
        'tutorial-card--bottom',
        'tutorial-card--bottom-left',
        'tutorial-card--side'
      );
      card.classList.add('tutorial-card--top');
      card.style.left = '50%';
      card.style.top = `${pad}px`;
      card.style.transform = 'translate(-50%, 0)';
      return;
    }

    if (step.id === 'speech_example') {
      placement = 'bottom';
      const { w: cardW, h: cardH } = measureCardSize();
      card.classList.remove(
        'tutorial-card--center',
        'tutorial-card--top',
        'tutorial-card--bottom',
        'tutorial-card--bottom-left',
        'tutorial-card--side'
      );
      card.classList.add('tutorial-card--bottom');
      card.style.left = '50%';
      card.style.top = `${Math.max(pad, b.height - cardH - pad)}px`;
      card.style.transform = 'translate(-50%, 0)';
      return;
    }
    card.classList.remove(
      'tutorial-card--center',
      'tutorial-card--top',
      'tutorial-card--bottom',
      'tutorial-card--bottom-left',
      'tutorial-card--side'
    );
    card.style.transform = '';

    let target = null;
    if (step.id === 'stats') {
      target = getStatsFocusElement();
    } else if (step.targetSelector) {
      target = document.querySelector(step.targetSelector);
    }

    if (b.width < 380 && (placement === 'side' || placement === 'bottom-left')) {
      placement = 'bottom';
    }

    const { w: cardW, h: cardH } = measureCardSize();

    if (placement === 'bottom' && target) {
      card.classList.add('tutorial-card--bottom');
      card.style.left = '50%';
      card.style.top = `${Math.max(pad, b.height - cardH - pad)}px`;
      card.style.transform = 'translate(-50%, 0)';
      return;
    }

    if (!target || placement === 'center') {
      card.classList.add('tutorial-card--center');
      card.style.left = '50%';
      card.style.top = '50%';
      card.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = target.getBoundingClientRect();
    let left;
    let top;
    let transform = 'none';

    switch (placement) {
      case 'top':
        card.classList.add('tutorial-card--top');
        left = rect.left + rect.width / 2 - b.left;
        top = rect.top - b.top - cardH - pad;
        transform = 'translate(-50%, 0)';
        if (top < pad) {
          top = rect.bottom - b.top + pad;
          card.classList.remove('tutorial-card--top');
          card.classList.add('tutorial-card--bottom');
        }
        break;
      case 'bottom':
        card.classList.add('tutorial-card--bottom');
        left = rect.left + rect.width / 2 - b.left;
        top = rect.bottom - b.top + pad;
        transform = 'translate(-50%, 0)';
        break;
      case 'bottom-left':
        card.classList.add('tutorial-card--bottom-left');
        left = rect.left + rect.width / 2 - b.left - cardW / 2;
        top = rect.bottom - b.top + pad;
        transform = 'none';
        break;
      case 'side':
        card.classList.add('tutorial-card--side');
        left = rect.right - b.left + pad;
        top = rect.top - b.top + rect.height * 0.12;
        if (left + cardW > b.width - pad) {
          left = rect.left - b.left - cardW - pad;
        }
        if (left < pad) {
          left = rect.left + rect.width / 2 - b.left;
          top = rect.bottom - b.top + pad;
          transform = 'translate(-50%, 0)';
          card.classList.remove('tutorial-card--side');
          card.classList.add('tutorial-card--bottom');
        }
        break;
      default:
        card.classList.add('tutorial-card--center');
        left = b.width / 2;
        top = b.height / 2;
        transform = 'translate(-50%, -50%)';
    }

    if (transform === 'translate(-50%, -50%)') {
      card.style.left = '50%';
      card.style.top = '50%';
      card.style.transform = transform;
      return;
    }

    if (transform === 'translate(-50%, 0)') {
      const clamped = clampInOverlay(left - cardW / 2, top, cardW, cardH, pad);
      card.style.left = `${clamped.left + cardW / 2}px`;
      card.style.top = `${clamped.top}px`;
      card.style.transform = transform;
      return;
    }

    const clamped = clampInOverlay(left, top, cardW, cardH, pad);
    card.style.left = `${clamped.left}px`;
    card.style.top = `${clamped.top}px`;
    card.style.transform = transform;
  }

  function showDemoSpeech(text) {
    if (!speechBubble || !speechDock) return;
    document.documentElement.classList.add('is-lecture-active');
    speechBubble.textContent = text;
    speechBubble.classList.remove('is-hidden');
    speechBubble.classList.add('is-visible', 'is-tutorial-demo');
    positionSpeechBubble({
      bubble: speechBubble,
      dock: speechDock,
      kolobokEl,
      stageEl: stage,
    });
  }

  function hideDemoSpeech() {
    speechBubble?.classList.remove('is-visible', 'is-tutorial-demo');
    speechBubble?.classList.add('is-hidden');
    document.documentElement.classList.remove('is-lecture-active');
  }

  function armUnlock() {
    resetTutorialVisuals();
    onUnlock?.();
  }

  function finalizeTutorial() {
    if (finishing) return;
    finishing = true;
    active = false;
    armUnlock();
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    hideDemoSpeech();
    localStorage.setItem(STORAGE_KEY, 'true');
    window.requestAnimationFrame(() => armUnlock());
    window.setTimeout(() => armUnlock(), 50);
    window.setTimeout(() => armUnlock(), 300);
    onComplete?.();
  }

  function finish() {
    finalizeTutorial();
  }

  function playFinale() {
    if (!stage) return;
    const emojis = ['🎉', '✨', '🎊', '⭐', '🟡'];
    const o = overlayRect();
    const rect = kolobokEl?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : o.left + o.width / 2;
    const cy = rect ? rect.top + rect.height / 3 : o.top + o.height / 2;

    kolobokEl?.classList.add('is-tutorial-celebrate');
    window.setTimeout(() => kolobokEl?.classList.remove('is-tutorial-celebrate'), 600);
    vibrateAchievement();

    emojis.forEach((emoji, i) => {
      const angle = (i / emojis.length) * Math.PI * 2;
      const dx = Math.cos(angle) * 72;
      const dy = Math.sin(angle) * 72;
      const el = document.createElement('span');
      el.className = 'tutorial-firework';
      el.textContent = emoji;
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      el.style.setProperty('--fw-x', `${dx}px`);
      el.style.setProperty('--fw-y', `${dy}px`);
      (overlay || document.body).appendChild(el);
      window.setTimeout(() => el.remove(), 1200);
    });
  }

  function showStep(index) {
    const step = steps[index];
    if (!step) {
      armUnlock();
      playFinale();
      window.setTimeout(finalizeTutorial, 900);
      return;
    }

    currentStep = index;
    renderDots();
    if (textEl) textEl.textContent = step.text;
    renderExamples(step);
    if (card) {
      card.style.visibility = 'visible';
      card.style.display = 'block';
      card.removeAttribute('hidden');
      const hasExamples = Array.isArray(step?.examples) && step.examples.length > 0;
      card.classList.toggle('tutorial-card--examples', hasExamples);
    }
    overlay?.classList.remove('tutorial-overlay--off');

    replySystem?.hideAll();
    hideDemoSpeech();

    const waitTap = step.action === 'wait_for_tap';
    const waitPhotoFeed = step.action === 'wait_for_photo_feed';
    const confirmDemo = step.action === 'show_confirm_demo';
    if (nextBtn) {
      nextBtn.hidden = waitTap || waitPhotoFeed;
      nextBtn.style.display = waitTap || waitPhotoFeed ? 'none' : '';
      nextBtn.textContent = step.buttonText || 'Дальше';
    }
    if (stepSkipBtn) {
      if (waitPhotoFeed) {
        hideStepSkip();
      } else {
        scheduleStepSkip(step);
      }
    }

    if (confirmDemo) {
      window.setTimeout(() => onRequestPhotoFeed?.(step), 80);
    }

    if (waitPhotoFeed) {
      window.setTimeout(() => {
        onRequestPhotoFeed?.(step);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => layoutStepSpotlight(step));
        });
      }, 120);
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => layoutStepSpotlight(step));
    });

    if (step.action === 'open_photo_modal') {
      window.setTimeout(() => onRequestPhotoFeed?.(step), 120);
    }
  }

  function onFoodCollected() {
    const step = steps[currentStep];
    if (!active || step?.action !== 'wait_for_tap') return;
    onFoodTapped?.();
    window.setTimeout(() => goNext(), 450);
  }

  function onPhotoFeedCompleted() {
    const step = steps[currentStep];
    if (!active || step?.action !== 'wait_for_photo_feed') return;
    window.setTimeout(() => goNext(), 450);
  }

  function goNext() {
    hideStepSkip();
    hideDemoSpeech();
    if (currentStep >= steps.length - 1) {
      armUnlock();
      playFinale();
      window.setTimeout(finalizeTutorial, 900);
      return;
    }
    showStep(currentStep + 1);
  }

  function start({ force = false } = {}) {
    if (active && !force) return;
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    active = false;
    finishing = false;
    resetTutorialVisuals();
    active = true;
    currentStep = 0;
    overlay?.classList.remove('tutorial-overlay--off');
    overlay?.removeAttribute('hidden');
    overlay?.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('is-tutorial-active');
    replySystem?.hideAll();

    resizeHandler = () => {
      const step = steps[currentStep];
      if (step) layoutStepSpotlight(step);
    };
    window.addEventListener('resize', resizeHandler);

    onStart?.();
    showStep(0);
  }

  if (nextBtn) nextBtn.addEventListener('click', goNext);
  if (stepSkipBtn) {
    stepSkipBtn.addEventListener('click', () => {
      if (!active) return;
      goNext();
    });
  }
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      hideDemoSpeech();
      armUnlock();
      playFinale();
      window.setTimeout(finalizeTutorial, 400);
    });
  }

  return {
    start,
    isActive: () => active,
    onFoodCollected,
    onPhotoFeedCompleted,
    skip: finish,
  };
}
