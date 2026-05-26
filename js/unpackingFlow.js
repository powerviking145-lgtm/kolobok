import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { positionSpeechBubble } from './speechPosition.js';
import {
  getUnpackReactionIntro,
  getUnpackCartItemTapPhrase,
  getUnpackFinalPhrase,
} from './phrases.js';
import { vibrateTap } from './homeUi.js';

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickDemoCart() {
  const ids = ['banana', 'cheese', 'eggs'];
  return CONFIG.items.filter((i) => ids.includes(i.id));
}

function spawnConfetti(container, count = 18) {
  if (!container) return;
  container.replaceChildren();
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement('span');
    p.className = 'unpack-confetti__dot';
    const angle = (i / count) * Math.PI * 2;
    const dist = 40 + Math.random() * 60;
    p.style.setProperty('--cx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--cy', `${Math.sin(angle) * dist}px`);
    p.style.background = ['#FFD93D', '#FF8C42', '#4CAF50', '#6BB6FF', '#FF5E7E'][
      i % 5
    ];
    container.appendChild(p);
  }
}

export function createUnpackingFlow({ elements, callbacks }) {
  const els = elements;
  let flowBusy = false;
  let step = 0;
  let cart = [];
  let statsApplied = false;
  let step2AutoId = null;

  function showOnly(n) {
    [1, 2, 3, 4].forEach((s) => {
      const el = els.steps[s];
      if (el) {
        el.hidden = s !== n;
        el.setAttribute('aria-hidden', String(s !== n));
      }
    });
    step = n;
  }

  function say(text, layout = {}) {
    if (!els.speechBubble || !els.speechDock) return;
    document.documentElement.classList.add('is-lecture-active');
    els.speechBubble.textContent = text;
    els.speechBubble.classList.remove('is-hidden');
    els.speechBubble.classList.add('is-visible');
    positionSpeechBubble({
      bubble: els.speechBubble,
      dock: els.speechDock,
      kolobokEl: els.kolobok,
      stageEl: els.stage,
      preferSide: layout.preferSide,
    });
  }

  function hideSpeech() {
    els.speechBubble?.classList.add('is-hidden');
    els.speechBubble?.classList.remove('is-visible');
    document.documentElement.classList.remove('is-lecture-active');
  }

  function applyCartBoost() {
    if (statsApplied) return;
    statsApplied = true;

    cart.forEach((item) => {
      gameState.applyItem(item.effects || {});
    });

    const fb = CONFIG.unpacking?.statBoostFallback || {
      hunger: 25,
      thirst: 20,
      health: 20,
      mood: 12,
    };
    Object.entries(fb).forEach(([key, value]) => {
      if (value) gameState.changeStat(key, value);
    });

    callbacks.onStatsApplied?.();
    showStatFloats(fb);
  }

  function showStatFloats(boosts) {
    if (!els.statFloats) return;
    els.statFloats.innerHTML = '';
    const panel = document.getElementById('stats-panel');
    if (!panel) return;

    let i = 0;
    Object.entries(boosts).forEach(([key, delta]) => {
      if (!delta) return;
      const row = document.querySelector(`[data-stat="${key}"]`);
      if (!row) return;
      const rowRect = row.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const el = document.createElement('span');
      el.className = 'unpack-stat-float is-pos';
      el.textContent = `+${delta}`;
      el.style.left = `${rowRect.right - panelRect.left - 6}px`;
      el.style.top = `${rowRect.top - panelRect.top + i * 4}px`;
      els.statFloats.appendChild(el);
      callbacks.onPulseStat?.(key);
      i += 1;
      window.setTimeout(() => el.remove(), 1200);
    });
  }

  async function step1Unpack() {
    showOnly(1);
    statsApplied = false;
    say('Так, что у нас тут...');
    await delay(1500);
    els.bag?.classList.add('is-pop');
    spawnConfetti(els.confetti, CONFIG.unpacking?.confettiCount ?? 18);
    await delay(500);
    els.bag?.classList.add('is-burst');
    await delay(500);
  }

  async function step2Receipt() {
    showOnly(2);
    hideSpeech();
    const total = cart.reduce((s, i) => s + i.price, 0);
    if (els.receiptLines) els.receiptLines.innerHTML = '';
    if (els.receiptTotal) els.receiptTotal.textContent = '';
    els.receipt?.classList.remove('is-mini');
    els.receipt?.classList.add('is-visible');

    await delay(400);

    for (const item of cart) {
      const line = document.createElement('li');
      line.className = 'unpack-receipt__line';
      line.textContent = `${item.emoji} ${item.name.padEnd(10, ' ')} ${item.price}₽`;
      els.receiptLines?.appendChild(line);
      await delay(200);
      line.classList.add('is-visible');
    }

    els.receiptDivider?.classList.add('is-visible');
    if (els.receiptTotal) {
      els.receiptTotal.textContent = `ИТОГО ${total}₽`;
      els.receiptTotal.classList.add('is-visible');
    }

    if (step2AutoId) window.clearTimeout(step2AutoId);
    step2AutoId = window.setTimeout(() => {
      advanceFromReceipt();
    }, CONFIG.unpacking?.receiptAutoAdvanceMs ?? 5000);
  }

  function placeOrbitIcon(el, index) {
    const slots = CONFIG.unpacking?.orbitSlots || [
      { left: 72, top: 36 },
      { left: 82, top: 50 },
      { left: 65, top: 58 },
    ];
    const s = slots[index % slots.length];
    el.style.left = `${s.left}%`;
    el.style.top = `${s.top}%`;
  }

  function bindOrbitTap(btn, item) {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      vibrateTap();
      els.orbit?.querySelectorAll('.unpack-orbit-item').forEach((el) => {
        el.classList.remove('is-tapped');
      });
      btn.classList.add('is-tapped');
      say(getUnpackCartItemTapPhrase(item), { preferSide: 'left' });
    });
  }

  async function step3Reaction() {
    if (step !== 2 && step !== 3) return;
    if (step2AutoId) {
      window.clearTimeout(step2AutoId);
      step2AutoId = null;
    }

    applyCartBoost();
    showOnly(3);
    els.layer?.classList.add('is-reaction-step');
    els.receipt?.classList.remove('is-visible', 'is-mini');

    const mini = document.getElementById('unpack-receipt-mini');
    if (mini) {
      mini.classList.remove('is-visible');
      mini.textContent = '';
    }

    if (els.orbit) {
      els.orbit.innerHTML = '';
      cart.forEach((item, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'unpack-orbit-item';
        btn.textContent = item.emoji;
        btn.setAttribute('aria-label', `Тапни: ${item.name}`);
        placeOrbitIcon(btn, i);
        bindOrbitTap(btn, item);
        els.orbit.appendChild(btn);
        requestAnimationFrame(() => btn.classList.add('is-visible'));
      });
    }

    document.getElementById('app')?.classList.add('is-unpack-reaction');
    say(getUnpackReactionIntro(cart), { preferSide: 'left' });
  }

  async function finishUnpack() {
    say(getUnpackFinalPhrase());
    els.kolobok?.classList.add('is-eating-loop');
    await delay(700);
    els.kolobok?.classList.remove('is-eating-loop');
    await end();
  }

  function resetUi() {
    els.layer?.classList.remove('is-reaction-step');
    hideSpeech();
    statsApplied = false;
    if (step2AutoId) {
      window.clearTimeout(step2AutoId);
      step2AutoId = null;
    }
    els.receipt?.classList.remove('is-visible', 'is-mini');
    els.bag?.classList.remove('is-pop', 'is-burst');
    if (els.confetti) els.confetti.replaceChildren();
    if (els.orbit) els.orbit.innerHTML = '';
    if (els.statFloats) els.statFloats.innerHTML = '';
    [1, 2, 3, 4].forEach((s) => {
      if (els.steps[s]) els.steps[s].hidden = true;
    });
  }

  async function end() {
    flowBusy = false;
    document.documentElement.classList.remove('is-lecture-active');
    document.getElementById('app')?.classList.remove('is-unpack-reaction');
    els.layer?.classList.remove('is-reaction-step');
    els.layer.hidden = true;
    els.layer.setAttribute('hidden', '');
    els.app?.classList.remove('is-purchase-active', 'is-feed-active');
    els.footer?.classList.remove('is-hidden');
    resetUi();
    gameState.save();
    callbacks.onVideoResume?.();
    try {
      const result = callbacks.onEnd?.(cart.slice());
      if (result?.then) await result;
    } catch (err) {
      console.error('unpack onEnd', err);
    }
  }

  function bindControls() {
    if (els.btnReceiptNext) {
      els.btnReceiptNext.onclick = () => {
        advanceFromReceipt();
      };
    }
    if (els.btnFridge) {
      els.btnFridge.onclick = () => {
        finishUnpack();
      };
    }
    if (els.btnHome) {
      els.btnHome.onclick = () => end();
    }
  }

  async function advanceFromReceipt() {
    try {
      await step3Reaction();
    } catch (err) {
      console.error('unpack step3', err);
      applyCartBoost();
      showOnly(3);
    }
  }

  function resetLayerOnly() {
    els.layer?.classList.remove('is-reaction-step');
    els.layer.hidden = true;
    els.layer?.setAttribute('hidden', '');
    els.app?.classList.remove('is-purchase-active', 'is-unpack-reaction', 'is-feed-active');
    els.footer?.classList.remove('is-hidden');
    resetUi();
  }

  function forceReset() {
    flowBusy = false;
    statsApplied = false;
    if (step2AutoId) {
      window.clearTimeout(step2AutoId);
      step2AutoId = null;
    }
    resetLayerOnly();
  }

  return {
    isActive: () => flowBusy,
    forceReset,

    async start() {
      if (flowBusy) return;
      flowBusy = true;
      cart = pickDemoCart();
      statsApplied = false;
      bindControls();
      resetUi();

      callbacks.onStart?.();
      els.layer.hidden = false;
      els.layer.removeAttribute('hidden');
      els.app?.classList.add('is-purchase-active', 'is-feed-active');
      els.footer?.classList.add('is-hidden');

      try {
        await step1Unpack();
        await step2Receipt();
      } catch (err) {
        console.error('unpacking flow', err);
        end();
      }
    },
  };
}
