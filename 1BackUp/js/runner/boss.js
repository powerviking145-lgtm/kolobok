import { RUNNER_CONFIG } from './runner-config.js';
import { drawEmoji } from './drawEmoji.js';
import { getBossEmoji } from './location.js';

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function lerpToward(current, target, dt, durationMs, smoothness) {
  if (durationMs <= 0) return target;
  const k = 1 - Math.exp(-smoothness * (dt / durationMs));
  const next = current + (target - current) * k;
  if (Math.abs(target - next) < 0.006) return target;
  return next;
}

export function createBoss() {
  const cfg = RUNNER_CONFIG.boss;
  let strikes = 0;
  let targetDistance = cfg.startDistance;
  let visualDistance = cfg.startDistance;
  let safeTimeMs = 0;
  let stepPulse = 0;
  let catching = false;
  let catchStartMs = 0;
  let catchFromDistance = 1;

  function floorForStrikes() {
    return cfg.creepFloors[Math.min(strikes, cfg.creepFloors.length - 1)];
  }

  function strikePosition(level) {
    const idx = Math.min(level, cfg.positions.length - 1);
    return cfg.positions[idx];
  }

  function syncVisual(dt) {
    visualDistance = lerpToward(
      visualDistance,
      targetDistance,
      dt,
      catching ? cfg.catchLerpMs : cfg.visualLerpMs,
      cfg.lerpSmoothness ?? 2.4
    );
  }

  function syncCatchVisual() {
    const elapsed = performance.now() - catchStartMs;
    const t = Math.min(1, elapsed / cfg.catchLerpMs);
    visualDistance = catchFromDistance * (1 - easeOutCubic(t));
    if (t >= 1) visualDistance = cfg.catchDistance;
  }

  return {
    reset() {
      strikes = 0;
      targetDistance = cfg.startDistance;
      visualDistance = cfg.startDistance;
      safeTimeMs = 0;
      stepPulse = 0;
      catching = false;
      catchStartMs = 0;
      catchFromDistance = cfg.startDistance;
    },

    onHit() {
      if (catching) {
        return { shouldCatch: false, strikeLevel: strikes };
      }

      strikes = Math.min(strikes + 1, cfg.maxStrikes);
      targetDistance = Math.min(targetDistance, strikePosition(strikes));
      stepPulse = 1;

      if (strikes >= cfg.maxStrikes) {
        return { shouldCatch: true, strikeLevel: strikes };
      }
      return { shouldCatch: false, strikeLevel: strikes };
    },

    startCatch() {
      catching = true;
      catchStartMs = performance.now();
      catchFromDistance = visualDistance;
      targetDistance = cfg.catchDistance;
      stepPulse = 1;
    },

    isCatching() {
      return catching;
    },

    getStrikeLevel() {
      return strikes;
    },

    update(dt, isPlayerStumbled, runAccelMul, statInfluence) {
      if (catching) {
        syncCatchVisual();
        if (stepPulse > 0) {
          stepPulse = Math.max(0, stepPulse - dt / cfg.stepPulseMs);
        }
        return;
      }

      const step = dt / 16.67;
      const creepMul = statInfluence?.creep ?? 1;
      const pullMul = statInfluence?.pullBack ?? 1;

      if (stepPulse > 0) {
        stepPulse = Math.max(0, stepPulse - dt / cfg.stepPulseMs);
      }

      if (isPlayerStumbled) {
        safeTimeMs = 0;
        syncVisual(dt);
        return;
      }

      safeTimeMs += dt;

      if (safeTimeMs >= cfg.safeRecoveryMs && strikes > 0) {
        safeTimeMs = 0;
        strikes -= 1;
        const recovered = strikePosition(strikes);
        targetDistance = Math.max(recovered, targetDistance);
        stepPulse = 0.5;
      }

      const floor = floorForStrikes();

      if (runAccelMul >= cfg.accelThreshold) {
        const accelBonus = Math.max(0, runAccelMul - cfg.accelThreshold);
        const pullBack =
          (cfg.pullBackBase + cfg.pullBackPerAccel * accelBonus) *
          pullMul *
          step;
        targetDistance = Math.min(cfg.startDistance, targetDistance + pullBack);
      } else {
        const creep = cfg.creepPerSecond * creepMul * (dt / 1000);
        targetDistance = Math.max(floor, targetDistance - creep);
      }

      syncVisual(dt);
    },

    draw(ctx, width, height) {
      const groundY = height * RUNNER_CONFIG.groundY;
      const gap = visualDistance / cfg.maxDistance;
      const closeness = 1 - gap;
      const pulse = stepPulse * cfg.stepPulseScale;
      const pulseWave = pulse > 0 ? Math.sin((1 - pulse) * Math.PI) * pulse : 0;

      const size = width * (cfg.sizeMin + closeness * cfg.sizeRange) * (1 + pulseWave);
      const y = groundY - size * 1.1;
      const fontSize = size * RUNNER_CONFIG.emoji.bossMul;
      const halfW = fontSize * 0.48;
      const farX = halfW;
      const nearX = width * cfg.screenNearX;
      const centerX = Math.max(halfW, Math.min(width - halfW, farX + closeness * (nearX - farX)));

      drawEmoji(ctx, getBossEmoji(), centerX, y + size * 0.15, fontSize, {
        baseline: 'bottom',
      });
    },
  };
}
