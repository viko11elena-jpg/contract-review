# Contract Review — контекст для Claude

Chrome-расширение для AI-анализа рисков в юридических договорах (DOCX) + FastAPI-бекенд. Учебный проект (курс с куратором).

## Структура

- `contract-review/` — код расширения MV3 (popup `index.html`/`index.js`/`index.css`, `background.js`, `lib/mammoth.js` для парсинга DOCX)
- `contract-review-backend/` — FastAPI (`server.py`), эндпоинт `POST /api/analyze` → Anthropic `claude-haiku-4-5-20251001`
- `welcome/` — онбординг-страница, деплоится на Netlify из этой папки

## Текущее состояние

- ✅ Велком-страница задеплоена: **https://contract-review-ext.netlify.app/** (auto-deploy из `main`, Publish directory = `welcome`)
- ✅ `contract-review/background.js` открывает этот URL при установке расширения
- ⏳ Бекенд — **в локальном dev-режиме** (`localhost:8002`, `DAILY_LIMIT=1000`). Прод-деплой откладывается **до сигнала куратора курса**.

## Ключевые значения

| Что | Значение |
|---|---|
| Netlify URL велкома | `https://contract-review-ext.netlify.app/` |
| API_URL (dev) | `http://localhost:8002` |
| API_URL (прод) | ⏳ ещё не задеплоен |
| Модель Anthropic | `claude-haiku-4-5-20251001` |
| GitHub | `viko11elena-jpg/contract-review` |

## Правила общения с пользователем

- **Русский язык** (пользователь русскоговорящий).
- **Не пишет код сам** — давать точные пошаговые инструкции для ручных действий (клики в UI, без «разберись дальше»).
- **Визуальное подтверждение после каждой UI-правки** — показать результат (скриншот / открыть в браузере), дождаться явного «ок» → **только потом** коммит/деплой. См. `memory/feedback_visual_check_before_deploy.md`.
- **Не предлагать** деплой бекенда / публикацию в Chrome Web Store, пока пользователь сам не скажет, что куратор дал такую задачу.

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
