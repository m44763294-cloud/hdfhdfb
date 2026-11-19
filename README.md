# Portals — сайт на Cloudflare Pages

Папка готова к деплою на Cloudflare Pages:

```
cloudflare/
├── public/                 # статика (index.html, видео, гифки) — это Build output directory
│   ├── index.html
│   ├── new-intro.mp4
│   └── steps/
├── functions/              # бэкенд (бывший FastAPI main.py, переписан на Pages Functions)
│   └── api/
│       ├── liquidity-request.js   # POST /api/liquidity-request
│       └── health.js              # GET  /api/health
└── README.md
```

## Как задеплоить (5 минут, ничего ставить не надо)

1. **Создай пустой репозиторий на GitHub** — <https://github.com/new>,
   имя любое (например `portals-site`), Public или Private, **без** README/gitignore.

2. **Залей код.** Открой папку `cloudflare` в проводнике, в адресной строке напиши `cmd`
   и нажми Enter. Дальше по очереди (откроется окно авторизации GitHub — пройди его):

   ```bat
   git init
   git add .
   git commit -m "Portals site + Pages Functions API"
   git branch -M main
   git remote add origin https://github.com/ТВОЙ_ЛОГИН/ТВОЙ_РЕПО.git
   git push -u origin main
   ```

3. **Подключи к Cloudflare:**
   - <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
   - выбери репозиторий (потребуется разрешить доступ GitHub)
   - **Build configuration:**
     - Framework preset: **None**
     - Build command: *(оставь пустым)*
     - Build output directory: **`public`**
   - **Deploy**

4. **Добавь секреты** (без них будет ошибка «Сервер не настроен»):
   - проект → **Settings** → **Environment variables** → **Add variable**
   - `BOT_TOKEN` — токен бота от BotFather, тип **Encrypted**
   - `LOG_CHAT_ID` — ID чата для логов (например `-1001234567890`), тип **Encrypted**
   - сохрани и нажми **Retry deployment** (или redeploy)

5. **Проверь:** открой `https://<твоё-имя>.pages.dev/api/health` —
   должно быть `{"ok":true,"bot":"@имя_бота",...}`.

## После деплоя

- Ссылку Mini App в BotFather (`/setmenubutton` или меню бота) поменяй на новый
  адрес `https://<твоё-имя>.pages.dev`.
- Своё доменное имя можно привязать: проект → **Custom domains** → **Set up a custom domain**.

## Что изменилось по сравнению со старым хостингом

- `index.html` больше не падает с безликим «запрос не обработан»: теперь под каждую
  ситуацию своё сообщение (404 → «API-часть не задеплоена», 503 → «не задан токен бота»,
  сеть → «Нет связи с сервером», не-JSON ответ → «Сервер ответил не тем…»).
- Проверка ключа ослаблена (раньше `^portals_[A-Za-z0-9]{40,50}$` отбивал большинство
  реальных ключей → «Неверный ключ» прямо в поле).
- Бэкенд — Pages Functions вместо FastAPI: та же проверка подписи Telegram и отправка
  лога в чат через Bot API.
