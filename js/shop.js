import { CONFIG } from './config.js';
import { eventBus } from './eventBus.js';
import { gameState } from './state.js';

function shopCfg() {
  return CONFIG.shop ?? {};
}

function housesCfg() {
  return CONFIG.houses ?? {};
}

function formatStars(value) {
  const n = Math.floor(value);
  if (n < 1_000_000) return n.toLocaleString('ru-RU');
  if (n < 1_000_000_000) {
    const k = n / 1000;
    return `${k.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} к`;
  }
  const m = n / 1_000_000;
  return `${m.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млн`;
}

function tpl(template, vars) {
  if (!template) return '';
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template
  );
}

function getHouseOrder() {
  const order = housesCfg().order;
  const list = housesCfg().list ?? {};
  if (order?.length) {
    return order.filter((id) => list[id]);
  }
  return Object.keys(list);
}

function getHouseCardState(id, houses, stars) {
  const def = housesCfg().list?.[id];
  if (!def) return null;

  const owned = houses.owned.includes(id);
  const active = houses.active === id;
  const price = def.price ?? 0;

  if (active) {
    return {
      id,
      def,
      owned,
      active,
      price,
      chip: shopCfg().badgeSelected ?? 'Выбрано',
      btnLabel: shopCfg().btnSelected ?? 'Выбрано',
      btnAction: null,
      btnDisabled: true,
      priceLine:
        price <= 0 ? shopCfg().priceFree ?? 'Бесплатно' : `⭐ ${formatStars(price)}`,
      mod: 'active',
    };
  }

  if (owned) {
    return {
      id,
      def,
      owned,
      active,
      price,
      chip: null,
      btnLabel: shopCfg().btnSelect ?? 'Выбрать',
      btnAction: 'select',
      btnDisabled: false,
      priceLine: shopCfg().priceOwned ?? 'Уже твой',
      mod: 'owned',
    };
  }

  if (stars >= price) {
    return {
      id,
      def,
      owned,
      active,
      price,
      chip: null,
      btnLabel: tpl(shopCfg().btnBuy ?? 'Купить за ⭐ {price}', {
        price: formatStars(price),
      }),
      btnAction: 'buy',
      btnDisabled: false,
      priceLine: `⭐ ${formatStars(price)}`,
      mod: 'buy',
    };
  }

  const shortage = Math.max(0, price - stars);
  return {
    id,
    def,
    owned,
    active,
    price,
    chip: null,
    btnLabel: tpl(shopCfg().btnLocked ?? '🔒 Не хватает (−{shortage}⭐)', {
      shortage: formatStars(shortage),
    }),
    btnAction: null,
    btnDisabled: true,
    priceLine: `⭐ ${formatStars(price)}`,
    mod: 'locked',
  };
}

function renderHouseCard(state) {
  const chipHtml = state.chip
    ? `<span class="shop-house-card__chip">${state.chip}</span>`
    : '';
  const actionAttr = state.btnAction ? ` data-house-action="${state.btnAction}"` : '';

  return `
    <li class="shop-house-card shop-house-card--${state.mod}" data-house-id="${state.id}">
      <div class="shop-house-card__row">
        <span class="shop-house-card__emoji" aria-hidden="true">${state.def.emoji ?? '🏠'}</span>
        <div class="shop-house-card__main">
          <div class="shop-house-card__top">
            <span class="shop-house-card__name">${state.def.name ?? state.id}</span>
            ${chipHtml}
          </div>
          <p class="shop-house-card__price">${state.priceLine}</p>
          <button
            type="button"
            class="shop-house-card__btn"
            data-house-id="${state.id}"${actionAttr}
            ${state.btnDisabled ? 'disabled' : ''}
          >${state.btnLabel}</button>
        </div>
      </div>
    </li>
  `;
}

function applyTabUi({ tabButtons, panels, tab }) {
  tabButtons.forEach((btn) => {
    const active = btn.dataset.shopTab === tab;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  panels.forEach((panel) => {
    const active = panel.id === `shop-panel-${tab}`;
    panel.classList.toggle('is-active', active);
    if (active) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', '');
    }
  });
}

function statLevelCap() {
  return CONFIG.stats.levelCap ?? 80;
}

function getUpgradeCardState(bar, snap, stars) {
  const key = bar.key;
  const entry = snap.stats?.[key];
  const level = entry?.level ?? 0;
  const maxPercent = entry?.maxPercent ?? (CONFIG.stats.basePercent ?? 40) + level;
  const cap = statLevelCap();
  const maxLevel = level >= cap;
  const cost = gameState.getUpgradeCost(key);
  const pct = cap > 0 ? Math.round((level / cap) * 100) : 0;
  const cfg = shopCfg();

  if (maxLevel) {
    return {
      key,
      bar,
      level,
      cap,
      cost,
      pct: 100,
      levelLine: tpl(cfg.upgradeLevel ?? 'Ур. {level}/{cap}', { level, cap }),
      bonusLine: tpl(cfg.upgradeMaxBonus ?? '+{level}% к максимуму', { level: maxPercent }),
      priceLine: '',
      btnLabel: cfg.btnMax ?? 'МАКС',
      btnAction: null,
      btnDisabled: true,
      mod: 'max',
    };
  }

  const canAfford = stars >= cost;
  const shortage = Math.max(0, cost - stars);

  return {
    key,
    bar,
    level,
    cap,
    cost,
    pct,
    levelLine: tpl(cfg.upgradeLevel ?? 'Ур. {level}/{cap}', { level, cap }),
    bonusLine: tpl(cfg.upgradeMaxBonus ?? '+{level}% к максимуму', { level: maxPercent }),
    priceLine: tpl(cfg.upgradeNextPrice ?? 'Следующий уровень: ⭐ {price}', {
      price: formatStars(cost),
    }),
    btnLabel: canAfford
      ? cfg.btnUpgrade ?? 'Прокачать'
      : tpl(cfg.btnUpgradeLocked ?? '🔒 Не хватает (−{shortage}⭐)', {
          shortage: formatStars(shortage),
        }),
    btnAction: canAfford ? 'upgrade' : null,
    btnDisabled: !canAfford,
    mod: canAfford ? 'ready' : 'locked',
  };
}

function renderUpgradeCard(state) {
  const actionAttr = state.btnAction
    ? ` data-upgrade-action="${state.btnAction}"`
    : '';

  return `
    <li class="shop-upgrade-card shop-upgrade-card--${state.mod}" data-stat="${state.key}">
      <div class="shop-upgrade-card__row">
        <span class="shop-upgrade-card__icon" aria-hidden="true">${state.bar.icon ?? '•'}</span>
        <div class="shop-upgrade-card__main">
          <div class="shop-upgrade-card__top">
            <span class="shop-upgrade-card__name">${state.bar.label ?? state.key}</span>
            <span class="shop-upgrade-card__level">${state.levelLine}</span>
          </div>
          <div class="shop-upgrade-card__track" aria-hidden="true">
            <div class="shop-upgrade-card__fill" style="width:${state.pct}%"></div>
          </div>
          <p class="shop-upgrade-card__bonus">${state.bonusLine}</p>
          ${state.priceLine ? `<p class="shop-upgrade-card__price">${state.priceLine}</p>` : ''}
          <button
            type="button"
            class="shop-upgrade-card__btn"
            data-stat="${state.key}"${actionAttr}
            ${state.btnDisabled ? 'disabled' : ''}
          >${state.btnLabel}</button>
        </div>
      </div>
    </li>
  `;
}

function bindStaticLabels(root) {
  const cfg = shopCfg();
  const titleEl = root.querySelector('#shop-title');
  const backText = root.querySelector('.shop-screen__back-text');
  const tabHouses = root.querySelector('#shop-tab-houses');
  const tabUpgrade = root.querySelector('#shop-tab-upgrade');

  if (titleEl && cfg.title) titleEl.textContent = cfg.title;
  if (backText && cfg.backLabel) backText.textContent = cfg.backLabel;
  if (tabHouses) {
    tabHouses.innerHTML = `<span aria-hidden="true">${cfg.tabHousesIcon ?? '🏠'}</span> ${cfg.tabHouses ?? 'Дома'}`;
  }
  if (tabUpgrade) {
    tabUpgrade.innerHTML = `<span aria-hidden="true">${cfg.tabUpgradeIcon ?? '💪'}</span> ${cfg.tabUpgrade ?? 'Прокачка'}`;
  }
}

export function initShop({
  screen = document.getElementById('shop-screen'),
  backBtn = document.getElementById('shop-back'),
  starsEl = document.getElementById('shop-stars-value'),
  housesListEl = document.getElementById('shop-houses-list'),
  upgradeListEl = document.getElementById('shop-upgrade-list'),
  tabButtons = [],
  panels = [],
  app = document.getElementById('app'),
  homeUi = document.getElementById('home-ui'),
  onOpen,
  onClose,
  shopTutorial = null,
  onShopOpened = null,
  getStars = () => gameState.getStars(),
} = {}) {
  if (!screen) {
    return { open: () => {}, close: () => {}, isOpen: () => false };
  }

  const tabs =
    tabButtons.length > 0
      ? tabButtons
      : [...screen.querySelectorAll('[data-shop-tab]')];
  const tabPanels =
    panels.length > 0
      ? panels
      : [...screen.querySelectorAll('.shop-screen__panel')];

  let isOpen = false;
  let activeTab = 'houses';

  bindStaticLabels(screen);

  function syncStars() {
    if (starsEl) starsEl.textContent = formatStars(getStars());
  }

  function renderHouses() {
    if (!housesListEl) return;
    const houses = gameState.getHouses();
    const stars = getStars();
    const html = getHouseOrder()
      .map((id) => getHouseCardState(id, houses, stars))
      .filter(Boolean)
      .map(renderHouseCard)
      .join('');
    housesListEl.innerHTML = html;
  }

  function renderUpgrades() {
    if (!upgradeListEl) return;
    const snap = gameState.get();
    const stars = getStars();
    const html = (CONFIG.statBars ?? [])
      .map((bar) => getUpgradeCardState(bar, snap, stars))
      .map(renderUpgradeCard)
      .join('');
    upgradeListEl.innerHTML = html;
  }

  function refresh() {
    syncStars();
    if (activeTab === 'houses') renderHouses();
    if (activeTab === 'upgrade') renderUpgrades();
  }

  function handleHouseAction(id, action) {
    let ok = false;
    if (action === 'buy') {
      ok = gameState.buyHouse(id);
    } else if (action === 'select') {
      ok = gameState.setHouseActive(id);
    }
    if (!ok) return;
    gameState.save();
    refresh();
  }

  housesListEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-house-action]');
    if (!btn || btn.disabled) return;
    const id = btn.dataset.houseId;
    const action = btn.dataset.houseAction;
    if (!id || !action) return;
    handleHouseAction(id, action);
  });

  function handleUpgradeAction(statKey) {
    if (!gameState.upgradeStat(statKey)) return;
    gameState.save();
    refresh();
  }

  upgradeListEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-upgrade-action]');
    if (!btn || btn.disabled) return;
    const key = btn.dataset.stat;
    if (!key) return;
    handleUpgradeAction(key);
  });

  function forceUiClosed() {
    isOpen = false;
    screen.classList.remove('is-open');
    screen.setAttribute('hidden', '');
    screen.setAttribute('aria-hidden', 'true');
    app?.classList.remove('is-shop-active');
    homeUi?.classList.remove('is-shop-active');
  }

  function close() {
    shopTutorial?.forceReset?.();
    shopTutorial?.dismiss?.();
    if (!isOpen) {
      forceUiClosed();
      return;
    }
    isOpen = false;
    screen.classList.remove('is-open');
    screen.setAttribute('hidden', '');
    screen.setAttribute('aria-hidden', 'true');
    app?.classList.remove('is-shop-active');
    homeUi?.classList.remove('is-shop-active');
    window.dispatchEvent(new CustomEvent('kolobok:shop-close'));
    onClose?.();
  }

  async function runShopTutorialIfNeeded() {
    if (gameState.getTutorials().shopOpened) return;
    if (!shopTutorial?.show) return;
    await shopTutorial.show();
    gameState.setTutorialFlag('shopOpened', true);
    gameState.save();
  }

  function open() {
    shopTutorial?.forceReset?.();

    const wasOpen = isOpen;
    if (!wasOpen) {
      onOpen?.();
      onShopOpened?.();
    }

    isOpen = true;
    refresh();
    applyTabUi({ tabButtons: tabs, panels: tabPanels, tab: activeTab });
    screen.removeAttribute('hidden');
    screen.setAttribute('aria-hidden', 'false');
    screen.classList.add('is-open');
    app?.classList.add('is-shop-active');
    homeUi?.classList.add('is-shop-active');

    if (!wasOpen) {
      window.dispatchEvent(new CustomEvent('kolobok:shop-open'));
      requestAnimationFrame(() => {
        runShopTutorialIfNeeded();
      });
    }
  }

  backBtn?.addEventListener('click', close);

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.shopTab;
      if (!tab || tab === activeTab) return;
      activeTab = tab;
      applyTabUi({ tabButtons: tabs, panels: tabPanels, tab });
      if (tab === 'houses') renderHouses();
      if (tab === 'upgrade') renderUpgrades();
    });
  });

  eventBus.on('state:changed', () => {
    if (isOpen) refresh();
  });

  renderHouses();
  renderUpgrades();

  return {
    open,
    close,
    isOpen: () => isOpen,
    refresh,
  };
}
