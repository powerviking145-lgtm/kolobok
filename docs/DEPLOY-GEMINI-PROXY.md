# Деплой прокси Gemini (если на ПК npm/firebase не работают)

Ошибки `ECONNRESET` и «firebase не распознано» — **сеть с компьютера до npm**.  
Деплой делаем **в браузере** через Google Cloud Shell (там npm и firebase уже есть).

## Шаг 1 — залей код на GitHub

На своём ПК (если `git push` работает):

```powershell
cd D:\kolobok
git add .
git commit -m "Gemini proxy function"
git push
```

## Шаг 2 — Cloud Shell

1. Открой: https://console.cloud.google.com/cloudshell?project=kolobok-6032e  
2. Внизу откроется терминал Linux в браузере (это не твой PowerShell).

## Шаг 2.5 — тариф Blaze (обязательно)

Ошибка *«must be on the Blaze plan»* — это **биллинг Firebase**, не твои $25 в AI Studio.

1. Открой: https://console.firebase.google.com/project/kolobok-6032e/usage/details  
2. **Upgrade to Blaze** (привяжи карту).  
3. Для Колобка обычно укладываешься в **бесплатные лимиты** Cloud Functions (мало запросов в день). Платишь только если лимит превысишь.

Без Blaze нельзя: секреты, вызов Gemini с сервера, деплой `geminiFoodPhoto`.

## Шаг 3 — команды в Cloud Shell

Подставь свой репозиторий, если URL другой:

```bash
git clone https://github.com/powerviking145-lgtm/kolobok.git
cd kolobok
firebase use kolobok-6032e
cd firebase/functions
npm install
cd ../..
firebase functions:secrets:set GEMINI_API_KEY
```

Когда спросит значение — вставь ключ из [AI Studio](https://aistudio.google.com/apikey) (Enter).

```bash
firebase deploy --only functions:geminiFoodPhoto
```

Дождись `Deploy complete!`.

## Шаг 4 — игра

На ПК:

```powershell
cd D:\kolobok
npm run build
git push
```

В Telegram Mini App: **Сфоткать еду** — запрос пойдёт на EU-прокси, не напрямую в Gemini.

## Проверка

В браузере (или Cloud Shell):

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","mimeType":"image/jpeg","imageBase64":"invalid"}' \
  https://europe-west1-kolobok-6032e.cloudfunctions.net/geminiFoodPhoto
```

`400` или `502` — функция **жива** (главное не `404`).

## Если нет git clone

В Cloud Shell: **⋮** → Upload → выбери папку `D:\kolobok\firebase` (или весь проект), затем те же команды из `kolobok/`.
