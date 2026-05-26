/**
 * Позиционирование idle-облака относительно головы Колобка (не full-screen bbox).
 */
export function positionSpeechBubble({ bubble, dock, kolobokEl, stageEl, preferSide } = {}) {
  if (!bubble || !dock || !kolobokEl || !stageEl) return;

  const stageRect = stageEl.getBoundingClientRect();
  const kRect = kolobokEl.getBoundingClientRect();
  const pad = 12;
  const gap = 10;
  const maxW = Math.min(stageRect.width * 0.5, stageRect.width - pad * 2);

  bubble.style.maxWidth = `${maxW}px`;
  dock.style.width = `${maxW}px`;
  dock.style.maxWidth = '50%';

  const kLeft = kRect.left - stageRect.left;
  const kTop = kRect.top - stageRect.top;
  const kW = kRect.width;
  const kH = kRect.height;

  // Кнопка колобка = весь стейдж; берём зону головы по центру сверху
  const headW = kW * 0.38;
  const headH = kH * 0.22;
  const headLeft = kLeft + (kW - headW) * 0.5;
  const headTop = kTop + kH * 0.06;
  const headCenterY = headTop + headH * 0.45;

  const dockTop = Math.max(pad, headTop - 8);
  dock.style.top = `${dockTop}px`;
  dock.style.bottom = 'auto';
  dock.style.transform = 'none';

  const bubbleW = Math.min(bubble.offsetWidth || maxW * 0.85, maxW);
  const spaceRight = stageRect.width - (headLeft + headW) - gap;
  const spaceLeft = headLeft - gap;
  const preferRight = preferSide !== 'left' && spaceRight >= bubbleW * 0.55;

  let side = 'right';
  let dockLeft;

  if (preferSide === 'left') {
    side = 'left';
    dockLeft = Math.max(pad, headLeft - gap - bubbleW);
  } else if (preferRight && spaceRight > pad) {
    side = 'right';
    dockLeft = headLeft + headW + gap;
  } else {
    side = 'left';
    dockLeft = Math.max(pad, headLeft - gap - bubbleW);
  }

  dockLeft = Math.min(dockLeft, stageRect.width - bubbleW - pad);
  dockLeft = Math.max(pad, dockLeft);

  dock.style.left = `${dockLeft}px`;
  dock.style.right = 'auto';

  bubble.dataset.tailSide = side;
  dock.dataset.thoughtSide = side;

  const thought = dock.querySelector('.speech-thought');
  if (!thought) return;

  const bubbleH = bubble.offsetHeight || 40;
  const layoutW = bubble.offsetWidth || bubbleW;
  const towardX = side === 'right' ? -1 : 1;
  const anchorX = side === 'right' ? 6 : layoutW - 6;
  const anchorY = bubbleH - 4;

  const steps = [
    { size: 11, dist: 0 },
    { size: 8, dist: 10 },
    { size: 5, dist: 20 },
  ];

  const dots = thought.querySelectorAll('.speech-thought__dot');
  steps.forEach((step, i) => {
    const dot = dots[i];
    if (!dot) return;
    const dx = towardX * step.dist * 0.9;
    const dy = step.dist * 0.55 + 6;
    const half = step.size / 2;
    dot.style.left = `${anchorX + dx - half}px`;
    dot.style.top = `${anchorY + dy - half}px`;
  });
}
