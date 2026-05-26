/**
 * Firebase Cloud Function: проверка чека через ФНС (бесплатно) или OFD.ru QR Cash.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const ofdTokenSecret = defineSecret('OFD_TOKEN_SECRET');
const OFD_URL = 'https://ofd.ru/api/partner/v3/receipts/GetReceipt';
const FNS_URL = 'https://proverkacheka.nalog.ru:9999/v1/incomes/full';

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

function buildFiscalQrString({ fn, fd, fp, sumKopecks, dateTime, opType }) {
  const m = String(dateTime).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error('Некорректная дата чека');
  const [, y, mo, d, h, mi] = m;
  const t = `${y}${mo}${d}T${h}${mi}`;
  const s = (Number(sumKopecks) / 100).toFixed(2);
  return `t=${t}&s=${s}&fn=${fn}&i=${fd}&fp=${fp}&n=${opType || 1}`;
}

function toKopecks(value) {
  if (value == null || value === '') return 0;
  const num = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(num)) return 0;
  if (Number.isInteger(num) && num >= 1000) return num;
  return Math.round(num * 100);
}

function pickFnsItems(json) {
  const raw = json?.items ?? json?.Items ?? json?.commodities ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const name = String(item?.name ?? item?.Name ?? item?.productName ?? '').trim();
      if (!name) return null;
      const quantity = Number(item?.quantity ?? item?.Quantity ?? 1) || 1;
      const priceKopecks = toKopecks(item?.price ?? item?.Price ?? item?.itemsPrice);
      const totalKopecks = toKopecks(
        item?.sum ?? item?.Sum ?? item?.itemsSum ?? item?.total ?? priceKopecks * quantity
      );
      return { name, quantity, priceKopecks, totalKopecks };
    })
    .filter(Boolean);
}

async function verifyViaFns(body) {
  const qr = buildFiscalQrString(body);
  const res = await fetch(FNS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr }),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `ФНС HTTP ${res.status}`);
  }
  const code = json?.code ?? json?.Code;
  if (code !== 1 && code !== '1') {
    throw new Error(json?.message || json?.data?.message || 'Чек не найден в ФНС');
  }
  const doc = json?.data?.json ?? json?.data ?? {};
  const items = pickFnsItems(doc);
  return {
    ok: true,
    mock: false,
    source: 'fns',
    storeName: doc?.user ?? doc?.User ?? doc?.retailPlace ?? 'Магазин',
    storeInn: doc?.userInn ?? doc?.UserInn ?? null,
    totalKopecks: toKopecks(doc?.totalSum ?? doc?.TotalSum ?? body.sumKopecks),
    items,
    receiptDate: doc?.dateTime ?? doc?.DateTime ?? null,
  };
}

function normalizeOfdItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      name: String(item.Name ?? item.name ?? '').trim(),
      quantity: Number(item.Quantity ?? item.quantity ?? 1),
      priceKopecks: Number(item.Price ?? item.priceKopecks ?? 0),
      totalKopecks: Number(item.Total ?? item.totalKopecks ?? item.Price ?? 0),
    }))
    .filter((item) => item.name);
}

async function verifyViaOfd(body, token) {
  const payload = {
    TotalSum: Number(body.sumKopecks),
    DocDateTime: String(body.dateTime),
    FnNumber: String(body.fn),
    ReceiptOperationType: String(body.opType || '1'),
    DocNumber: String(body.fd),
    DocFiscalSign: String(body.fp),
    tokenSecret: token,
  };

  const ofdRes = await fetch(OFD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });

  const ofdJson = await ofdRes.json().catch(() => ({}));
  if (!ofdRes.ok) {
    throw new Error(ofdJson?.Errors?.[0]?.Message || `ОФД HTTP ${ofdRes.status}`);
  }
  if (ofdJson.Success === false) {
    throw new Error(
      ofdJson.Errors?.[0]?.Message || ofdJson.ValidationErrors || 'Чек не найден в ОФД'
    );
  }

  const doc = ofdJson?.Data?.Document ?? ofdJson?.Document ?? null;
  if (!doc) throw new Error('Пустой ответ ОФД');

  return {
    ok: true,
    mock: false,
    source: 'ofd',
    storeName: doc.User || doc.RetailPlaceAddress || 'Магазин',
    storeInn: doc.UserInn || null,
    totalKopecks: Number(doc.Amount_Total ?? body.sumKopecks),
    items: normalizeOfdItems(doc.Items),
    receiptDate: doc.DateTime || null,
  };
}

exports.verifyReceipt = onRequest(
  { secrets: [ofdTokenSecret], cors: true, region: 'europe-west1' },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Только POST' });
      return;
    }

    const body = req.body ?? {};
    const { fn, fd, fp, sumKopecks, dateTime } = body;
    if (!fn || !fd || !fp || !sumKopecks || !dateTime) {
      res.status(400).json({ ok: false, error: 'Не хватает полей чека' });
      return;
    }

    try {
      const result = await verifyViaFns(body);
      res.json(result);
    } catch (fnsErr) {
      const token = ofdTokenSecret.value();
      if (!token) {
        res.status(404).json({ ok: false, error: fnsErr?.message || 'Чек не найден' });
        return;
      }
      try {
        const ofdResult = await verifyViaOfd(body, token);
        res.json(ofdResult);
      } catch (ofdErr) {
        res.status(404).json({
          ok: false,
          error: ofdErr?.message || fnsErr?.message || 'Чек не найден',
        });
      }
    }
  }
);
