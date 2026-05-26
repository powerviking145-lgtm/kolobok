import { RUNNER_CONFIG } from './runner-config.js';
import { drawEmoji } from './drawEmoji.js';
import { getSpawnLocation } from './location.js';

function pickType() {
  return Math.random() < 0.55 ? 'low' : 'high';
}

export function createObstacleManager() {
  const cfg = RUNNER_CONFIG.obstacles;
  let list = [];
  let spawnTimer = 800;

  return {
    reset() {
      list = [];
      spawnTimer = 800;
    },

    update(dt, scrollSpeed) {
      list.forEach((o) => {
        o.x -= scrollSpeed;
      });
      list = list.filter((o) => o.x + o.w > -0.05);

      spawnTimer -= dt;
      const rightmost = list.reduce((max, o) => Math.max(max, o.x + o.w), 0);

      if (spawnTimer <= 0 && rightmost < 1 - cfg.minGapX) {
        const typeKey = pickType();
        const type = cfg.types[typeKey];
        const loc = getSpawnLocation();
        const emoji = loc?.obstacles?.[typeKey] || type.emoji;
        const ground = RUNNER_CONFIG.groundY;
        list.push({
          type: typeKey,
          emoji,
          x: 1.05,
          y: ground - type.height - type.yOffset,
          w: type.width,
          h: type.height,
        });
        const range = cfg.spawnMaxMs - cfg.spawnMinMs;
        spawnTimer = cfg.spawnMinMs + Math.random() * range;
      }
    },

    getList() {
      return list;
    },

    removeAt(index) {
      if (index >= 0 && index < list.length) list.splice(index, 1);
    },

    draw(ctx, width, height) {
      list.forEach((o) => {
        const px = o.x * width;
        const py = o.y * height;
        const fontSize = Math.max(o.w, o.h) * width * RUNNER_CONFIG.emoji.obstacleMul;
        drawEmoji(ctx, o.emoji, px + (o.w * width) / 2, py + o.h * height, fontSize, {
          baseline: 'bottom',
        });
      });
    },
  };
}
