import { CONFIG } from './config.js';

function cfg() {
  return CONFIG.roadmap ?? {};
}

export function getTotalPlayers() {
  return cfg().totalPlayers ?? CONFIG.socialBanner?.totalPlayers ?? 156;
}

function formatGoal(n) {
  return Math.floor(n).toLocaleString('ru-RU');
}

function tpl(template, vars) {
  if (!template) return '';
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template
  );
}

export function getRoadmapGoals() {
  return cfg().goals ?? [];
}

export function analyzeRoadmap(total = getTotalPlayers()) {
  const goals = getRoadmapGoals();
  let activeIdx = goals.findIndex((g) => total < g.goal);
  const allDone = activeIdx === -1;

  const items = goals.map((entry, i) => {
    if (total >= entry.goal) {
      return { ...entry, status: 'done', index: i };
    }
    if (i === activeIdx) {
      return { ...entry, status: 'active', index: i };
    }
    return { ...entry, status: 'locked', index: i };
  });

  const active = allDone ? null : goals[activeIdx];
  const prevGoal = activeIdx > 0 ? goals[activeIdx - 1].goal : 0;
  const from = prevGoal;
  const to = active?.goal ?? goals[goals.length - 1]?.goal ?? 0;
  const segmentSpan = Math.max(1, to - from);
  const segmentProgress = allDone
    ? 1
    : Math.max(0, Math.min(1, (total - from) / segmentSpan));
  const pct = Math.round(segmentProgress * 100);
  const remain = allDone ? 0 : Math.max(0, to - total);

  return {
    total,
    items,
    active,
    activeIdx,
    allDone,
    from,
    to,
    segmentProgress,
    pct,
    remain,
  };
}

function renderRoadmapContent(root) {
  const rcfg = cfg();
  const state = analyzeRoadmap();
  const nextEl = root.querySelector('#roadmap-next');
  let allDoneEl = root.querySelector('#roadmap-all-done');
  const listEl = root.querySelector('#roadmap-list');
  if (!listEl) return;

  const labelEl = root.querySelector('#roadmap-next-label');
  if (labelEl) labelEl.textContent = rcfg.nextGoalLabel ?? 'Следующая цель';

  if (state.allDone) {
    nextEl?.setAttribute('hidden', '');
    if (!allDoneEl) {
      allDoneEl = document.createElement('p');
      allDoneEl.id = 'roadmap-all-done';
      allDoneEl.className = 'roadmap-all-done';
      listEl.parentNode?.insertBefore(allDoneEl, listEl);
    }
    allDoneEl.textContent =
      rcfg.allGoalsDoneText ?? 'Все цели на данный момент взяты, бро.';
    allDoneEl.hidden = false;
  } else {
    allDoneEl?.remove();
    if (nextEl && state.active) {
      nextEl.removeAttribute('hidden');

      const rangeEl = root.querySelector('#roadmap-next-range');
      const rewardEl = root.querySelector('#roadmap-next-reward');
      const fillEl = root.querySelector('#roadmap-next-fill');
      const progressEl = root.querySelector('#roadmap-next-progress');
      const pctEl = root.querySelector('#roadmap-next-pct');
      const remainEl = root.querySelector('#roadmap-next-remain');

      if (rangeEl) {
        rangeEl.textContent = tpl(rcfg.rangeTemplate ?? '{from} → {to} мякишей', {
          from: formatGoal(state.from),
          to: formatGoal(state.to),
        });
      }
      if (rewardEl) rewardEl.textContent = state.active.reward ?? '';
      if (fillEl) fillEl.style.width = `${state.pct}%`;
      if (progressEl) {
        progressEl.textContent = tpl(rcfg.progressTemplate ?? '{current} / {goal} мякишей', {
          current: formatGoal(state.total),
          goal: formatGoal(state.to),
        });
      }
      if (pctEl) pctEl.textContent = `${state.pct}%`;
      if (remainEl) {
        remainEl.textContent = tpl(rcfg.remainTemplate ?? 'Осталось {count} мякишей', {
          count: formatGoal(state.remain),
        });
      }
    } else {
      nextEl?.setAttribute('hidden', '');
    }
  }

  listEl.innerHTML = state.items
    .map((item) => {
      const goalText = tpl(rcfg.goalLabelTemplate ?? '{goal} мякишей', {
        goal: formatGoal(item.goal),
      });
      let badge = '';
      let statusLine = '';

      if (item.status === 'done') {
        badge = `✅ <span class="roadmap-card__badge-text">${rcfg.badgeDone ?? 'Получено'}</span>`;
      } else if (item.status === 'active') {
        const left = Math.max(0, item.goal - state.total);
        badge = '🔥';
        statusLine = tpl(rcfg.badgeActive ?? 'Осталось {count} мякишей', {
          count: formatGoal(left),
        });
      } else {
        badge = '🔒';
      }

      return `
        <li class="roadmap-card roadmap-card--${item.status}">
          <div class="roadmap-card__row">
            <span class="roadmap-card__icon" aria-hidden="true">${item.status === 'done' ? '✅' : item.status === 'active' ? '🔥' : '🔒'}</span>
            <div class="roadmap-card__main">
              <div class="roadmap-card__top">
                <span class="roadmap-card__goal">${goalText}</span>
                ${item.status === 'done' ? `<span class="roadmap-card__chip">${rcfg.badgeDone ?? 'Получено'}</span>` : ''}
                ${item.status === 'active' ? `<span class="roadmap-card__chip roadmap-card__chip--fire">${statusLine}</span>` : ''}
              </div>
              <p class="roadmap-card__reward">${item.reward}</p>
            </div>
          </div>
        </li>
      `;
    })
    .join('');
}

export function initRoadmap({
  screen = document.getElementById('roadmap-screen'),
  backBtn = document.getElementById('roadmap-back'),
  backTextEl = document.querySelector('#roadmap-back .roadmap-screen__back-text'),
  headCountEl = document.getElementById('roadmap-head-count'),
  bodyEl = document.getElementById('roadmap-body'),
  app = document.getElementById('app'),
  homeUi = document.getElementById('home-ui'),
  onOpen,
  onClose,
} = {}) {
  if (!screen) {
    return { open: () => {}, close: () => {}, isOpen: () => false };
  }

  let isOpen = false;
  const contentRoot = bodyEl ?? screen;

  function syncHeadCount() {
    if (headCountEl) {
      headCountEl.textContent = formatGoal(getTotalPlayers());
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    screen.classList.remove('is-open');
    screen.setAttribute('hidden', '');
    screen.setAttribute('aria-hidden', 'true');
    app?.classList.remove('is-roadmap-active');
    homeUi?.classList.remove('is-roadmap-active');
    window.dispatchEvent(new CustomEvent('kolobok:roadmap-close'));
    onClose?.();
  }

  function open() {
    if (isOpen) return;
    console.log('open roadmap');
    onOpen?.();
    syncHeadCount();
    renderRoadmapContent(contentRoot);
    window.dispatchEvent(new CustomEvent('kolobok:roadmap-open'));
    isOpen = true;
    screen.removeAttribute('hidden');
    screen.setAttribute('aria-hidden', 'false');
    screen.classList.add('is-open');
    app?.classList.add('is-roadmap-active');
    homeUi?.classList.add('is-roadmap-active');
  }

  const rcfg = cfg();
  if (backTextEl && rcfg.backLabel) {
    backTextEl.textContent = rcfg.backLabel;
  }

  backBtn?.addEventListener('click', () => {
    close();
  });

  syncHeadCount();
  renderRoadmapContent(contentRoot);

  return { open, close, isOpen: () => isOpen, refresh: () => renderRoadmapContent(contentRoot) };
}
