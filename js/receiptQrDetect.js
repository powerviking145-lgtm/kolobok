/** Поиск QR на фото чека: несколько кропов и масштабов */

function loadFileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve({ canvas, width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось загрузить фото'));
    };
    img.src = url;
  });
}

function cropCanvas(source, sx, sy, sw, sh, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(sw * scale));
  canvas.height = Math.max(1, Math.floor(sh * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = scale <= 1;
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function enhanceContrastCanvas(source) {
  const canvas = cropCanvas(source, 0, 0, source.width, source.height, 1);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const v = lum > 140 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}

async function detectOnSurface(detector, surface) {
  try {
    return await detector.detect(surface);
  } catch {
    return [];
  }
}

function buildSurfaces(canvas, width, height) {
  const surfaces = [canvas];
  const regions = [
    [0, 0, width, height],
    [0, height * 0.45, width, height * 0.55],
    [0, height * 0.55, width, height * 0.45],
    [0, height * 0.65, width * 0.5, height * 0.35],
    [0, height * 0.7, width * 0.42, height * 0.3],
    [width * 0.05, height * 0.72, width * 0.38, height * 0.28],
  ];

  regions.forEach(([x, y, w, h]) => {
    [1, 1.5, 2, 3].forEach((scale) => {
      surfaces.push(cropCanvas(canvas, x, y, w, h, scale));
    });
  });

  const bottomLeft = cropCanvas(canvas, 0, height * 0.65, width * 0.45, height * 0.35, 3);
  surfaces.push(enhanceContrastCanvas(bottomLeft));
  surfaces.push(enhanceContrastCanvas(cropCanvas(canvas, 0, height * 0.7, width * 0.4, height * 0.3, 4)));

  return surfaces;
}

export async function scanQrFromImageFile(file) {
  if (!('BarcodeDetector' in window)) {
    const err = new Error('no-barcode-detector');
    err.code = 'no-barcode-detector';
    throw err;
  }

  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  const { canvas, width, height } = await loadFileToCanvas(file);
  const surfaces = buildSurfaces(canvas, width, height);

  for (const surface of surfaces) {
    const codes = await detectOnSurface(detector, surface);
    if (codes?.length && codes[0].rawValue) {
      return codes[0].rawValue;
    }
  }

  const err = new Error('qr-not-found');
  err.code = 'qr-not-found';
  throw err;
}
