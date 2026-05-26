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
2. В `js/config.js` → `foodPhoto.gemini.apiKey: 'ТВОЙ_КЛЮЧ'`  
3. **Не пушить ключ в git.** Лучше `js/secrets.local.js` (в .gitignore):

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
