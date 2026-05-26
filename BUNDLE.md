# Быстрая загрузка (бандл)

## Обычный тест (как раньше, много js-файлов)

Ничего не делай — в `js/bundle/manifest.json` стоит `"enabled": false`.

Или после сборки верни режим модулей:

```powershell
cd D:\kolobok
npm run use:modules
# или
powershell -File scripts\use-modules.ps1
```

## Быстрый релиз для Telegram (один файл)

Первый раз:

```powershell
cd D:\kolobok
npm install
```

Перед `git push` в прод:

```powershell
npm run build
# или
powershell -File scripts\build.ps1
```

Скрипт создаёт `js/bundle/tg.bundle.js`, `browser.bundle.js` и ставит в manifest `"enabled": true`.

Закоммить и запушить **вместе с бандлами**.

## Версия

Только `js/build.js`. При правках кода агент сам поднимает BUILD на +1. Перед пушем с бандлом: `npm run build` (номер уже актуальный).
