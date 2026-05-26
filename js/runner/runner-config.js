export const RUNNER_CONFIG = {
  framesPerMeter: 14,
  groundY: 0.45,
  playerX: 0.2,
  playerSize: 0.08,

  gravity: 0.00065,
  maxFallSpeed: 0.022,
  /** −15%: компенсация меньшей высоты неба над линией земли */
  jumpVelocity: -0.0153,
  doubleJumpVelocity: -0.0119,
  maxJumps: 2,

  scrollSpeed: 0.0085,

  acceleration: {
    startMul: 1,
    rampPerMeter: 0.0035,
  },

  score: {
    rate: 0.85,
  },

  stumble: {
    durationMs: 1500,
    hitCooldownMs: 900,
  },

  emoji: {
    playerMul: 1.85,
    obstacleMul: 1.55,
    pickupMul: 1.6,
    bossMul: 0.95,
  },

  boss: {
    startDistance: 1,
    maxDistance: 1,
    catchDistance: 0,
    maxStrikes: 3,
    positions: [1, 0.65, 0.32, 0],
    creepFloors: [0.74, 0.65, 0.32, 0],
    creepPerSecond: 0.055,
    safeRecoveryMs: 5000,
    warningToasts: [
      'Босс приблизился. Разгонись, бро!',
      'Ещё ближе! Не тупи — жми темп.',
      'Прям дышит в затылок. Только газ!',
    ],
    pullBackBase: 0.0028,
    pullBackPerAccel: 0.004,
    accelThreshold: 1.05,
    screenNearX: 0.3,
    sizeMin: 0.09,
    sizeRange: 0.07,
    visualLerpMs: 950,
    catchLerpMs: 900,
    stepPulseMs: 520,
    stepPulseScale: 0.07,
    lerpSmoothness: 2.4,
    statInfluence: {
      creep: { good: 1, low: 1.35, zero: 1.75 },
      pullBack: { good: 1.2, low: 0.88, zero: 0.65 },
    },
  },
  speedMultipliers: {
    state: { running: 1, rolling: 1.4, stumbled: 0.5 },
    statsAllGood: 1,
    statsAnyLow: 0.8,
    statsAnyZero: 0.6,
    statLowThreshold: 30,
    statGoodMin: 50,
  },

  runStats: {
    redZoneMax: 20,
    drainEveryMeters: 15,
    drainHunger: 1,
    drainThirst: 1,
    collisionHealthLoss: 5,
    starveHealthTickMs: 1350,
    starveHealthLoss: 1,
  },

  pickups: {
    /** над линией земли (~0.22 от groundY, как при 0.84 / 0.62) */
    floatY: 0.23,
    size: 0.055,
    types: {
      star: {
        emoji: '⭐',
        spawnMinMs: 3000,
        spawnMaxMs: 5000,
        effects: { score: 10 },
        floatText: '+10 ⭐',
      },
      bread: {
        emoji: '🍞',
        spawnMinMs: 15000,
        spawnMaxMs: 20000,
        effects: { hunger: 15 },
        floatText: '+15 🍗',
      },
      water: {
        emoji: '💧',
        spawnMinMs: 15000,
        spawnMaxMs: 20000,
        effects: { thirst: 15 },
        floatText: '+15 💧',
      },
      medkit: {
        emoji: '💊',
        spawnMinMs: 40000,
        spawnMaxMs: 40000,
        effects: { health: 20 },
        floatText: '+20 ❤️',
      },
    },
  },

  obstacles: {
    spawnMinMs: 1100,
    spawnMaxMs: 1900,
    minGapX: 0.22,
    types: {
      low: { emoji: '🪵', width: 0.06, height: 0.038, yOffset: 0 },
      high: { emoji: '🌿', width: 0.075, height: 0.075, yOffset: 0.015 },
    },
  },

  locationChangeMeters: 300,
  locationTransitionMs: 1000,
  locationToastMs: 1400,

  locations: [
    {
      id: 'village',
      name: 'Деревня',
      skyTop: '#c9a882',
      skyBottom: '#e8dcc8',
      ground: '#5c6b4a',
      groundLine: '#3d4a32',
      hill: '#6b7d52',
      bossEmoji: '👵',
      obstacles: { low: '🪵', high: '🏚️' },
    },
    {
      id: 'forest',
      name: 'Лес',
      skyTop: '#5a6b52',
      skyBottom: '#8a9a78',
      ground: '#3d4a32',
      groundLine: '#2a3324',
      hill: '#4a5c3e',
      bossEmoji: '👴',
      obstacles: { low: '🪨', high: '🌿' },
    },
    {
      id: 'field',
      name: 'Поле',
      skyTop: '#87a8c4',
      skyBottom: '#c5d8e8',
      ground: '#6d8b4a',
      groundLine: '#4a6632',
      hill: '#7a9a55',
      bossEmoji: '🐰',
      obstacles: { low: '🌾', high: '🪵' },
    },
    {
      id: 'river',
      name: 'Река',
      skyTop: '#6a8fa8',
      skyBottom: '#a8c8d8',
      ground: '#4a7a6a',
      groundLine: '#2e5a4a',
      hill: '#5a8a72',
      bossEmoji: '🐺',
      obstacles: { low: '🪨', high: '🌊' },
    },
    {
      id: 'mountain',
      name: 'Гора',
      skyTop: '#7a8a9a',
      skyBottom: '#b8c4d0',
      ground: '#6a6a62',
      groundLine: '#4a4a44',
      hill: '#8a8a7a',
      bossEmoji: '🐻',
      obstacles: { low: '🪨', high: '⛰️' },
    },
    {
      id: 'mystery',
      name: '???',
      skyTop: '#4a3548',
      skyBottom: '#8a6a82',
      ground: '#5a4a52',
      groundLine: '#3a2e34',
      hill: '#6a5a62',
      bossEmoji: '🦊',
      obstacles: { low: '🍄', high: '🌙' },
    },
  ],
};
