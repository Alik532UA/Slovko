# Контекст проєкту: Slovko

Персональний шар над пакетом v8 (`sveltekit-canon/selection_criteria/v8`).

## Базові параметри

| Параметр | Значення |
|---|---|
| Профіль | **static** |
| Adapter | `@sveltejs/adapter-static` |
| Хостинг | GitHub Pages, project page акаунта `Alik532UA` |
| Origin | `https://alik532ua.github.io` |
| base path | `/Slovko` (через `basePath` у `svelte.config.js`) |
| Порт dev-сервера | 5197 (`slovko-dev` у `.claude/launch.json` кореня GitHub) |
| Спільний origin з іншими застосунками? | **так** |
| PROJECT_PREFIX | `slovko_` |
| Dual deploy | так — `deploy.yml` і `deploy-dev.yml` |

## Реєстр префіксів на спільному origin

| Застосунок | Префікс |
|---|---|
| Slovko | `slovko_` |
| CV | `cv-svelte_` |
| DigitalWorkshop | `digitalworkshop_` |
| as5.odesa.ua | `as5.odesa.ua_` |
| MindStep | `mindstep_` |
| VetCrewGames | `vetcrewgames_` |

## Прийняті рішення

| Питання | Обрано | Причина | Дата |
|---|---|---|---|
| Бібліотека i18n | `svelte-i18n` | сім словників JSON: `uk`, `en`, `de`, `nl`, `pl`, `el`, `crh`; паритет тримає інваріант `translations.test.ts` (377 ключів × 7) | до 2026-08 |
| Бекенд | Firebase | вхід користувачів, синхронізація плейлистів | до 2026-08 |
| PWA | `vite-plugin-pwa` + власний `service-worker.js` | — | до 2026-08 |
| Середовище юніт-тестів | `node` | jsdom не стояв у залежностях, і файл без докблоку `// @vitest-environment node` не запускався зовсім | до 2026-08 |
| Контекст ігрового контролера | `Symbol`-ключ + аксесори `setGameController`/`getGameController` із `throw` | `src/lib/config/gameContext.ts`. **Це зразок для решти проєктів** — саме цей патерн ліг у SVELTE-CORE-v8 § 3.3 | до 2026-08 |
| Версіонування | `scripts/bump-version.js` | — | до 2026-08 |
| Права `contents: write` у деплої | обґрунтований виняток | dual deploy за патерном peaceiris: `deploy.yml` пише в корінь `gh-pages`, `deploy-dev.yml` — у підтеку `dev/`. OIDC-пайплайн (`deploy-pages@v4`) другого призначення на той самий сайт не вміє (CI-CD-AND-TOOLS-v8 § 1.1) | 2026-08-16 |
| Гейти в `deploy-dev.yml` | свідомо немає | це прев'ю, а не реліз: `npm ci → build → deploy`. Усі гейти стоять у `deploy.yml` перед `main`. Записано, бо мовчазна відсутність читається як покриття (CI-CD-AND-TOOLS-v8 § 1.6) | 2026-08-16 |
| Середовище компонентних тестів | **B** — jsdom/happy-dom, і поки що жодного компонентного тесту | над зібраним сайтом уже ходить Playwright, тож браузерний режим Vitest дублював би те, що перевіряється в справжньому браузері (CODE-QUALITY-v8 § 4.1). Заводити A — лише під компонент із власною геометрією | 2026-08-16 |

## Обрані optional-файли пакету

`I18N`, `AUTH-FORM`, `ANALYTICS`, `DEPENDENCIES`, `VERSIONING`,
`DEPLOY-ENVIRONMENTS`, `DOCUMENTATION` (`.private/docs/`), `DEBUGGING`
(`logService` + `LogCopyButton`, debug-режим у проді з 2026-08-16).
Не застосовуються: `SCROLLBAR` (нативної смуги вистачає), `AI-PROVIDERS`.

## Що не перевіряється автоматично

Числа в цьому розділі отримані командою в сесії 2026-08-16, а не з пам'яті
(AI-AGENT-PITFALLS-v8 § 5.5). Команда стоїть поруч — її можна повторити.

| Правило | Чому перевірки немає | План |
|---|---|---|
| Контраст тем | axe міряє контраст лише в тій темі, що активна під час прогону (типово `dark-gray`) | перенести `contrast.test.ts` із teatralo4ka: він рахує пари токенів статично, в усіх чотирьох темах |
| Клавіатура, пастка фокусу, зрозумілість підписів | axe знаходить приблизно третину проблем WCAG і бачить лише стан одразу після переходу | ручний прохід; описується в цьому файлі, а не мовчиться |
| Touch target кнопки збору логів | 32 px на desktop, 24 px на мобільному | канон просить 44 px на тач (MEDIUM). Кут зайнятий: збільшення накриє нижню панель. Свідоме відхилення |
| 12 попереджень eslint | `warn`, `--max-warnings` не стоїть.<br>`npm run lint 2>&1 \| grep -E "^✖"` | усі 12 — `svelte/no-navigation-without-resolve`, і це **не борг**: маршрут у застосунку один, усі виклики `goto()` передають або готовий `URL` із `page.url`, або рядок із самими параметрами. `resolve()` відображає ID маршруту в шлях — відображати нема чого. Правило лишається `warn`, бо стане потрібним із появою другого маршруту |

Закрито 2026-08-16: CSS-змінні (сім неоголошених виправлено, гейт
`css-variables.test.ts` стоїть); `$props.id()` — звернень нуль і не було, усі
`Math.random()` у проєкті стосуються перемішування слів і генерації id даних,
жоден не будує `id` для `aria-*`.

## Перевірки, які тут є

| Гейт | Де | Що ловить |
|---|---|---|
| `npm run lint` | CI | eslint, 0 помилок |
| `npm run check` | CI | `svelte-check`, 0 помилок |
| `npm run test:unit` | CI | 10 файлів, 72 перевірки: testid, кнопки закриття, паритет 7 словників, плюралізація, раннери, базовий набір eslint, пайплайн CI, позиція інлайн-скриптів під CSP, CSS-змінні, редакція PII у логері |
| `npx playwright test` (увесь каталог) | CI | 14 перевірок: дублікати `data-testid` у дев'яти станах, smoke (заголовок, опис, canonical, чиста консоль) і axe у трьох станах із базою, що лише спадає |
| `npm audit --audit-level=high` | CI | вразливості прод-залежностей |
| `npm run check:build` | CI | інваріанти над `build/`: `sveltekit-prerender` в адресах, зниклий canonical чи `<title>`, інлайн-скрипт без хеша в політиці, секрет у бандлі. Єдиний гейт, що бачить дефекти, невидимі в `src/` |
| `git diff --exit-code` після збірки | CI | збірка змінила відстежуваний файл |

## Легасі-зони

| Зона | Де | Причина |
|---|---|---|
| `LEGACY_STORAGE_KEY` | `PlaylistStore.svelte.ts`, `SyncService.svelte.ts` | читання й прибирання старого ключа `slovko_playlists` без префікса — міграція, не борг |

## Пастки середовища

Записані, бо вдруге виглядають так само незрозуміло, як уперше
(AI-AGENT-PITFALLS-v8 § 5.8).

| Пастка | Як виглядає |
|---|---|
| Хук перед комітом піднімає версію | у кожен коміт додаються `package.json`, `package-lock.json`, `static/app-version.json`. Це не сміття збірки, а `scripts/bump-version.js` — не намагайся прибрати їх зі стейджа |
| Живий dev-сервер на 5197 під час прогону E2E | конфлікту немає: Playwright бере власний 5273 зі `--strictPort` і `reuseExistingServer: false`. А от прев'ю з попередньої сесії на 5273 віддасть стару збірку — зупиняти перед прогоном |
