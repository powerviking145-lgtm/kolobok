/**
 * Локальная проверка ключа Gemini (не коммитить вывод с ключом).
 * node scripts/gemini-check.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
function readKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const secretsPath = join(__dirname, '../js/secrets.local.js');
  try {
    const secrets = readFileSync(secretsPath, 'utf8');
    const sm = secrets.match(/__KOLOBOK_GEMINI_KEY\s*=\s*'([^']+)'/);
    if (sm?.[1]) return sm[1].trim();
  } catch {
    /* no local secrets */
  }
  const configSrc = readFileSync(join(__dirname, '../js/config.js'), 'utf8');
  const m = configSrc.match(/foodPhoto:[\s\S]*?gemini:[\s\S]*?apiKey:\s*'([^']+)'/);
  return (m && m[1]) || '';
}

const key = readKey();
if (!key) {
  console.error('');
  console.error('Нет ключа Gemini.');
  console.error('');
  console.error('1) AI Studio → Create API key → скопируй');
  console.error('2) Открой js/secrets.local.js и вставь:');
  console.error("   window.__KOLOBOK_GEMINI_KEY = 'AIza...';");
  console.error('3) Снова: node scripts/gemini-check.mjs');
  console.error('');
  console.error('Или один раз в PowerShell:');
  console.error("   $env:GEMINI_API_KEY='AIza...'; node scripts/gemini-check.mjs");
  console.error('');
  process.exit(1);
}
console.log('Ключ: …' + key.slice(-6));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isNetworkError(err) {
  const s = `${err?.code || ''} ${err?.cause?.code || ''} ${err?.message || ''} ${err?.cause?.message || ''}`;
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|fetch failed|socket/i.test(s);
}

async function fetchRetry(url, options, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      last = err;
      if (!isNetworkError(err) || i === tries - 1) throw err;
      const wait = 1500 * (i + 1);
      console.log(`  сеть оборвалась, повтор ${i + 2}/${tries} через ${wait / 1000}с…`);
      await sleep(wait);
    }
  }
  throw last;
}

const base = 'https://generativelanguage.googleapis.com/v1beta';

let listRes;
try {
  listRes = await fetchRetry(`${base}/models?key=${encodeURIComponent(key)}`);
} catch (err) {
  console.error('');
  console.error('Не достучались до Google (ECONNRESET / сеть).');
  console.error('Ключ, скорее всего, нормальный — режет провайдер, VPN или файрвол.');
  console.error('');
  console.error('Попробуй: другой интернет, VPN, отключить антивирус на минуту.');
  console.error('Или сразу: npm run build → git push → «Сфоткать еду» в Telegram (там другая сеть).');
  console.error('');
  throw err;
}
const listJson = await listRes.json().catch(() => ({}));
console.log('LIST status:', listRes.status);
if (!listRes.ok) {
  console.log('LIST error:', JSON.stringify(listJson).slice(0, 600));
  const reason = listJson?.error?.details?.find((d) => d.reason)?.reason;
  const consumer = listJson?.error?.details?.find((d) => d.metadata?.consumer)?.metadata
    ?.consumer;
  if (/leaked/i.test(listJson?.error?.message || '')) {
    console.log('');
    console.log('→ Ключ ЗАБЛОКИРОВАН (утёк в открытый GitHub).');
    console.log('  AI Studio: удали ключ → Create API key → secrets.local.js → npm run build');
  }
  if (reason === 'API_KEY_SERVICE_BLOCKED') {
    console.log('');
    console.log('→ Ключ заблокирован для Gemini (ограничения API).');
    console.log('  AI Studio → этот ключ → шестерёнка / Google Cloud →');
    console.log('  API restrictions: «Don\'t restrict» или включи Generative Language API.');
    console.log('  Или: Create API key → новый ключ → вставь в игру.');
  }
  if (consumer) console.log('→ Google видит проект:', consumer);
}

const vision = (listJson.models || [])
  .filter(
    (mod) =>
      (mod.supportedGenerationMethods || []).includes('generateContent') &&
      /^gemini/i.test(mod.name) &&
      !/tts|embedding|imagen/i.test(mod.name)
  )
  .map((mod) => mod.name.replace(/^models\//, ''));

console.log('Vision-capable count:', vision.length);
console.log('Top ranked:', vision.slice(0, 12).join(', '));

const configured = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];
const toTest = [...new Set([...configured, ...vision.slice(0, 3)])];

for (const model of toTest) {
  const url = `${base}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetchRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say only: ok' }] }],
      generationConfig: { maxOutputTokens: 8 },
    }),
  });
  const body = await res.text();
  const snippet = body.replace(/\s+/g, ' ').slice(0, 200);
  console.log(`  ${model}: ${res.status} ${snippet}`);
}
