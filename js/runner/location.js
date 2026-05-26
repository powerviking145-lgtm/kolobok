import { RUNNER_CONFIG } from './runner-config.js';

function lerpChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpHex(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = lerpChannel(ar, br, t);
  const g = lerpChannel(ag, bg, t);
  const bl = lerpChannel(ab, bb, t);
  return `rgb(${r},${g},${bl})`;
}

function blendLocation(from, to, t) {
  return {
    id: t >= 0.5 ? to.id : from.id,
    name: t >= 0.5 ? to.name : from.name,
    bossEmoji: t >= 0.5 ? to.bossEmoji : from.bossEmoji,
    skyTop: lerpHex(from.skyTop, to.skyTop, t),
    skyBottom: lerpHex(from.skyBottom, to.skyBottom, t),
    ground: lerpHex(from.ground, to.ground, t),
    groundLine: lerpHex(from.groundLine, to.groundLine, t),
    hill: lerpHex(from.hill, to.hill, t),
    obstacles: t >= 0.5 ? to.obstacles : from.obstacles,
  };
}

let activeIndex = 0;
let fromIndex = 0;
let toIndex = 0;
let blend = 0;
let enteredName = null;

export function resetLocations() {
  activeIndex = 0;
  fromIndex = 0;
  toIndex = 0;
  blend = 0;
  enteredName = null;
}

export function updateLocations(distance, dt) {
  const { locations, locationChangeMeters, locationTransitionMs } = RUNNER_CONFIG;
  if (!locations?.length) return;

  const target = Math.floor(distance / locationChangeMeters) % locations.length;

  if (target !== activeIndex && blend <= 0) {
    fromIndex = activeIndex;
    toIndex = target;
    blend = 0.001;
    enteredName = locations[target].name;
  }

  if (blend > 0) {
    blend = Math.min(1, blend + dt / locationTransitionMs);
    if (blend >= 1) {
      activeIndex = toIndex;
      blend = 0;
    }
  }
}

export function consumeLocationEntered() {
  const name = enteredName;
  enteredName = null;
  return name;
}

export function getScenePalette() {
  const { locations } = RUNNER_CONFIG;
  if (!locations?.length) return {};

  if (blend <= 0) return locations[activeIndex];
  return blendLocation(locations[fromIndex], locations[toIndex], blend);
}

export function getSpawnLocation() {
  const { locations } = RUNNER_CONFIG;
  if (!locations?.length) return null;
  if (blend <= 0) return locations[activeIndex];
  return locations[toIndex];
}

export function getBossEmoji() {
  return getScenePalette().bossEmoji || '👵';
}

export function getBossId() {
  return getScenePalette().id || 'village';
}
