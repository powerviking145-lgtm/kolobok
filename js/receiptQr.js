/** Парсинг QR российского фискального чека (54-ФЗ) */

function parseSumToKopecks(raw) {
  const normalized = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Некорректная сумма в QR');
  }
  return Math.round(value * 100);
}

function formatFiscalDatetime(raw) {
  const match = String(raw).trim().match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/);
  if (!match) {
    throw new Error('Некорректная дата в QR');
  }
  const [, y, mo, d, h, mi, s = '00'] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.000`;
}

function extractQueryString(input) {
  const text = String(input).trim();
  if (!text) return '';
  if (text.includes('?')) {
    return text.slice(text.indexOf('?') + 1);
  }
  if (/^t=/i.test(text)) {
    return text;
  }
  return text;
}

export function parseFiscalQr(input) {
  const query = extractQueryString(input).replace(/;/g, '&');
  const params = new URLSearchParams(query);

  const t = params.get('t');
  const s = params.get('s');
  const fn = params.get('fn');
  const fd = params.get('i');
  const fp = params.get('fp');
  const opType = params.get('n') || '1';

  if (!t || !s || !fn || !fd || !fp) {
    throw new Error('QR не похож на чек: не хватает полей t/s/fn/i/fp');
  }

  if (opType !== '1') {
    throw new Error('Это не чек покупки (возврат или другая операция)');
  }

  const sumKopecks = parseSumToKopecks(s);
  const dateTime = formatFiscalDatetime(t);

  return {
    fn,
    fd,
    fp,
    sumKopecks,
    sumRub: sumKopecks / 100,
    dateTime,
    opType,
    raw: query,
  };
}

/** Собрать QR-строку для API ФНС из распарсенных полей */
export function buildFiscalQrString(parsed) {
  const m = String(parsed.dateTime).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error('Некорректная дата чека');
  const [, y, mo, d, h, mi] = m;
  const t = `${y}${mo}${d}T${h}${mi}`;
  const s = (parsed.sumKopecks / 100).toFixed(2);
  return `t=${t}&s=${s}&fn=${parsed.fn}&i=${parsed.fd}&fp=${parsed.fp}&n=${parsed.opType || 1}`;
}

export function formatRubFromKopecks(kopecks) {
  const rub = (Number(kopecks) || 0) / 100;
  return rub.toLocaleString('ru-RU', {
    minimumFractionDigits: rub % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Ручной ввод с бумажного чека: ФН, ФД, ФП, сумма, дата/время */
export function parseManualReceiptFields(fields) {
  const fn = String(fields.fn ?? '').replace(/\D/g, '');
  const fd = String(fields.fd ?? '').replace(/\D/g, '');
  const fp = String(fields.fp ?? '').replace(/\D/g, '');
  const sumKopecks = parseSumToKopecks(fields.sum);
  const dateTime = parseManualDateTime(fields.date, fields.time);

  if (!fn || fn.length < 10) throw new Error('Укажи ФН (номер фискального накопителя)');
  if (!fd) throw new Error('Укажи ФД (номер фискального документа)');
  if (!fp) throw new Error('Укажи ФП (фискальный признак)');

  return {
    fn,
    fd,
    fp,
    sumKopecks,
    sumRub: sumKopecks / 100,
    dateTime,
    opType: '1',
    raw: `manual:${fn}:${fd}:${fp}`,
  };
}

function parseManualDateTime(dateRaw, timeRaw) {
  const dateText = String(dateRaw ?? '').trim();
  const timeText = String(timeRaw ?? '').trim();

  const dateMatch = dateText.match(/^(\d{2})[.\-/](\d{2})[.\-/](\d{4})$/);
  if (!dateMatch) throw new Error('Дата: формат ДД.ММ.ГГГГ');
  const [, d, mo, y] = dateMatch;

  const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!timeMatch) throw new Error('Время: формат ЧЧ:ММ');
  const [, h, mi, s = '00'] = timeMatch;

  const t = `${y}${mo}${d}T${h.padStart(2, '0')}${mi}${String(s).padStart(2, '0')}`;
  return formatFiscalDatetime(t);
}
