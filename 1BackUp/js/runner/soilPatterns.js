/**
 * SVG-паттерны среза почвы (data URL → Image для Canvas 2D).
 * Этап 4: offsets и scrollSpeed подключаются в drawSoilLayers.
 */

const LAYER_SPECS = [
  {
    id: 'grass',
    endY: 0.5,
    patternW: 200,
    patternH: 50,
    scrollMul: 1.0,
    buildSvg: () => `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50" viewBox="0 0 200 50">
  <rect width="200" height="50" fill="#6B8E3D"/>
  <path d="M12 48 Q14 28 18 48" fill="#4A6B2A"/>
  <path d="M28 48 Q32 22 36 48" fill="#4A6B2A"/>
  <path d="M48 48 Q50 32 54 48" fill="#5A7A35"/>
  <path d="M72 48 Q76 18 80 48" fill="#4A6B2A"/>
  <path d="M98 48 Q100 30 104 48" fill="#4A6B2A"/>
  <path d="M122 48 Q126 24 130 48" fill="#5A7A35"/>
  <path d="M152 48 Q155 26 159 48" fill="#4A6B2A"/>
  <path d="M178 48 Q181 34 185 48" fill="#4A6B2A"/>
  <circle cx="42" cy="38" r="3" fill="#FFF8DC"/>
  <circle cx="43" cy="37" r="1.2" fill="#FFD93D"/>
  <circle cx="168" cy="40" r="2.5" fill="#FFFFFF" opacity="0.9"/>
  <circle cx="169" cy="39" r="1" fill="#FFE873"/>
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
  ready: false,
  loading: null,
  layers: [],
};

export function preloadSoilPatterns() {
  if (cache.ready) return Promise.resolve(cache.layers);
  if (cache.loading) return cache.loading;

  cache.loading = Promise.all(
    LAYER_SPECS.map(async (spec) => {
      const img = await loadImage(svgToDataUrl(spec.buildSvg()));
      return { ...spec, image: img };
    })
  ).then((layers) => {
    cache.layers = layers;
    cache.ready = true;
    cache.loading = null;
    return layers;
  });

  return cache.loading;
}

function drawTiledBand(ctx, img, x, y, w, h, offsetX) {
  const pw = img.naturalWidth || img.width;
  const ph = img.naturalHeight || img.height;
  if (!pw || !ph) return;

  const scale = h / ph;
  const tileW = pw * scale;
  let startX = offsetX % tileW;
  if (startX > 0) startX -= tileW;

  for (let tx = startX; tx < w; tx += tileW) {
    ctx.drawImage(img, tx, y, tileW, h);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} groundY — пиксели, линия земли
 * @param {number} scrollX — нормализованный скролл (как в scene)
 * @param {Record<string, number>} [offsets] — пиксельные offsetX по id слоя
 */
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

export function drawSoilLayers(ctx, width, height, groundY, scrollX = 0, offsets = {}) {
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
    const tileW = layer.patternW * (bandH / layer.patternH);
    const baseOffset =
      offsets[layer.id] ?? -((scrollX * width * layer.scrollMul) % tileW);

    drawTiledBand(ctx, layer.image, 0, y0, width, bandH, baseOffset);
    prevEnd = layer.endY;
  });

  return true;
}

export function getSoilLayerSpecs() {
  return LAYER_SPECS.map(({ id, endY, scrollMul }) => ({ id, endY, scrollMul }));
}
