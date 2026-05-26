# Фото еды + Gemini

## Что должно быть

1. «Сфоткать еду» → камера / галерея  
2. Фото уходит в **Gemini Vision**  
3. Модель выбирает продукт из `config.homeFoods.list`  
4. Колобок комментирует (`comment` от модели + статы)  
5. Кулдаун кормления как раньше  

**Без ключа** — не рандом: ошибка «вставь ключ». Мок только если `foodPhoto.fallbackToMock: true`.

## Ключ API

1. https://aistudio.google.com/apikey  
2. **Оплата ($25)** — на **проекте в AI Studio**, не на Firebase. Ключ из `firebase.apiKey` или GCP проекта `kolobok-6032e` **не работает** для Gemini, пока не включишь [Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) там же. Проще: ключ только с [aistudio.google.com/apikey](https://aistudio.google.com/apikey).  
3. Проверка локально: `node scripts/gemini-check.mjs` (статус 200 = ок).  
4. Ключ **только** в `js/secrets.local.js` (в .gitignore). **Не в config.js** — иначе GitHub заблокирует ключ.  
5. Сборка под Telegram: `npm run build` (подставляет ключ в бандл из secrets.local.js).  
6. Пример `secrets.local.js`:

```javascript
window.__KOLOBOK_GEMINI_KEY = 'AIza...';
```

Подключить в `index.html` **до** boot-скрипта:

```html
<script src="js/secrets.local.js"></script>
```

## Прод (Telegram)

Ключ в клиенте виден — для прода позже **прокси** (Cloud Function / свой сервер). Сейчас — прототип с ключом в config.

## Файлы

| Файл | Роль |
|------|------|
| `js/foodPhotoGemini.js` | запрос к Gemini, сжатие фото |
| `js/foodPhotoFeed.js` | UI модалки |
| `js/config.js` → `foodPhoto` | настройки |

## Модели

Для **фото** нужна vision-модель (`generateContent`), не TTS из логов AI Studio.

При старте запроса список подтягивается с `GET .../v1beta/models`, отбрасываются `*tts*`, embedding и т.п. Порядок: `config.foodPhoto.gemini.models` + найденные (приоритет 2.5 Flash).

`useApiModelList: false` — только список из config.

## Отключить Gemini / вернуть чек

`foodPhoto.enabled: false` — снова флоу «Распаковать покупки».
