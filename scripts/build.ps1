# Собрать бандл и включить быструю загрузку (нужен Node.js: nodejs.org)
Set-Location $PSScriptRoot\..

$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
  Write-Host "Ошибка: npm не найден. Установи Node.js LTS с https://nodejs.org и перезапусти терминал." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path node_modules\esbuild)) {
  Write-Host "Первый раз: npm install ..."
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

npm run build
exit $LASTEXITCODE
