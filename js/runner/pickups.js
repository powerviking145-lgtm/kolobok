import { RUNNER_CONFIG } from './runner-config.js';
import { drawEmoji } from './drawEmoji.js';

function randomDelay(min, max) {
  if (min >= max) return min;
  return min + Math.random() * (max - min);
}

export function createPickupManager() {
  const cfg = RUNNER_CONFIG.pickups;
  let list = [];
  const spawnTimers = {};

  function resetTimers() {
    Object.entries(cfg.types).forEach(([key, type]) => {
      spawnTimers[key] = randomDelay(type.spawnMinMs, type.spawnMaxMs) * 0.5;
    });
  }

  function spawn(typeKey) {
    const type = cfg.types[typeKey];
    const y = cfg.floatY + (Math.random() - 0.5) * 0.06;
    list.push({
      id: typeKey,
      emoji: type.emoji,
      x: 1.08,
      y,
      w: cfg.size,
      h: cfg.size,
      floatText: type.floatText,
      effects: type.effects,
    });
  }

  return {
    reset() {
      list = [];
      resetTimers();
    },

    update(dt, scrollSpeed) {
      list.forEach((p) => {
        p.x -= scrollSpeed;
      });
      list = list.filter((p) => p.x + p.w > -0.05);

      Object.entries(cfg.types).forEach(([key, type]) => {
        spawnTimers[key] -= dt;
        if (spawnTimers[key] <= 0) {
          const crowded = list.some((p) => p.id === key && p.x > 0.7);
          if (!crowded) spawn(key);
          spawnTimers[key] = randomDelay(type.spawnMinMs, type.spawnMaxMs);
        }
      });
    },

    checkCollect(playerBox) {
      const collected = [];
      list = list.filter((p) => {
        const box = { x: p.x, y: p.y, w: p.w, h: p.h };
        const hit =
          playerBox.x < box.x + box.w &&
          playerBox.x + playerBox.w > box.x &&
          playerBox.y < box.y + box.h &&
          playerBox.y + playerBox.h > box.y;
        if (hit) {
          collected.push(p);
          return false;
        }
        return true;
      });
      return collected;
    },

    draw(ctx, width, height) {
      list.forEach((p) => {
        const px = p.x * width;
        const py = p.y * height;
        const fontSize = p.w * width * RUNNER_CONFIG.emoji.pickupMul;
        const bob = Math.sin(performance.now() * 0.008 + p.x * 10) * 4;
        drawEmoji(
          ctx,
          p.emoji,
          px + (p.w * width) / 2,
          py + (p.h * height) / 2 + bob,
          fontSize
        );
      });
    },
  };
}
