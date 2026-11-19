# Portals — сайт + API на Cloudflare

Проект настроен **под Workers** (Cloudflare сейчас создаёт по умолчанию именно их,
страницы `Pages` — устаревающий вариант). Скрипт Worker'а обрабатывает `/api/*`,
всё остальное отдаётся как статика из `public/`.

```
cloudflare/
├── wrangler.jsonc        # конфиг Worker'а: имя, точка входа, папка статики
├── src/
│   ├── index.js          # роутер: /api/* → функции, остальное → статика
│   └── api.js            # логика: проверка подписи Telegram + отправка лога
├── functions/            # (запасной путь) Pages Functions для проекта типа Pages
│   └── api/
│       ├── liquidity-request.js
│       └── health.js
├── public/               # сайт: index.html, видео, гифки  ← Build output / assets
└── README.md
```

## ⚠️ Важно: имя Worker'а

В `wrangler.jsonc` поле `"name"` **должно совпадать** с именем Worker'а
в дашборде Cloudflare, иначе сборка упадёт с ошибкой про имя.

Где посмотреть: **Workers & Pages** → клик по проекту → в URL будет
`.../workers/services/<имя>` (и адрес вида `<имя>.<поддомен>.workers.dev`).

Если имя отличается от `hdfhdfb` — поменяй `"name"` в `wrangler.jsonc`
(или переименуй Worker'а в дашборде: **Settings → датчик/карандаш у имени**),
закоммить и запуши.

## Как задеплоить

Репозиторий уже залит: `https://github.com/m44763294-cloud/hdfhdfb`

### Вариант A — твой Worker уже подключён к Git (скорее всего так и есть)

1. Дашборд → **Workers & Pages** → проект → **Settings** → **Builds**
2. Если репозиторий не подключён: **Connect** → GitHub → выбрать `hdfhdfb`
3. **Нажми Retry / Push новый коммит** (любой) — триггерит сборку
4. Если Cloudflare предлагает свой PR с конфигом («automatic configuration») —
   **закрой его без слияния**, у нас уже есть свой `wrangler.jsonc`

### Вариант B — проект создан «пустым» (только залил файлы)

1. **Workers & Pages** → **Create application** → вкладка **GitHub**
2. Репозиторий `hdfhdfb` → **Save and Deploy**
   (Build command пустой / `npx wrangler deploy`, root directory `/`)

### После деплоя: секреты

**Settings → Variables and Secrets → Add** (теперь эта кнопка будет доступна,
потому что у Worker'а появился скрипт `main`):

| Имя | Тип | Значение |
|---|---|---|
| `BOT_TOKEN` | **Secret** | токен бота от BotFather |
| `LOG_CHAT_ID` | **Secret** | ID чата, напр. `-1001234567890` |

После добавления секретов — **Deployments** → `⋯` → **Retry deployment**
(или пуш любого коммита). Секреты применяются только к новым сборкам.

### Проверка

`https://<имя>.<поддомен>.workers.dev/api/health`
→ `{"ok":true,"bot":"@имя_бота",...}`

`bot` должен совпадать с ботом, который открывает Mini App, иначе подпись
не сойдётся (401).

## Если выбрал вариант Pages (вместо Workers)

Проект типа **Pages** использует папку `functions/` (файловый роутинг).
Тогда в настройках сборки: Framework **None**, Build command пусто,
Build output directory **`public`**.
Если Pages ругнётся на `wrangler.jsonc` — удали этот файл, для Pages он не нужен.

## Что изменилось по сравнению со старым хостингом

- Фронт не падает с безликим «запрос не обработан»: под каждую ситуацию своё
  сообщение (404 → «API-часть не задеплоена», 503 → «не задан токен бота»,
  сеть → «Нет связи с сервером», не-JSON → «Сервер ответил не тем…»).
- Проверка ключа ослаблена: латиница, цифры, `.`, `-`, `_`, от 6 символов.
- Ключ пользователя отправляется в запросе и попадает в лог администратора.
- Бэкенд — Cloudflare Worker (вместо FastAPI): та же проверка подписи
  Telegram Mini App и отправка лога «НОВЫЙ ЛОГИЧ» через Bot API.

## После деплоя

- Ссылку Mini App в BotFather (`/setmenubutton` или меню бота) поменяй
  на новый адрес Worker'а.
- Свой домен: **Workers → проект → Settings → Domains & Routes → Add**.
