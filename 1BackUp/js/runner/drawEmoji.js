const EMOJI_FONT =
  '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export function drawEmoji(ctx, emoji, x, y, fontSizePx, options = {}) {
  const { baseline = 'middle', align = 'center' } = options;
  const size = Math.max(12, Math.round(fontSizePx));
  const rx = Math.round(x);
  const ry = Math.round(y);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.filter = 'none';
  ctx.fillStyle = '#000000';
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(emoji, rx, ry);
  ctx.restore();
}
