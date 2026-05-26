import { RUNNER_CONFIG } from './runner-config.js';
import { drawScene } from './scene.js';
import { createPlayer } from './kolobok-runner.js';
import { createObstacleManager } from './obstacles.js';
import { findCollisionIndex } from './collisions.js';
import { createBoss } from './boss.js';
import { createHud } from './hud.js';
import { createPickupManager } from './pickups.js';
import { gameState } from '../state.js';
import { canStartRun, getBlockRunPhrase } from '../kolobok.js';
import {
  resetLocations,
  updateLocations,
  consumeLocationEntered,
  getBossId,
} from './location.js';
import { preloadSoilPatterns } from './soilPatterns.js';

preloadSoilPatterns().catch(() => {});

function getStatTier(stats) {
  const m = RUNNER_CONFIG.speedMultipliers;
  const values = [stats.hunger, stats.thirst, stats.health, stats.mood];
  if (values.some((v) => v <= 0)) return 'zero';
  if (values.some((v) => v < m.statLowThreshold)) return 'low';
  return 'good';
}

function getStatSpeedMultiplier(stats) {
  const m = RUNNER_CONFIG.speedMultipliers;
  const tier = getStatTier(stats);
  if (tier === 'zero') return m.statsAnyZero;
  if (tier === 'low') return m.statsAnyLow;
  return m.statsAllGood;
}

function getStatBossInfluence(stats) {
  const inf = RUNNER_CONFIG.boss.statInfluence;
  const tier = getStatTier(stats);
  if (tier === 'zero') {
    return { creep: inf.creep.zero, pullBack: inf.pullBack.zero };
  }
  if (tier === 'low') {
    return { creep: inf.creep.low, pullBack: inf.pullBack.low };
  }
  return { creep: inf.creep.good, pullBack: inf.pullBack.good };
}

export function createRunner(options) {
  const { elements, callbacks } = options;
  let active = false;
  let animId = null;
  let lastTime = 0;
  let scrollX = 0;
  let distance = 0;
  let score = 0;
  let frameCount = 0;
  let runAccelMul = 1;
  let speedMul = 1;
  let lastStats = null;
  let lastDrainMilestone = 0;
  let starveTimer = 0;
  let catchEndsAt = 0;
  let ctx = null;
  let size = { width: 0, height: 0 };

  const player = createPlayer();
  const obstacles = createObstacleManager();
  const pickups = createPickupManager();
  const boss = createBoss();
  const hud = createHud(elements);

  function bindResultButtons() {
    if (elements.btnAgain) {
      elements.btnAgain.onclick = () => restart();
    }
    if (elements.btnHome) {
      elements.btnHome.onclick = () => {
        hide();
        callbacks.onHome();
      };
    }
  }

  bindResultButtons();

  function resize() {
    const rect = elements.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;
    elements.canvas.width = w * dpr;
    elements.canvas.height = h * dpr;
    elements.canvas.style.width = `${w}px`;
    elements.canvas.style.height = `${h}px`;
    ctx = elements.canvas.getContext('2d', { alpha: false });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    size = { width: w, height: h };
  }

  function onResize() {
    if (active) resize();
  }

  function stopLoop() {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
  }

  function getRunAccelMul() {
    const a = RUNNER_CONFIG.acceleration;
    return a.startMul + distance * a.rampPerMeter;
  }

  function getEffectiveAccelMul() {
    return getRunAccelMul();
  }

  function refreshSpeedMul() {
    speedMul = getStatSpeedMultiplier(gameState.get());
  }

  function applyMeterDrain() {
    const rs = RUNNER_CONFIG.runStats;
    const m = Math.floor(distance);
    if (m < rs.drainEveryMeters) return;
    const milestone = Math.floor(m / rs.drainEveryMeters) * rs.drainEveryMeters;
    if (milestone > lastDrainMilestone) {
      lastDrainMilestone = milestone;
      gameState.changeStat('hunger', -rs.drainHunger);
      gameState.changeStat('thirst', -rs.drainThirst);
      refreshSpeedMul();
    }
  }

  function applyStarveDamage(dt) {
    const stats = gameState.get();
    const rs = RUNNER_CONFIG.runStats;
    if (stats.hunger > 0 && stats.thirst > 0) {
      starveTimer = 0;
      return;
    }
    starveTimer += dt;
    if (starveTimer >= rs.starveHealthTickMs) {
      starveTimer = 0;
      gameState.changeStat('health', -rs.starveHealthLoss);
      refreshSpeedMul();
      checkHealthGameOver(gameState.get());
    }
  }

  function checkHealthGameOver(stats) {
    if (stats.health <= 0) {
      endRun('health');
      return true;
    }
    return false;
  }

  function endRun(reason) {
    active = false;
    stopLoop();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKeyDown);
    elements.canvas.removeEventListener('pointerdown', onTap);

    const finalDistance = Math.floor(distance);
    const finalScore = Math.floor(score);
    const isRecord = finalScore > (elements.bestScore || 0);
    if (isRecord) {
      hud.setBestScore(finalScore);
      elements.bestScore = finalScore;
    }

    hud.showResults({
      distance: finalDistance,
      score: finalScore,
      isRecord,
      reason,
      bossId: reason === 'boss' ? getBossId() : null,
    });

    callbacks.onEnd({
      distance: finalDistance,
      score: finalScore,
      isRecord,
      reason,
    });
  }

  function onKeyDown(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      player.jump();
    }
  }

  function onTap() {
    if (!active) return;
    player.jump();
  }

  function drawFrame() {
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    drawScene(ctx, size.width, size.height, scrollX);
    boss.draw(ctx, size.width, size.height);
    obstacles.draw(ctx, size.width, size.height);
    pickups.draw(ctx, size.width, size.height);
    player.draw(ctx, size.width, size.height);
  }

  function startBossCatch() {
    player.setFrozen(true);
    boss.startCatch();
    catchEndsAt = performance.now() + RUNNER_CONFIG.boss.catchLerpMs;
  }

  function handleObstacleHit(hitIndex) {
    const rs = RUNNER_CONFIG.runStats;
    player.registerHit();
    const bossResult = boss.onHit();
    obstacles.removeAt(hitIndex);
    gameState.changeStat('health', -rs.collisionHealthLoss);
    refreshSpeedMul();

    if (bossResult.shouldCatch) {
      startBossCatch();
      if (bossResult.strikeLevel > 0) hud.showBossWarning(bossResult.strikeLevel);
      return;
    }

    if (bossResult.strikeLevel > 0) {
      hud.showBossWarning(bossResult.strikeLevel);
    }

    checkHealthGameOver(gameState.get());
  }

  function applyPickup(pickup) {
    const effects = pickup.effects;
    if (effects.score) score += effects.score;
    Object.entries(effects).forEach(([key, val]) => {
      if (key !== 'score') gameState.changeStat(key, val);
    });
    hud.showPickupToast(pickup.floatText);
    refreshSpeedMul();
    if (checkHealthGameOver(gameState.get())) return;
  }

  function tick(now) {
    if (!active) return;
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    const step = dt / 16.67;
    const stats = gameState.get();

    if (catchEndsAt > 0) {
      boss.update(dt, false, runAccelMul, getStatBossInfluence(stats));
      hud.update(distance, score, gameState.get());
      drawFrame();
      if (performance.now() >= catchEndsAt) {
        catchEndsAt = 0;
        endRun('boss');
        return;
      }
      animId = requestAnimationFrame(tick);
      return;
    }

    runAccelMul = getEffectiveAccelMul();

    const stateMul = player.getStateSpeedMul();
    const scrollSpeed =
      RUNNER_CONFIG.scrollSpeed * speedMul * stateMul * runAccelMul * step;
    scrollX += scrollSpeed;

    score += RUNNER_CONFIG.score.rate * runAccelMul * stateMul * step;

    frameCount += 1;
    const framesPerMeter = Math.max(
      6,
      RUNNER_CONFIG.framesPerMeter / Math.max(runAccelMul, 1)
    );
    if (frameCount >= framesPerMeter) {
      frameCount = 0;
      distance += 1;
      applyMeterDrain();
    }

    applyStarveDamage(dt);
    if (checkHealthGameOver(gameState.get())) return;

    updateLocations(distance, dt);
    const newLocation = consumeLocationEntered();
    if (newLocation) hud.showLocationToast(newLocation);

    player.update(dt);
    obstacles.update(dt, scrollSpeed);
    pickups.update(dt, scrollSpeed);
    boss.update(dt, player.isStumbled(), runAccelMul, getStatBossInfluence(stats));

    pickups.checkCollect(player.getHitbox()).forEach(applyPickup);

    if (player.canBeHit()) {
      const hitIndex = findCollisionIndex(player.getHitbox(), obstacles.getList());
      if (hitIndex >= 0) handleObstacleHit(hitIndex);
    }

    if (checkHealthGameOver(gameState.get())) return;

    hud.update(distance, score, gameState.get());
    drawFrame();
    animId = requestAnimationFrame(tick);
  }

  function beginRun(stats, bestScore) {
    if (!canStartRun(stats)) return;
    active = true;
    scrollX = 0;
    distance = 0;
    score = 0;
    frameCount = 0;
    runAccelMul = 1;
    lastDrainMilestone = 0;
    starveTimer = 0;
    catchEndsAt = 0;
    speedMul = getStatSpeedMultiplier(stats);
    elements.bestScore = bestScore || 0;
    hud.setBestScore(bestScore || 0);

    player.reset();
    obstacles.reset();
    pickups.reset();
    boss.reset();
    resetLocations();

    elements.layer.hidden = false;
    elements.layer.setAttribute('aria-hidden', 'false');
    elements.app.classList.add('is-runner-active');
    elements.homeUi.hidden = true;

    resize();
    hud.show();
    hud.update(0, 0, stats);

    lastTime = performance.now();
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKeyDown);
    elements.canvas.addEventListener('pointerdown', onTap);
    elements.btnSurrender.onclick = () => endRun('surrender');

    callbacks.onStart();
    animId = requestAnimationFrame(tick);
  }

  function start(stats, bestScore) {
    if (active) return;
    lastStats = stats;
    beginRun(stats, bestScore);
  }

  function restart() {
    if (active || !lastStats) return;
    const stats = callbacks.getStats ? callbacks.getStats() : lastStats;
    if (!canStartRun(stats)) {
      elements.results.hidden = true;
      elements.results.setAttribute('hidden', '');
      hide();
      callbacks.onRestartBlocked?.(getBlockRunPhrase(stats));
      return;
    }
    elements.results.hidden = true;
    elements.results.setAttribute('hidden', '');
    const best = stats.bestScore ?? elements.bestScore ?? 0;
    beginRun(stats, best);
  }

  function hide() {
    stopLoop();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKeyDown);
    elements.canvas.removeEventListener('pointerdown', onTap);
    elements.layer.hidden = true;
    elements.layer.setAttribute('aria-hidden', 'true');
    elements.app.classList.remove('is-runner-active');
    elements.homeUi.hidden = false;
    elements.results.hidden = true;
    active = false;
  }

  return {
    start,
    hide,
    isActive: () => active,
  };
}
