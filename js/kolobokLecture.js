import { CONFIG } from './config.js';
import { getNutritionTipPhrase } from './phrases.js';

export function createKolobokLecture({ replySystem, onDismiss }) {
  let lastTipAt = 0;
  let dismissTimerId = null;

  function showNutrition(text) {
    if (dismissTimerId) {
      window.clearTimeout(dismissTimerId);
      dismissTimerId = null;
    }
    replySystem.showIdle(text, { animate: true, autoHide: false });
    const ms = CONFIG.replies?.nutritionHoldMs ?? CONFIG.replies?.idleHideMs ?? 3500;
    return new Promise((resolve) => {
      dismissTimerId = window.setTimeout(() => {
        dismissTimerId = null;
        onDismiss?.();
        resolve('ok');
      }, ms);
    });
  }

  function dismiss() {
    if (dismissTimerId) {
      window.clearTimeout(dismissTimerId);
      dismissTimerId = null;
      onDismiss?.();
    }
    replySystem?.hideNutrition();
  }

  function canShowTip() {
    const minGap = CONFIG.replies?.nutritionMinGapMs ?? 5000;
    return Date.now() - lastTipAt >= minGap;
  }

  return {
    /** Не блокируем авто-смену реплик — подсказка живёт в том же баббле */
    isActive() {
      return false;
    },

    dismiss,

    tryShowFoodTap(food, chance) {
      if (!food || !canShowTip()) return Promise.resolve(false);
      const roll = chance ?? CONFIG.replies?.nutritionChance ?? CONFIG.lecture.tapChance;
      if (Math.random() > roll) return Promise.resolve(false);
      lastTipAt = Date.now();
      return showNutrition(getNutritionTipPhrase(food)).then(() => true);
    },

    showPurchaseReview(cartItems) {
      const chance = CONFIG.lecture.purchaseReviewChance;
      if (!cartItems?.length || !canShowTip() || Math.random() > chance) {
        return Promise.resolve(false);
      }
      const item = cartItems[Math.floor(Math.random() * cartItems.length)];
      lastTipAt = Date.now();
      return showNutrition(getNutritionTipPhrase(item)).then(() => true);
    },
  };
}
