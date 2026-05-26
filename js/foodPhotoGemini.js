import { CONFIG } from './config.js';

function geminiCfg() {
  return CONFIG.foodPhoto?.gemini ?? {};
}

function getFoodList() {
  return CONFIG.homeFoods?.list ?? [];
}

function resolveApiKey() {
  if (typeof window !== 'undefined' && window.__KOLOBOK_GEMINI_KEY) {
    const w = String(window.__KOLOBOK_GEMINI_KEY).trim();
    if (w) return w;
  }
  if (typeof globalThis !== 'undefined' && globalThis.__KOLOBOK_GEMINI_BUILD_KEY__) {
    const b = String(globalThis.__KOLOBOK_GEMINI_BUILD_KEY__).trim();
    if (b) return b;
  }
  const c = geminiCfg();
  if (c.apiKey && String(c.apiKey).trim()) return String(c.apiKey).trim();
  return '';
}

export function isGeminiFoodPhotoReady() {
  const c = geminiCfg();
  if (c.enabled === false) return false;
  if (String(c.proxyUrl || '').trim()) return true;
  return !!resolveApiKey();
}

function withTimeout(promise, ms, label = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

function normalizeModelId(name) {
  return String(name || '')
    .replace(/^models\//, '')
    .trim();
}

/** Не TTS/embedding — нужны модели с generateContent для картинки */
function isVisionCandidate(name) {
  const n = normalizeModelId(name).toLowerCase();
  if (!n || !n.startsWith('gemini')) return false;
  if (/tts|embedding|imagen|aqa|live|native-audio|computer-use|robotics/i.test(n)) {
    return false;
  }
  return true;
}

function modelScore(name) {
  const n = normalizeModelId(name).toLowerCase();
  let s = 0;
  if (n.includes('2.5')) s += 50;
  if (n.includes('2.0')) s += 35;
  if (n.includes('1.5')) s += 25;
  if (n.includes('flash')) s += 30;
  if (n.includes('pro')) s += 12;
  if (n.includes('lite')) s += 8;
  if (n.includes('preview')) s -= 3;
  return s;
}

function rankVisionModels(names) {
  return [...new Set(names.filter(isVisionCandidate))].sort(
    (a, b) => modelScore(b) - modelScore(a)
  );
}

async function fetchAvailableGeminiModels(apiKey) {
  const c = geminiCfg();
  const res = await withTimeout(
    fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      undefined,
      c
    ),
    12000,
    'gemini-list-timeout'
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.models || [])
    .filter(
      (m) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
    )
    .map((m) => normalizeModelId(m.name))
    .filter(isVisionCandidate);
}

async function resolveModelCandidates(apiKey) {
  const c = geminiCfg();
  const configured = rankVisionModels(
    (Array.isArray(c.models) && c.models.length
      ? c.models
      : c.model
        ? [c.model]
        : []) || ['gemini-2.5-flash', 'gemini-1.5-flash']
  );

  const discovered =
    c.useApiModelList === false
      ? []
      : await fetchAvailableGeminiModels(apiKey).catch(() => []);
  const merged = [];
  const seen = new Set();

  for (const id of [...configured, ...discovered]) {
    const norm = normalizeModelId(id);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    merged.push(norm);
  }

  const ranked = rankVisionModels(merged);
  return ranked.length ? ranked : configured;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не прочитал фото'));
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file, maxSide = 1024, quality = 0.82) {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Битое фото'));
    el.src = dataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas недоступен');
  ctx.drawImage(img, 0, 0, width, height);

  const outType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), outType === 'image/png' ? 'image/jpeg' : outType, quality);
  });
  if (!blob) throw new Error('Не сжал фото');

  return {
    base64: await blobToBase64(blob),
    mimeType: blob.type || 'image/jpeg',
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const idx = raw.indexOf(',');
      resolve(idx >= 0 ? raw.slice(idx + 1) : raw);
    };
    reader.onerror = () => reject(new Error('base64 fail'));
    reader.readAsDataURL(blob);
  });
}

function buildFoodCatalogPrompt() {
  const foods = getFoodList();
  return foods
    .map((f) => `${f.id} (${f.emoji} ${f.name}, kind=${f.kind})`)
    .join('\n');
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

function findFoodById(id) {
  if (!id) return null;
  const foods = getFoodList();
  return foods.find((f) => f.id === id) ?? null;
}

function findFoodLoose(label) {
  const q = String(label || '').trim().toLowerCase();
  if (!q) return null;
  const foods = getFoodList();
  return (
    foods.find((f) => f.id === q) ||
    foods.find((f) => f.name.toLowerCase() === q) ||
    foods.find((f) => q.includes(f.name.toLowerCase())) ||
    foods.find((f) => f.name.toLowerCase().includes(q))
  );
}

const GEMINI_RATE_LIMIT =
  'Слишком много запросов к Gemini. Подожди 30–60 сек. Если уже оплатил — выпусти новый API key в том же проекте, где включён биллинг (aistudio.google.com/apikey).';

const GEMINI_API_DISABLED =
  'Ключ не от AI Studio: Gemini API выключен. Создай ключ на aistudio.google.com/apikey (проект с оплатой).';

const GEMINI_KEY_LEAKED =
  'Старый ключ Gemini заблокирован (попал в открытый GitHub). В AI Studio удали его, создай новый → js/secrets.local.js → npm run build → git push.';

const GEMINI_LOCATION =
  'Gemini из твоего региона напрямую недоступен. Нужен прокси Firebase — см. FOOD_PHOTO.md (раздел «Прокси»).';

function isGeminiApiDisabled(_res, errText) {
  const msg = String(errText || '').toLowerCase();
  return (
    msg.includes('service_disabled') ||
    msg.includes('api_key_service_blocked') ||
    msg.includes('has not been used in project') ||
    msg.includes('generativelanguage.googleapis.com') && msg.includes('disabled')
  );
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isNetworkError(err) {
  const s = `${err?.code || ''} ${err?.cause?.code || ''} ${err?.message || ''}`;
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|Failed to fetch|fetch failed|network/i.test(
    s
  );
}

async function fetchWithRetry(url, options, cfg) {
  const tries = cfg.networkRetries ?? 3;
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      last = err;
      if (!isNetworkError(err) || i === tries - 1) throw err;
      await sleep(cfg.networkRetryMs ?? 1800 * (i + 1));
    }
  }
  throw last;
}

function isModelUnavailable(res, errText) {
  const msg = String(errText || '').toLowerCase();
  return (
    res.status === 404 ||
    msg.includes('no longer available') ||
    msg.includes('not found') ||
    msg.includes('is not found')
  );
}

function buildRecognitionPrompt(c) {
  const catalog = buildFoodCatalogPrompt();
  return (
    (c.prompt ?? '').trim() ||
    [
      'Ты видишь фото еды для игры «Колобок».',
      'Выбери ОДИН id из каталога ниже — самый близкий к тому, что на фото.',
      'Если еды не видно — id: "unknown".',
      'comment — 1–2 короткие фразы от колобка игроку: ироничный братан, на «ты», без сюсюканья, без осуждения еды.',
      'Ответь ТОЛЬКО JSON без markdown:',
      '{"id":"apple","comment":"…","confidence":0.0}',
      'confidence от 0 до 1.',
      'Каталог:',
      catalog,
    ].join('\n')
  );
}

function finishRecognition(text, model) {
  const parsed = extractJsonObject(text);
  if (!parsed) {
    throw new Error('Gemini: не разобрал ответ');
  }

  if (String(parsed.id || '').toLowerCase() === 'unknown') {
    throw new Error('На фото не видно еду — сфоткай тарелку или продукт поближе');
  }

  let food =
    findFoodById(parsed.id) ||
    findFoodLoose(parsed.nameRu || parsed.name || parsed.label);
  if (!food && parsed.id) {
    food = findFoodLoose(parsed.id);
  }
  if (!food) {
    throw new Error('Gemini: еда не из каталога');
  }

  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7));
  const comment = String(parsed.comment || '').trim();

  return {
    food,
    comment,
    confidence,
    source: 'gemini',
    model,
  };
}

function defaultModelList(c) {
  return rankVisionModels(
    Array.isArray(c.models) && c.models.length
      ? c.models
      : ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']
  );
}

async function recognizeViaProxy({ prompt, base64, mimeType, models, c }) {
  const res = await withTimeout(
    fetchWithRetry(
      String(c.proxyUrl).trim(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mimeType,
          imageBase64: base64,
          models,
          temperature: c.temperature ?? 0.35,
          maxOutputTokens: c.maxOutputTokens ?? 280,
        }),
      },
      c
    ),
    c.timeoutMs ?? 28000,
    'gemini-timeout'
  );
  const data = await res.json().catch(() => ({}));
  const errMsg = String(data.error || '');
  if (!res.ok || !data.ok) {
    if (/location is not supported/i.test(errMsg)) {
      throw new Error(GEMINI_LOCATION);
    }
    if (/API_KEY_INVALID|api key not valid/i.test(errMsg)) {
      throw new Error(
        'Ключ Gemini на сервере неверный — обнови GEMINI_API_KEY в Firebase (AI Studio)'
      );
    }
    throw new Error(errMsg || `Прокси Gemini: HTTP ${res.status}`);
  }
  return { text: data.text, model: data.model || models[0] };
}

/**
 * @returns {Promise<{ food: object, comment: string, confidence: number, source: 'gemini', model: string }>}
 */
export async function recognizeFoodWithGemini(file) {
  const c = geminiCfg();
  const proxyUrl = String(c.proxyUrl || '').trim();
  const apiKey = resolveApiKey();
  if (!proxyUrl && !apiKey) {
    throw new Error(
      'Нет proxyUrl (Firebase) и нет ключа Gemini — см. FOOD_PHOTO.md'
    );
  }

  const maxSide = c.maxImageSide ?? 1024;
  const quality = c.jpegQuality ?? 0.82;
  const { base64, mimeType } = await compressImageFile(file, maxSide, quality);

  const prompt = buildRecognitionPrompt(c);

  if (proxyUrl) {
    const models = defaultModelList(c);
    const { text, model } = await recognizeViaProxy({
      prompt,
      base64,
      mimeType,
      models,
      c,
    });
    return finishRecognition(text, model);
  }

  const modelCandidates = await resolveModelCandidates(apiKey);
  if (!modelCandidates.length) {
    throw new Error('Gemini: нет подходящих vision-моделей для фото');
  }

  let lastErr = null;
  const tried = [];

  for (const model of modelCandidates) {
    tried.push(model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      let res = null;
      let errText = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        res = await withTimeout(
          fetchWithRetry(
            url,
            {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              generationConfig: {
                temperature: c.temperature ?? 0.35,
                maxOutputTokens: c.maxOutputTokens ?? 256,
              },
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: base64 } },
                  ],
                },
              ],
            }),
            },
            c
          ),
          c.timeoutMs ?? 28000,
          'gemini-timeout'
        );
        if (res.ok) break;
        errText = await res.text().catch(() => '');
        const rateLimited =
          res.status === 429 || /quota|rate limit|resource_exhausted/i.test(errText);
        if (rateLimited && attempt === 0) {
          await sleep(c.rateLimitRetryMs ?? 2500);
          continue;
        }
        break;
      }

      if (!res.ok) {
        if (
          res.status === 429 ||
          /quota|rate limit|resource_exhausted/i.test(errText)
        ) {
          throw new Error(GEMINI_RATE_LIMIT);
        }

        if (res.status === 403 && /leaked/i.test(errText)) {
          throw new Error(GEMINI_KEY_LEAKED);
        }

        if (res.status === 403 && isGeminiApiDisabled(res, errText)) {
          throw new Error(GEMINI_API_DISABLED);
        }

        if (isModelUnavailable(res, errText)) {
          lastErr = new Error('GEMINI_ALL_MODELS_UNAVAILABLE');
          continue;
        }

        if (/location is not supported|failed_precondition/i.test(errText)) {
          throw new Error(GEMINI_LOCATION);
        }

        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 140)}`);
      }

      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
      return finishRecognition(text, model);
    } catch (err) {
      const fatal = String(err?.message || '');
      if (
        fatal === GEMINI_RATE_LIMIT ||
        fatal === GEMINI_API_DISABLED ||
        fatal === GEMINI_KEY_LEAKED ||
        fatal === GEMINI_LOCATION
      ) {
        throw err;
      }
      if (isNetworkError(err)) {
        throw new Error(
          'Нет связи с Google — попробуй ещё раз (интернет/VPN)'
        );
      }
      lastErr = err;
    }
  }

  console.warn('Колобок Gemini: модели', tried.join(', '));
  if (lastErr?.message === 'GEMINI_ALL_MODELS_UNAVAILABLE') {
    throw new Error(
      'Gemini не ответил (ключ или модели). Проверь новый ключ: node scripts/gemini-check.mjs'
    );
  }

  throw (
    lastErr ||
    new Error(
      'Gemini не ответил. Создай новый ключ в AI Studio и собери: npm run build'
    )
  );
}
