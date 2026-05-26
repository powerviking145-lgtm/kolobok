/** Проверка чека через публичный API ФНС (как приложение «Проверка чека») */

import { buildFiscalQrString } from './receiptQr.js';

function pickItems(json) {
  const raw =
    json?.items ??
    json?.Items ??
    json?.commodities ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const name = String(item?.name ?? item?.Name ?? item?.productName ?? '').trim();
      if (!name) return null;

      const quantity = Number(item?.quantity ?? item?.Quantity ?? item?.itemsQuantity ?? 1) || 1;
      const priceKopecks = toKopecks(item?.price ?? item?.Price ?? item?.itemsPrice ?? item?.sum);
      const totalKopecks = toKopecks(
        item?.sum ?? item?.Sum ?? item?.itemsSum ?? item?.total ?? item?.Total ?? priceKopecks * quantity
      );

      return { name, quantity, priceKopecks, totalKopecks };
    })
    .filter(Boolean);
}

function toKopecks(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (Number.isInteger(num) && num > 1000) return num;
  return Math.round(num * 100);
}

export function parseFnsReceiptResponse(body) {
  const code = body?.code ?? body?.Code;
  if (code !== 1 && code !== '1') {
    const msg =
      body?.message ??
      body?.Message ??
      body?.data?.message ??
      'Чек не найден — проверь ФН, ФД, ФП, сумму и дату';
    throw new Error(String(msg));
  }

  const json = body?.data?.json ?? body?.data?.Json ?? body?.data ?? body?.json ?? {};
  const items = pickItems(json);
  const totalKopecks = toKopecks(
    json?.totalSum ?? json?.TotalSum ?? json?.amount ?? json?.total ?? parsedSumFallback(items)
  );

  return {
    ok: true,
    mock: false,
    source: 'fns',
    storeName: json?.user ?? json?.User ?? json?.retailPlace ?? json?.RetailPlace ?? 'Магазин',
    storeInn: json?.userInn ?? json?.UserInn ?? null,
    totalKopecks,
    items,
    receiptDate: json?.dateTime ?? json?.DateTime ?? null,
  };
}

function parsedSumFallback(items) {
  return items.reduce((acc, item) => acc + (item.totalKopecks || 0), 0);
}

function sleep(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function getFnsUrls(cfg) {
  const primary = cfg.fnsApiUrl ?? 'https://proverkacheka.nalog.ru:9999/v1/incomes/full';
  const fallbacks = cfg.fnsApiFallbackUrls ?? [
    'https://proverkacheca.nalog.ru:9999/v1/incomes/full',
  ];
  return [primary, ...fallbacks].filter((url, i, arr) => arr.indexOf(url) === i);
}

async function fetchFnsOnce(url, qr, timeoutMs, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr }),
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || `ФНС: HTTP ${res.status}`);
  }
  return parseFnsReceiptResponse(body);
}

export async function verifyReceiptViaFns(parsed, cfg = {}) {
  const qr = buildFiscalQrString(parsed);
  const urls = getFnsUrls(cfg);
  const attempts = Math.max(1, cfg.fnsRetryCount ?? 3);
  const timeoutMs = cfg.fnsTimeoutMs ?? cfg.timeoutMs ?? 35000;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    cfg.onAttempt?.(attempt, attempts);
    const url = urls[(attempt - 1) % urls.length];
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetchFnsOnce(url, qr, timeoutMs, controller.signal);
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await sleep(cfg.fnsRetryDelayMs ?? 800);
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  if (lastError?.name === 'AbortError') {
    throw new Error(
      'ФНС не ответила вовремя. Проверь интернет и попробуй ещё раз через минуту.'
    );
  }
  if (String(lastError?.message || lastError).includes('Failed to fetch')) {
    throw new Error(
      'ФНС недоступна из браузера. Нужен proxyUrl (Firebase) или открой игру в Telegram.'
    );
  }
  throw lastError ?? new Error('Не удалось проверить чек в ФНС');
}

export async function verifyReceiptViaFnsNode(parsed, cfg = {}) {
  const qr = buildFiscalQrString(parsed);
  const urls = getFnsUrls(cfg);
  const attempts = Math.max(1, cfg.fnsRetryCount ?? 3);
  const timeoutMs = cfg.fnsTimeoutMs ?? cfg.timeoutMs ?? 35000;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const url = urls[(attempt - 1) % urls.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || `ФНС: HTTP ${res.status}`);
      }
      return parseFnsReceiptResponse(body);
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await sleep(cfg.fnsRetryDelayMs ?? 800);
      }
    }
  }

  throw lastError ?? new Error('Не удалось проверить чек в ФНС');
}
