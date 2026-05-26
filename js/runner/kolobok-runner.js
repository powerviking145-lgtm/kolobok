import { RUNNER_CONFIG } from './runner-config.js';
import { drawEmoji } from './drawEmoji.js';

export function createPlayer() {
  const cfg = RUNNER_CONFIG;
  const size = cfg.playerSize;

  return {
    x: cfg.playerX,
    y: cfg.groundY - size,
    vy: 0,
    w: size,
    h: size,
    onGround: true,
    state: 'running',
    jumpsLeft: cfg.maxJumps,
    stumbleUntil: 0,
    hitCooldownUntil: 0,

    jump() {
      if (this.frozen || this.jumpsLeft <= 0) return false;

      if (this.onGround) {
        this.vy = cfg.jumpVelocity;
        this.jumpsLeft = cfg.maxJumps - 1;
      } else {
        this.vy = cfg.doubleJumpVelocity;
        this.jumpsLeft = 0;
      }

      this.onGround = false;
      this.state = 'jumping';
      return true;
    },

    stumble(durationMs) {
      this.state = 'stumbled';
      this.stumbleUntil = performance.now() + durationMs;
    },

    isStumbled() {
      return this.state === 'stumbled' && performance.now() < this.stumbleUntil;
    },

    canBeHit() {
      return performance.now() > this.hitCooldownUntil;
    },

    registerHit() {
      this.hitCooldownUntil = performance.now() + cfg.stumble.hitCooldownMs;
      this.stumble(cfg.stumble.durationMs);
    },

    setFrozen(frozen) {
      this.frozen = frozen;
      if (frozen) {
        this.vy = 0;
        this.state = 'frozen';
      } else if (this.state === 'frozen') {
        this.state = 'running';
      }
    },

    reset() {
      this.y = cfg.groundY - this.h;
      this.vy = 0;
      this.onGround = true;
      this.frozen = false;
      this.state = 'running';
      this.jumpsLeft = cfg.maxJumps;
      this.stumbleUntil = 0;
      this.hitCooldownUntil = 0;
    },

    update(dt = 16.67) {
      if (this.frozen) return;

      const now = performance.now();
      const step = Math.min(dt / 16.67, 2);

      if (this.state === 'stumbled' && now >= this.stumbleUntil) {
        this.state = this.onGround ? 'running' : 'jumping';
      }

      this.vy += cfg.gravity * step;
      if (this.vy > cfg.maxFallSpeed) this.vy = cfg.maxFallSpeed;
      this.y += this.vy * step;

      const ground = cfg.groundY - this.h;
      if (this.y >= ground) {
        this.y = ground;
        this.vy = 0;
        this.onGround = true;
        this.jumpsLeft = cfg.maxJumps;
        if (this.state !== 'stumbled') this.state = 'running';
      }
    },

    getStateSpeedMul() {
      const m = cfg.speedMultipliers.state;
      if (this.isStumbled()) return m.stumbled;
      if (this.state === 'rolling') return m.rolling;
      return m.running;
    },

    draw(ctx, width, height) {
      const px = this.x * width;
      const py = this.y * height;
      const r = this.w * width * 0.5;

      const fontSize = r * RUNNER_CONFIG.emoji.playerMul;
      let drawY = py + r;
      if (this.isStumbled()) {
        drawY += Math.sin(performance.now() * 0.02) * 3;
      }
      drawEmoji(ctx, '🟡', px + r, drawY, fontSize);
    },

    getHitbox() {
      const padX = this.w * 0.22;
      const padTop = this.h * 0.35;
      const padBottom = this.h * 0.05;
      return {
        x: this.x + padX,
        y: this.y + padTop,
        w: this.w - padX * 2,
        h: this.h - padTop - padBottom,
      };
    },
  };
}
