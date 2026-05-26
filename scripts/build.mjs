/**
 * Сборка одного JS-файла для быстрой загрузки в Telegram.
 *
 * npm run build       — собрать бандлы + включить (manifest enabled: true)
 * npm run use:modules — выключить бандл, снова грузить js/*.js по отдельности
 * npm run build:dev   — бандлы без минификации (удобнее смотреть ошибки)
 */
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const bundleDir = path.join(root, 'js', 'bundle');
const args = process.argv.slice(2);
const modulesOnly = args.includes('--modules');
const devMode = args.includes('--dev');

function readBuildId() {
  const text = fs.readFileSync(path.join(root, 'js', 'build.js'), 'utf8');
  const m = text.match(/BUILD\s*=\s*['"](\d+)['"]/);
  if (!m) throw new Error('Не найден BUILD в js/build.js');
  return m[1];
}

function writeManifest(buildId, enabled) {
  const manifest = {
    enabled,
    build: buildId,
    tg: 'tg.bundle.js',
    browser: 'browser.bundle.js',
    builtAt: enabled ? new Date().toISOString() : undefined,
  };
  if (!manifest.builtAt) delete manifest.builtAt;
  fs.mkdirSync(bundleDir, { recursive: true });
  fs.writeFileSync(
    path.join(bundleDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
}

const buildId = readBuildId();

if (modulesOnly) {
  writeManifest(buildId, false);
  console.log('Колобок: режим модулей (бандл выключен). Файлы js/bundle/*.js не трогались.');
  process.exit(0);
}

fs.mkdirSync(bundleDir, { recursive: true });

const shared = {
  bundle: true,
  format: 'esm',
  target: ['es2020'],
  minify: !devMode,
  sourcemap: true,
  logLevel: 'info',
};

await esbuild.build({
  ...shared,
  entryPoints: [path.join(root, 'js', 'tg-bundle-entry.js')],
  outfile: path.join(bundleDir, 'tg.bundle.js'),
});

await esbuild.build({
  ...shared,
  entryPoints: [path.join(root, 'js', 'browser-bundle-entry.js')],
  outfile: path.join(bundleDir, 'browser.bundle.js'),
});

writeManifest(buildId, true);

console.log('');
console.log(`Колобок BUILD ${buildId}: бандл включён (manifest enabled: true)`);
console.log('Тест без бандла: npm run use:modules');
console.log('Деплой: git add . && git commit && git push');
