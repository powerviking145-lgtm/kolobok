function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function findCollisionIndex(playerBox, obstacles) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const box = { x: o.x, y: o.y, w: o.w, h: o.h };
    if (intersects(playerBox, box)) return i;
  }
  return -1;
}
