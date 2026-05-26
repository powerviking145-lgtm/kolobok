import { CONFIG } from './config.js';
import { parseFiscalQr, parseManualReceiptFields, formatRubFromKopecks } from './receiptQr.js';
import { scanQrFromImageFile } from './receiptQrDetect.js';
import { verifyReceiptViaFns } from './receiptFns.js';

function getCfg() {
  return CONFIG.receiptScan ?? {};
}

function hideStates(modal) {
  modal.querySelectorAll('[data-receipt-scan-state]').forEach((el) => {
    el.setAttribute('hidden', '');
  });
}

function showState(modal, name) {
  hideStates(modal);
  modal.querySelector(`[data-receipt-scan-state="${name}"]`)?.removeAttribute('hidden');
}

function setModalOpen(modal, open) {
  if (!modal) return;
  modal.hidden = !open;
  modal.setAttribute('aria-hidden', open ? 'false' : 'true');
  modal.classList.toggle('is-open', open);
}

function renderPicker(modal, cfg) {
  showState(modal, 'pick');
  const title = modal.querySelector('#receipt-scan-title');
  if (title) title.textContent = cfg.pickTitle ?? 'Добавить чек';
}

function renderLoading(modal, cfg, detail) {
  showState(modal, 'loading');
  const title = modal.querySelector('#receipt-scan-title');
  const loadingText = modal.querySelector('#receipt-scan-loading-text');
  if (title) title.textContent = cfg.loadingTitle ?? 'Проверяем чек…';
  if (loadingText) {
    loadingText.textContent = detail ?? cfg.loadingDetail ?? 'Запрос в ФНС…';
  }
}

function renderManual(modal, cfg, hint) {
  showState(modal, 'manual');
  const title = modal.querySelector('#receipt-scan-title');
  const hintEl = modal.querySelector('#receipt-scan-manual-hint');
  if (title) title.textContent = cfg.manualTitle ?? 'Ввод с чека';
  if (hintEl) hintEl.textContent = hint || cfg.manualHint;
}

function renderError(modal, message, cfg, { showManualBtn = false, showRetryBtn = false } = {}) {
  showState(modal, 'error');
  const errText = modal.querySelector('#receipt-scan-error-text');
  const manualBtn = modal.querySelector('#receipt-scan-error-manual');
  const retryBtn = modal.querySelector('#receipt-scan-error-retry');
  if (errText) errText.textContent = message || cfg.errorFallback || 'Не удалось проверить чек';
  const title = modal.querySelector('#receipt-scan-title');
  if (title) title.textContent = cfg.errorTitle ?? 'Ошибка';
  if (manualBtn) {
    if (showManualBtn) manualBtn.removeAttribute('hidden');
    else manualBtn.setAttribute('hidden', '');
  }
  if (retryBtn) {
    if (showRetryBtn) retryBtn.removeAttribute('hidden');
    else retryBtn.setAttribute('hidden', '');
  }
}

function renderResult(modal, payload, cfg) {
  showState(modal, 'result');
  const title = modal.querySelector('#receipt-scan-title');
  const meta = modal.querySelector('#receipt-scan-meta');
  const list = modal.querySelector('#receipt-scan-list');
  const mockBadge = modal.querySelector('#receipt-scan-mock-badge');

  if (title) title.textContent = cfg.resultTitle ?? 'Покупки в чеке';

  const store = payload.storeName || cfg.unknownStore || 'Магазин';
  const total = formatRubFromKopecks(payload.totalKopecks ?? 0);
  const count = payload.items?.length ?? 0;
  if (meta) meta.textContent = `${store} · ${count} поз. · ${total} ₽`;

  if (mockBadge) {
    mockBadge.classList.remove('receipt-scan-modal__source--fns');
    if (payload.mock) {
      mockBadge.textContent = cfg.mockBadgeText ?? 'Тестовый режим (mock)';
      mockBadge.removeAttribute('hidden');
    } else if (payload.source === 'fns') {
      mockBadge.textContent = cfg.fnsBadgeText ?? 'Проверено через ФНС';
      mockBadge.classList.add('receipt-scan-modal__source--fns');
      mockBadge.removeAttribute('hidden');
    } else {
      mockBadge.setAttribute('hidden', '');
    }
  }

  if (list) {
    list.replaceChildren();
    const items = payload.items ?? [];
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'receipt-scan-modal__empty';
      li.textContent = cfg.emptyItems ?? 'Позиции не детализированы (свёрнутый чек)';
      list.appendChild(li);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'receipt-scan-modal__item';
      const qty = item.quantity ?? 1;
      const lineTotal = formatRubFromKopecks(item.totalKopecks ?? item.priceKopecks ?? 0);
      const qtyLabel = qty > 1 ? ` × ${qty}` : '';
      li.textContent = `${item.name}${qtyLabel} — ${lineTotal} ₽`;
      list.appendChild(li);
    });
  }
}

async function verifyReceipt(parsed, extra = {}) {
  const cfg = { ...getCfg(), ...extra };

  if (cfg.proxyUrl) {
    return fetchReceiptProxy(parsed, cfg);
  }

  if (cfg.useFnsDirect !== false) {
    try {
      return await verifyReceiptViaFns(parsed, cfg);
    } catch (err) {
      if (cfg.useMock && cfg.devFakeItems) {
        return buildDevMockResponse(parsed, cfg);
      }
      throw err;
    }
  }

  if (cfg.useMock && cfg.devFakeItems) {
    return buildDevMockResponse(parsed, cfg);
  }

  throw new Error('Проверка чека недоступна — включи useFnsDirect или укажи proxyUrl');
}

function buildDevMockResponse(parsed, cfg) {
  return {
    ok: true,
    mock: true,
    source: 'mock',
    storeName: cfg.mockStoreName ?? 'Тест · mock',
    storeInn: '7700000000',
    totalKopecks: parsed.sumKopecks,
    items: cfg.mockItems ?? [],
  };
}

async function fetchReceiptProxy(parsed, cfg) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), cfg.timeoutMs ?? 15000);

  try {
    const res = await fetch(cfg.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fn: parsed.fn,
        fd: parsed.fd,
        fp: parsed.fp,
        sumKopecks: parsed.sumKopecks,
        dateTime: parsed.dateTime,
        opType: parsed.opType,
      }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || data.message || `ОФД: HTTP ${res.status}`);
    }
    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function scanViaTelegram(cfg) {
  return new Promise((resolve, reject) => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.showScanQrPopup) {
      reject(new Error('no-telegram'));
      return;
    }
    tg.showScanQrPopup({ text: cfg.telegramScanHint ?? 'Наведи на QR чека' }, (text) => {
      if (!text) reject(new Error('Скан отменён'));
      else resolve(text);
    });
  });
}

function pickImageFile(fileInput) {
  return new Promise((resolve, reject) => {
    if (!fileInput) {
      reject(new Error('Фото недоступно'));
      return;
    }
    const onChange = () => {
      fileInput.removeEventListener('change', onChange);
      const [picked] = fileInput.files ?? [];
      fileInput.value = '';
      if (!picked) reject(new Error('Скан отменён'));
      else resolve(picked);
    };
    fileInput.removeAttribute('capture');
    fileInput.addEventListener('change', onChange);
    fileInput.click();
  });
}

async function processParsedReceipt(modal, parsed, cfg) {
  renderLoading(modal, cfg);
  const payload = await verifyReceipt(parsed, {
    ...cfg,
    onAttempt: (attempt, total) => {
      renderLoading(modal, cfg, `Запрос в ФНС… попытка ${attempt}/${total}`);
    },
  });
  renderResult(modal, payload, cfg);
}

export function initReceiptScan({
  btn,
  modal,
  backdrop,
  closeBtn,
  fileInput,
  closeBtns,
  manualForm,
} = {}) {
  const cfg = getCfg();
  if (!btn || !modal) return () => {};

  let busy = false;
  let lastParsed = null;

  const close = () => {
    setModalOpen(modal, false);
    manualForm?.reset();
  };

  const submitParsed = async (parsed) => {
    lastParsed = parsed;
    busy = true;
    try {
      await processParsedReceipt(modal, parsed, cfg);
    } catch (err) {
      const msg =
        err?.name === 'AbortError'
          ? 'ФНС не ответила вовремя. Проверь интернет и попробуй ещё раз.'
          : err?.message || cfg.errorFallback;
      renderError(modal, msg, cfg, { showManualBtn: true, showRetryBtn: true });
    } finally {
      busy = false;
    }
  };

  const openPicker = () => {
    if (busy) return;
    setModalOpen(modal, true);
    renderPicker(modal, cfg);
  };

  const runFromPhoto = async () => {
    busy = true;
    renderLoading(modal, cfg);
    try {
      const file = await pickImageFile(fileInput);
      const raw = await scanQrFromImageFile(file);
      const parsed = parseFiscalQr(raw);
      await submitParsed(parsed);
    } catch (err) {
      if (err?.code === 'qr-not-found' || err?.code === 'no-barcode-detector') {
        renderManual(
          modal,
          cfg,
          err.code === 'no-barcode-detector'
            ? cfg.manualHintNoDetector
            : cfg.manualHintQrMiss
        );
      } else if (err?.message === 'Скан отменён') {
        renderPicker(modal, cfg);
      } else {
        renderError(modal, err?.message, cfg, { showManualBtn: true });
      }
    } finally {
      busy = false;
    }
  };

  const runTelegramScan = async () => {
    busy = true;
    renderLoading(modal, cfg);
    try {
      const raw = await scanViaTelegram(cfg);
      const parsed = parseFiscalQr(raw);
      await submitParsed(parsed);
    } catch (err) {
      if (err?.message === 'no-telegram') {
        busy = false;
        await runFromPhoto();
        return;
      }
      if (err?.message === 'Скан отменён') {
        renderPicker(modal, cfg);
      } else {
        renderError(modal, err?.message, cfg, { showManualBtn: true });
      }
    } finally {
      busy = false;
    }
  };

  manualForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    try {
      const data = new FormData(manualForm);
      const parsed = parseManualReceiptFields({
        fn: data.get('fn'),
        fd: data.get('fd'),
        fp: data.get('fp'),
        sum: data.get('sum'),
        date: data.get('date'),
        time: data.get('time'),
      });
      await submitParsed(parsed);
    } catch (err) {
      renderError(modal, err?.message, cfg, { showManualBtn: false });
    } finally {
      busy = false;
    }
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openPicker();
  });

  modal.querySelector('#receipt-scan-pick-qr')?.addEventListener('click', () => {
    setModalOpen(modal, true);
    runTelegramScan();
  });
  modal.querySelector('#receipt-scan-pick-photo')?.addEventListener('click', () => {
    setModalOpen(modal, true);
    runFromPhoto();
  });
  modal.querySelector('#receipt-scan-pick-manual')?.addEventListener('click', () => {
    renderManual(modal, cfg);
  });
  modal.querySelector('#receipt-scan-manual-back')?.addEventListener('click', () => {
    renderPicker(modal, cfg);
  });
  modal.querySelector('#receipt-scan-error-retry')?.addEventListener('click', () => {
    if (lastParsed && !busy) submitParsed(lastParsed);
  });
  modal.querySelector('#receipt-scan-error-manual')?.addEventListener('click', () => {
    renderManual(modal, cfg, cfg.manualHintQrMiss);
  });

  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  (closeBtns ?? []).forEach((el) => el?.addEventListener('click', close));

  return close;
}
