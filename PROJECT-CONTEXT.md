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

## Обрані optional-файли пакету

`I18N`, `AUTH-FORM`, `ANALYTICS`, `DEPENDENCIES`, `VERSIONING`,
`DEPLOY-ENVIRONMENTS`, `DOCUMENTATION` (`.private/docs/`).
Не застосовуються: `SCROLLBAR` (нативної смуги вистачає), `AI-PROVIDERS`.

## Що не перевіряється автоматично

| Правило | Чому перевірки немає | План |
|---|---|---|
| axe-аудит a11y | E2E є, але без `@axe-core/playwright` | додати як у teatralo4ka |
| Перевірка зібраного `build/` | скрипта немає | перенести `check-build.mjs` із as5 |
| CSS-змінні | інваріанта немає; **розвідка 2026-08-16 знайшла 8 неоголошених** — `--bg-surface`, `--error`, `--text-muted`, `--wrong-color`, `--correct-color`, `--arrow-left`, `--bg-tertiary`, `--primary` | перенести `css-variables.test.ts` із CV, спершу класифікувавши кожну з восьми: частина може бути крос-компонентною |
| Контраст тем | статично не перевіряється | перенести `contrast.test.ts` із teatralo4ka |
| `$props.id()` замість `Math.random()` | звернень нуль | окремий прохід |
| П'ять попереджень eslint | `warn`, `--max-warnings` не стоїть: 3 невживані імпорти в `GameState.svelte.ts`, 1 `any` у `PwaStore`, 1 `{@html}` у `SpeechErrorModal` | прибрати поштучно; для `{@html}` — або санітизація, або директива з поясненням |

## Перевірки, які тут є

| Гейт | Де | Що ловить |
|---|---|---|
| `npm run lint` | CI | eslint |
| `npm run check` | CI | `svelte-check`, 0 помилок |
| `npm run test:unit` | CI | 4 файли: testid, кнопка закриття, паритет 7 словників, плюралізація |
| `npx playwright test tests/e2e/invariants.spec.ts` | CI | інваріанти над зібраним сайтом |
| `npm audit --audit-level=high` | CI | вразливості прод-залежностей |

## Легасі-зони

| Зона | Де | Причина |
|---|---|---|
| `LEGACY_STORAGE_KEY` | `PlaylistStore.svelte.ts`, `SyncService.svelte.ts` | читання й прибирання старого ключа `slovko_playlists` без префікса — міграція, не борг |
