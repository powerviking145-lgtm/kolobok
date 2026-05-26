import { CONFIG } from './config.js';
import { getNutritionTipPhrase } from './phrases.js';

export function createKolobokLecture({ replySystem, onDismiss }) {
  let active = false;

  function showNutrition(text) {
    active = true;
    replySystem.showIdle(text, { animate: true, autoHide: true });
    const ms = (CONFIG.replies?.idleHideMs ?? 4000) + 350;
    return new Promise((resolve) => {
      window.setTimeout(() => {
        active = false;
        onDismiss?.();
        resolve('ok');
      }, ms);
    });
  }

  function dismiss() {
    active = false;
    replySystem?.hideNutrition();
  }

  return {
    isActive() {
      return active;
    },

    dismiss,

    tryShowFoodTap(food) {
      const chance = CONFIG.replies?.nutritionChance ?? CONFIG.lecture.tapChance;
      if (!food || Math.random() > chance) return Promise.resolve(false);
      return showNutrition(getNutritionTipPhrase(food)).then(() => true);
    },

    showPurchaseReview(cartItems) {
      const chance = CONFIG.lecture.purchaseReviewChance;
      if (!cartItems?.length || Math.random() > chance) {
        return Promise.resolve(false);
      }
      const item = cartItems[Math.floor(Math.random() * cartItems.length)];
      return showNutrition(getNutritionTipPhrase(item)).then(() => true);
    },
  };
}
