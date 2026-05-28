import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { vibrate, vibrateTap } from './homeUi.js';

function hintCfg() {
  return CONFIG.shop?.upgradeHint ?? {};
}

export function shouldShowShopUpgradeHint() {
  const cfg = hintCfg();
  const tutorials = gameState.getTutorials();
  if (tutorials.upgradeHintShown) return false;
  if (gameState.getStars() < (cfg.minStars ?? 100)) return false;

  const snap = gameState.get();
  return (CONFIG.statBars ?? []).some((bar) => (snap.stats?.[bar.key]?.level ?? 0) === 0);
}

export function createShopUpgradeHint({
  root = document.getElementById('shop-upgrade-hint'),
  textEl = document.getElementById('shop-upgrade-hint-text'),
  openBtn = document.getElementById('shop-upgrade-hint-open'),
  laterBtn = document.getElementById('shop-upgrade-hint-later'),
  onOpenShop,
  onDismiss,
} = {}) {
  let active = false;
  const shopBtn = document.getElementById('btn-shop');

  function setShopHighlight(on) {
    if (!shopBtn) return;
    shopBtn.classList.toggle('shop-hint-highlight', !!on);
  }

  function markShown() {
    gameState.setTutorialFlag('upgradeHintShown', true);
    gameState.save();
  }

  function hide() {
    if (!root) return;
    active = false;
    root.setAttribute('hidden', '');
    root.setAttribute('aria-hidden', 'true');
    root.classList.remove('is-visible');
    document.documentElement.classList.remove('is-shop-hint-active');
    setShopHighlight(false);
  }

  function dismiss() {
    markShown();
    hide();
    onDismiss?.();
  }

  function show() {
    if (!root || active || !shouldShowShopUpgradeHint()) return false;

    const cfg = hintCfg();
    if (textEl) textEl.textContent = cfg.text ?? '';
    if (openBtn && cfg.btnOpen) openBtn.textContent = cfg.btnOpen;
    if (laterBtn && cfg.btnLater) laterBtn.textContent = cfg.btnLater;

    active = true;
    vibrate(CONFIG.ui?.hapticUpgradeHintShow ?? [12, 18]);
    root.removeAttribute('hidden');
    root.setAttribute('aria-hidden', 'false');
    root.classList.add('is-visible');
    document.documentElement.classList.add('is-shop-hint-active');
    setShopHighlight(true);
    return true;
  }

  function tryShow() {
    if (active) return true;
    return show();
  }

  function openShop(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    vibrate(CONFIG.ui?.hapticUpgradeHintOpen ?? [16, 14, 22]);
    markShown();
    hide();
    window.setTimeout(() => onOpenShop?.(), 0);
  }

  function onLater(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    vibrateTap();
    dismiss();
  }

  function stopPointer(e) {
    e.stopPropagation();
  }

  root?.addEventListener('pointerdown', stopPointer, true);
  openBtn?.addEventListener('click', openShop);
  openBtn?.addEventListener('pointerdown', stopPointer, true);
  laterBtn?.addEventListener('click', onLater);
  laterBtn?.addEventListener('pointerdown', stopPointer, true);
  shopBtn?.addEventListener('click', () => {
    if (!active) return;
    markShown();
    hide();
    vibrate(CONFIG.ui?.hapticUpgradeHintOpen ?? [16, 14, 22]);
  });

  return {
    tryShow,
    hide,
    dismissLater: dismiss,
    markShown,
    isActive: () => active,
  };
}
