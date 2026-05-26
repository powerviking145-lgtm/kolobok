/**
 * SVG-паттерны среза почвы (data URL → Image для Canvas 2D).
 * Этап 4: offsets и scrollSpeed подключаются в drawSoilLayers.
 */

const PATTERN_CACHE_KEY = 3;

const LAYER_SPECS = [
  {
    id: 'grass',
    endY: 0.5,
    patternW: 256,
    patternH: 48,
    scrollMul: 1.0,
    buildSvg: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="48" viewBox="0 0 256 48">
  <defs>
    <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7A9E4D"/>
      <stop offset="100%" stop-color="#6B8E3D"/>
    </linearGradient>
  </defs>
  <rect width="256" height="48" fill="url(#gG)"/>
  <path d="M8 46 Q10 36 14 46" fill="#5A7A38" opacity="0.85"/>
  <path d="M36 46 Q39 32 43 46" fill="#4A6B2A" opacity="0.9"/>
  <path d="M68 46 Q71 38 75 46" fill="#5A7A38" opacity="0.8"/>
  <path d="M102 46 Q105 30 109 46" fill="#4A6B2A"/>
  <path d="M138 46 Q141 36 145 46" fill="#5A7A38" opacity="0.85"/>
  <path d="M172 46 Q175 34 179 46" fill="#4A6B2A" opacity="0.9"/>
  <path d="M206 46 Q209 38 213 46" fill="#5A7A38"/>
  <path d="M240 46 Q243 32 247 46" fill="#4A6B2A"/>
  <path d="M252 46 Q254 38 256 46 L256 48 L0 48 L0 46 Q2 38 6 46" fill="#4A6B2A" opacity="0.75"/>
</svg>`,
  },
  {
    id: 'topsoil',
    endY: 0.65,
    patternW: 200,
    patternH: 100,
    scrollMul: 0.7,
    buildSvg: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
  <defs>
    <linearGradient id="topG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8B5A2B"/>
      <stop offset="100%" stop-color="#6B4423"/>
    </linearGradient>
  </defs>
  <rect width="200" height="100" fill="url(#topG)"/>
  <ellipse cx="35" cy="62" rx="9" ry="6" fill="#5A4A3A"/>
  <ellipse cx="88" cy="48" rx="7" ry="5" fill="#4A3A2A"/>
  <ellipse cx="145" cy="70" rx="10" ry="6" fill="#5A4A3A"/>
  <ellipse cx="175" cy="42" rx="6" ry="4" fill="#4A3A2A"/>
  <path d="M22 55 Q40 48 58 58" stroke="#3D2818" stroke-width="1.2" fill="none"/>
  <path d="M110 40 Q125 52 140 45" stroke="#3D2818" stroke-width="1" fill="none"/>
  <path d="M155 65 Q170 58 188 68" stroke="#2A1A0A" stroke-width="0.9" fill="none"/>
  <circle cx="62" cy="78" r="2" fill="#6B5040" opacity="0.6"/>
  <circle cx="128" cy="82" r="1.5" fill="#6B5040" opacity="0.5"/>
</svg>`,
  },
  {
    id: 'deep',
    endY: 0.85,
    patternW: 200,
    patternH: 150,
    scrollMul: 0.4,
    buildSvg: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
  <defs>
    <linearGradient id="deepG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5D3A1F"/>
      <stop offset="100%" stop-color="#4A2F18"/>
    </linearGradient>
  </defs>
  <rect width="200" height="150" fill="url(#deepG)"/>
  <path d="M20 70 Q55 62 90 75 Q120 82 150 68" stroke="#3A2210" stroke-width="2" fill="none" opacity="0.7"/>
  <path d="M10 110 Q70 98 130 108 Q165 115 195 102" stroke="#2E1A0C" stroke-width="1.5" fill="none"/>
  <ellipse cx="48" cy="95" rx="18" ry="12" fill="#4A3525"/>
  <ellipse cx="125" cy="118" rx="22" ry="14" fill="#3D2A1A"/>
  <ellipse cx="168" cy="55" rx="14" ry="9" fill="#4A3525"/>
  <path d="M75 40 Q95 55 115 42" stroke="#3A2210" stroke-width="1.2" fill="none" opacity="0.6"/>
</svg>`,
  },
  {
    id: 'rock',
    endY: 1,
    patternW: 200,
    patternH: 100,
    scrollMul: 0.2,
    buildSvg: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
  <rect width="200" height="100" fill="#3A2412"/>
  <path d="M15 20 L45 55" stroke="#2A1A0A" stroke-width="0.8"/>
  <path d="M60 10 L72 80" stroke="#2A1A0A" stroke-width="0.7"/>
  <path d="M95 30 L110 90" stroke="#2A1A0A" stroke-width="0.9"/>
  <path d="M130 15 L155 70" stroke="#2A1A0A" stroke-width="0.75"/>
  <path d="M170 25 L188 85" stroke="#2A1A0A" stroke-width="0.85"/>
  <path d="M25 75 L80 68" stroke="#2A1A0A" stroke-width="0.6" opacity="0.8"/>
</svg>`,
  },
];

function svgToDataUrl(svg) {
  const trimmed = svg.replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const cache = {
  key: 0,
  ready: false,
  loading: null,
  layers: [],
};

export function preloadSoilPatterns() {
  if (cache.ready && cache.key === PATTERN_CACHE_KEY) return Promise.resolve(cache.layers);
  if (cache.loading) return cache.loading;
  cache.ready = false;

  cache.loading = Promise.all(
    LAYER_SPECS.map(async (spec) => {
      const img = await loadImage(svgToDataUrl(spec.buildSvg()));
      return { ...spec, image: img };
    })
  ).then((layers) => {
    cache.layers = layers;
    cache.key = PATTERN_CACHE_KEY;
    cache.ready = true;
    cache.loading = null;
    return layers;
  });

  return cache.loading;
}

function wrapOffset(offsetX, tileW) {
  if (tileW <= 0) return offsetX;
  let o = offsetX % tileW;
  if (o > 0) o -= tileW;
  return o;
}

/** Бесшовная плитка: offsetX и offsetX + tileW (через цикл). */
function drawTiledBand(ctx, img, y, w, h, offsetX) {
  const pw = img.naturalWidth || img.width;
  const ph = img.naturalHeight || img.height;
  if (!pw || !ph) return 0;

  const scale = h / ph;
  const tileW = pw * scale;
  const startX = wrapOffset(offsetX, tileW);

  for (let tx = startX; tx < w + tileW; tx += tileW) {
    ctx.drawImage(img, tx, y, tileW, h);
  }
  return tileW;
}

const FALLBACK_COLORS = {
  grass: '#6B8E3D',
  topsoil: '#7A4E2E',
  deep: '#523218',
  rock: '#3A2412',
};

function drawFallbackBands(ctx, width, height, groundY) {
  const groundFrac = groundY / height;
  let prevEnd = groundFrac;
  LAYER_SPECS.forEach((spec) => {
    const y0 = prevEnd * height;
    const y1 = spec.endY * height;
    if (y1 > y0) {
      ctx.fillStyle = FALLBACK_COLORS[spec.id];
      ctx.fillRect(0, y0, width, y1 - y0);
    }
    prevEnd = spec.endY;
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} groundY — пиксели, линия земли
 * @param {Record<string, number>} offsets — пиксельные offsetX по id слоя
 */
export function drawSoilLayers(ctx, width, height, groundY, offsets = {}) {
  if (!cache.ready) {
    drawFallbackBands(ctx, width, height, groundY);
    return false;
  }

  const groundFrac = groundY / height;
  let prevEnd = groundFrac;

  cache.layers.forEach((layer) => {
    const y0 = prevEnd * height;
    const y1 = layer.endY * height;
    if (y1 <= y0 + 0.5) return;

    const bandH = y1 - y0;
    drawTiledBand(ctx, layer.image, y0, width, bandH, offsets[layer.id] ?? 0);
    prevEnd = layer.endY;
  });

  return true;
}

/**
 * Прокрутка в ту же сторону, что мир (препятствия влево):
 * phase растёт → рисуем с -phase.
 */
export function createSoilParallax() {
  const phase = Object.fromEntries(LAYER_SPECS.map((s) => [s.id, 0]));

  return {
    reset() {
      LAYER_SPECS.forEach((s) => {
        phase[s.id] = 0;
      });
    },

    /** @param {number} gameSpeedPx — scrollSpeed × width за кадр */
    update(gameSpeedPx) {
      if (!gameSpeedPx) return;
      LAYER_SPECS.forEach((spec) => {
        if (spec.scrollMul <= 0) return;
        phase[spec.id] += gameSpeedPx * spec.scrollMul;
      });
    },

    getOffsets() {
      const out = {};
      LAYER_SPECS.forEach((s) => {
        out[s.id] = s.scrollMul > 0 ? -phase[s.id] : 0;
      });
      return out;
    },
  };
}

export function getSoilLayerSpecs() {
  return LAYER_SPECS.map(({ id, endY, scrollMul }) => ({ id, endY, scrollMul }));
}
