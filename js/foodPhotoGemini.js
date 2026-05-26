import { CONFIG } from './config.js';

function geminiCfg() {
  return CONFIG.foodPhoto?.gemini ?? {};
}

function getFoodList() {
  return CONFIG.homeFoods?.list ?? [];
}

function resolveApiKey() {
  const c = geminiCfg();
  if (c.apiKey && String(c.apiKey).trim()) return String(c.apiKey).trim();
  if (typeof window !== 'undefined' && window.__KOLOBOK_GEMINI_KEY) {
    return String(window.__KOLOBOK_GEMINI_KEY).trim();
  }
  return '';
}

export function isGeminiFoodPhotoReady() {
  const c = geminiCfg();
  return !!(c.enabled !== false && resolveApiKey());
}

function withTimeout(promise, ms, label = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
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

/**
 * @returns {Promise<{ food: object, comment: string, confidence: number, source: 'gemini' }>}
 */
export async function recognizeFoodWithGemini(file) {
  const c = geminiCfg();
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error('Нет ключа Gemini — добавь в config.foodPhoto.gemini.apiKey');
  }

  const model = c.model ?? 'gemini-2.0-flash';
  const maxSide = c.maxImageSide ?? 1024;
  const quality = c.jpegQuality ?? 0.82;
  const { base64, mimeType } = await compressImageFile(file, maxSide, quality);

  const catalog = buildFoodCatalogPrompt();
  const prompt = (c.prompt ?? '').trim() || [
    'Ты видишь фото еды для игры «Колобок».',
    'Выбери ОДИН id из каталога ниже — самый близкий к тому, что на фото.',
    'Если еды не видно — id: "unknown".',
    'comment — 1–2 короткие фразы от колобка игроку: ироничный братан, на «ты», без сюсюканья, без осуждения еды.',
    'Ответь ТОЛЬКО JSON без markdown:',
    '{"id":"apple","comment":"…","confidence":0.0}',
    'confidence от 0 до 1.',
    'Каталог:',
    catalog,
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await withTimeout(
    fetch(url, {
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
    }),
    c.timeoutMs ?? 25000,
    'gemini-timeout'
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 120)}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  const parsed = extractJsonObject(text);
  if (!parsed) {
    throw new Error('Gemini: не разобрал ответ');
  }

  let food = findFoodById(parsed.id) || findFoodLoose(parsed.nameRu || parsed.name || parsed.label);
  if (!food && parsed.id !== 'unknown') {
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
  };
}
