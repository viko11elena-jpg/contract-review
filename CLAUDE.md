# Contract Review — контекст для Claude

Chrome-расширение для AI-анализа рисков в юридических договорах (DOCX) + FastAPI-бекенд. Учебный проект (курс с куратором).

## Структура

- `contract-review/` — код расширения MV3 (popup `index.html`/`index.js`/`index.css`, `background.js`, `lib/mammoth.js` для парсинга DOCX)
- `contract-review-backend/` — FastAPI (`server.py`), эндпоинт `POST /api/analyze` → Anthropic `claude-haiku-4-5-20251001`
- `welcome/` — онбординг-страница, деплоится на Netlify из этой папки

## Текущее состояние

- ✅ Велком-страница задеплоена: **https://contract-review-ext.netlify.app/** (auto-deploy из `main`, Publish directory = `welcome`)
- ✅ `contract-review/background.js` открывает этот URL при установке расширения
- ✅ Бекенд задеплоен в прод: **https://api.maximpg2.beget.tech** (Beget VPS 45.139.29.58, Ubuntu 24.04, nginx + uvicorn + Let's Encrypt, systemd-сервис `contract-review-api.service`)
- ✅ Лимиты прод: `DAILY_LIMIT=2` (клиент), `@limiter.limit("20/day")` (сервер, по IP)
- ✅ VirusTotal: 0/60 детектов
- ⏳ Подача в Chrome Web Store — следующая задача (developer account, privacy policy, скриншоты, листинг).

## Ключевые значения

| Что | Значение |
|---|---|
| Netlify URL велкома | `https://contract-review-ext.netlify.app/` |
| API_URL (прод) | `https://api.maximpg2.beget.tech` |
| Anthropic модель | `claude-haiku-4-5-20251001` |
| GitHub | `viko11elena-jpg/contract-review` |
| VPS | Beget «Florid Corinnea», 45.139.29.58, Ubuntu 24.04 |
| Путь проекта на VPS | `/opt/contract-review/contract-review-backend` |
| Systemd сервис | `contract-review-api.service` (юзер `www-data`, порт 8000 на 127.0.0.1) |
| SSL | Let's Encrypt, авто-обновление через `certbot.timer` |

## Правила общения с пользователем

- **Русский язык** (пользователь русскоговорящий).
- **Не пишет код сам** — давать точные пошаговые инструкции для ручных действий (клики в UI, без «разберись дальше»).
- **Визуальное подтверждение после каждой UI-правки** — показать результат (скриншот / открыть в браузере), дождаться явного «ок» → **только потом** коммит/деплой. См. `memory/feedback_visual_check_before_deploy.md`.
- **Не предлагать** публикацию в Chrome Web Store, пока пользователь сам не скажет, что куратор дал такую задачу.

## Quirks

- **Dolphin Anty** блокирует `chrome.tabs.create` в `onInstalled` (ошибка `@dolphin: Onboarding tab should not be opened at startup`). Это не баг нашего кода — в обычном Chrome работает. Если пользователь жалуется «велком не открывается» — сначала проверить URL в браузере (`anty://...` = Dolphin).
- Велком-мокап Chrome нарисован в HTML/CSS + inline SVG, **не PNG конкурента** (риск модерации Chrome Web Store). См. `memory/welcome_design.md`.

## Восстановление контекста после падения чата

Если пользователь пишет «**контекст сбился, восстанови картину**» — читаем в таком порядке:
1. Этот файл (уже в контексте)
2. `~/.claude/projects/.../memory/MEMORY.md` и связанные файлы
3. `git log -10 --oneline` + `git status` — что сделано, что в работе
4. Последний файл в `~/.claude/plans/*.md` — если есть активный план

Потом докладываем пользователю: «мы работаем над X, последний коммит Y, в процессе Z».
