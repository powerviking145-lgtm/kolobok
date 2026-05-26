import { CONFIG } from './config.js';

import { gameState } from './state.js';

import {

  getPackagePhrase,

  getFinalPhrase,

  getComboPhrase,

  getBulkBoostPhrase,

} from './phrases.js';



const STAT_ICONS = { hunger: '🍗', thirst: '💧', health: '❤️', mood: '😎' };



let active = false;

let unpacked = false;

let finishing = false;

let cartItems = [];

let timeoutIds = [];



let els = {};

let callbacks = {};



function getPhases() {

  const p = CONFIG.purchase;

  if (p.testMode && p.testPhases) return p.testPhases;

  return p.phases;

}



function delay(ms) {

  return new Promise((resolve) => {

    const id = setTimeout(resolve, ms);

    timeoutIds.push(id);

  });

}



function clearTimeouts() {

  timeoutIds.forEach(clearTimeout);

  timeoutIds = [];

}



function pickCartItems() {

  const { itemCountMin, itemCountMax } = CONFIG.purchase;

  const count =

    itemCountMin +

    Math.floor(Math.random() * (itemCountMax - itemCountMin + 1));

  const pool = [...CONFIG.items];

  const picked = [];



  for (let i = 0; i < count && pool.length; i++) {

    const idx = Math.floor(Math.random() * pool.length);

    picked.push(pool.splice(idx, 1)[0]);

  }



  return picked;

}



function detectCombo(items) {

  const ids = new Set(items.map((i) => i.id));

  if (ids.has('beer')) return 'booze';

  const junk = ['pizza', 'chocolate', 'cola', 'icecream'];

  if (junk.filter((j) => ids.has(j)).length >= 2) return 'junk';

  const healthy = ['broccoli', 'apple', 'banana', 'eggs'];

  if (healthy.filter((h) => ids.has(h)).length >= 2) return 'healthy';

  if (items.length >= 4) return 'feast';

  return 'default';

}



function formatDate() {

  const d = new Date();

  const dd = String(d.getDate()).padStart(2, '0');

  const mm = String(d.getMonth() + 1).padStart(2, '0');

  return `${dd}.${mm}`;

}



function resetDom() {

  els.receiptLines.innerHTML = '';

  els.receiptTotal.textContent = '';

  els.purchaseItems.innerHTML = '';

  els.purchaseFloats.innerHTML = '';

  els.btnUnpack.hidden = true;

  els.receipt.hidden = true;

  els.package.className = 'purchase-package';

  els.receipt.className = 'purchase-receipt';

  els.receiptFooter.classList.remove('is-visible');

}



function showFloat(text, className = '') {

  const phases = getPhases();

  const node = document.createElement('div');

  node.className = `purchase-float ${className}`.trim();

  node.textContent = text;

  els.purchaseFloats.appendChild(node);

  requestAnimationFrame(() => node.classList.add('is-visible'));

  const id = setTimeout(() => node.remove(), phases.floatShowMs);

  timeoutIds.push(id);

}



function formatAllBoostFloat(amount) {

  return CONFIG.statBars

    .map((bar) => `+${amount} ${STAT_ICONS[bar.key] || ''}`)

    .join('  ');

}



function placeItemOnArc(btn, index, total) {

  const { arcStartAngle, arcEndAngle, arcRadiusX, arcRadiusY, arcCenterY } =

    CONFIG.purchase.layout;

  const startAngle = Math.PI * arcStartAngle;

  const endAngle = Math.PI * arcEndAngle;

  const angle = startAngle + ((endAngle - startAngle) / Math.max(total - 1, 1)) * index;

  const x = 50 + Math.cos(angle) * arcRadiusX;

  const y = arcCenterY - Math.sin(angle) * arcRadiusY;

  btn.style.left = `${x}%`;

  btn.style.top = `${y}%`;

}



function applyBulkStatBoost() {

  const boost = CONFIG.purchase.statBoostAll;

  CONFIG.statBars.forEach((bar) => {

    gameState.changeStat(bar.key, boost);

    callbacks.onPulseStat(bar.key);

  });

}



async function phaseArrival() {

  const phases = getPhases();

  callbacks.onPhrase(getPackagePhrase());

  els.package.classList.add('is-arrived');

  await delay(phases.arrivalMs);

}



async function phaseReceipt() {

  const phases = getPhases();

  const total = cartItems.reduce((sum, i) => sum + i.price, 0);

  els.receiptDate.textContent = formatDate();

  els.receipt.hidden = false;

  els.receipt.classList.add('is-visible');



  await delay(phases.receiptRevealMs * 0.4);



  for (const item of cartItems) {

    const line = document.createElement('li');

    line.className = 'purchase-receipt__line';

    line.textContent = `${item.emoji} ${item.name} ... ${item.price}₽`;

    els.receiptLines.appendChild(line);

    await delay(phases.receiptLineDelayMs);

    line.classList.add('is-visible');

  }



  els.receiptTotal.textContent = `${total}₽`;

  els.receiptFooter.classList.add('is-visible');



  const combo = detectCombo(cartItems);

  callbacks.onPhrase(getComboPhrase(combo));

  els.btnUnpack.hidden = false;

}



async function phaseUnpack() {

  const phases = getPhases();

  els.btnUnpack.hidden = true;

  els.receipt.classList.add('is-fly-away');

  els.package.classList.add('is-open');



  await delay(CONFIG.purchase.testMode ? 200 : 400);



  els.receipt.hidden = true;



  const itemNodes = [];

  cartItems.forEach((item, index) => {

    const btn = document.createElement('button');

    btn.type = 'button';

    btn.className = 'purchase-item';

    btn.dataset.id = item.id;

    btn.setAttribute('aria-hidden', 'true');

    btn.tabIndex = -1;

    btn.innerHTML = `<span class="purchase-item__emoji">${item.emoji}</span>`;

    placeItemOnArc(btn, index, cartItems.length);

    els.purchaseItems.appendChild(btn);

    itemNodes.push(btn);



    setTimeout(

      () => btn.classList.add('is-visible'),

      index * phases.itemPopDelayMs

    );

  });



  const popWait =

    cartItems.length * phases.itemPopDelayMs + phases.itemPopDelayMs;

  await delay(popWait);



  if (callbacks.onPurchaseReview) {

    await callbacks.onPurchaseReview(cartItems);

  }



  itemNodes.forEach((btn) => btn.classList.add('is-flying'));

  callbacks.onKolobokEat();

  await delay(phases.itemFlyMs);



  applyBulkStatBoost();

  showFloat(formatAllBoostFloat(CONFIG.purchase.statBoostAll));

  callbacks.onPhrase(getBulkBoostPhrase());



  await delay(phases.bulkBoostPauseMs);

  await finishPurchase();

}



async function phaseFinal() {

  const phases = getPhases();

  callbacks.onPhrase(getFinalPhrase());



  await delay(phases.floatShowMs * 0.6);



  els.package.classList.add('is-leaving');

  await delay(phases.packageLeaveMs);

}



async function finishPurchase() {

  if (finishing) return;

  finishing = true;

  await phaseFinal();

  endPurchase();

}



function endPurchase() {

  els.layer.hidden = true;

  els.layer.setAttribute('aria-hidden', 'true');

  els.app.classList.remove('is-purchase-active');

  els.footer.classList.remove('is-hidden');

  resetDom();

  active = false;

  finishing = false;

  clearTimeouts();

  gameState.save();

  callbacks.onEnd();

}



function onUnpackClick() {

  if (!active || unpacked) return;

  unpacked = true;

  phaseUnpack();

}



export function createPurchaseController(options) {

  els = options.elements;

  callbacks = options.callbacks;



  els.btnUnpack.addEventListener('click', onUnpackClick);



  return {

    isActive: () => active,



    async start() {

      if (active) return;

      active = true;

      unpacked = false;

      finishing = false;

      cartItems = pickCartItems();

      clearTimeouts();

      resetDom();



      callbacks.onStart();

      els.layer.hidden = false;

      els.layer.setAttribute('aria-hidden', 'false');

      els.app.classList.add('is-purchase-active');

      els.footer.classList.add('is-hidden');

      els.packageShop.textContent = CONFIG.purchase.storeName;
      if (els.packageAd) {
        els.packageAd.textContent = CONFIG.purchase.adPlaceholder || '';
      }



      await phaseArrival();

      await phaseReceipt();

    },

  };

}


