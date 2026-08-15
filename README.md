# Slovko

**Slovko** — багатомовний тренажер іноземних слів у стилі Wordle: словесна
гра-головоломка, побудована на Svelte 5.

🌐 [alik532ua.github.io/Slovko](https://alik532ua.github.io/Slovko/)

Сім мов інтерфейсу: `uk`, `en`, `pl`, `de`, `el`, `nl`, `crh`.

## Швидкий старт

```bash
npm ci
```

```bash
npm run dev
```

Порт dev-сервера — **5197** (конфігурація `slovko-dev` у `.claude/launch.json`
кореневої теки `GitHub`). Playwright піднімає власний сервер на **5273** зі
`--strictPort`: порти рознесені навмисно, бо на типовому `5173` сидить будь-який
сусідній проєкт, і тест мовчки перевіряв би чужий сайт.

## Команди

| Команда | Що робить |
|---|---|
| `npm run dev` | dev-сервер |
| `npm run check` | `svelte-check` — має бути 0 помилок |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test:unit` | юніт-тести (Vitest) |
| `npm run test:e2e` | Playwright |
| `npm run build` | збірка в `build/` |
| `npm run i18n:check` | паритет ключів локалізацій |
| `npm run bump` | підняття версії |

Крім них є набір службових скриптів для роботи зі словниками —
`check:duplicates`, `check:missing`, `analyze:polysemy`, `check:transcriptions`,
`sync:full` та інші. Дивись розділ `scripts` у `package.json`.

## Як усе влаштоване

- **Стек:** SvelteKit 2 + Svelte 5 (виключно руни), `@sveltejs/adapter-static`.
- **Стан:** класи-контролери в `src/lib/controllers/` (`SettingsStore`,
  `ProgressStore`, `PlaylistStore`).
- **Бекенд:** Firebase — Auth, Firestore і Realtime Database.
  Синхронізація прогресу — `src/lib/services/firebase/SyncService.svelte.ts`.
- **Сховище:** префікс `slovko_` обов'язковий для всіх ключів — origin спільний
  із сусідніми проєктами на `alik532ua.github.io`. Провайдер —
  `src/lib/services/storage/storageProvider.ts`.
- **i18n:** `svelte-i18n`.
- **Логування:** `logService`. `console.log` заборонений.

## Тести

Шість наборів юніт-тестів під `src/` і один e2e — `tests/e2e/invariants.spec.ts`,
рантайм-інваріант унікальності `data-testid` по дев'яти станах застосунку
(сторінка плюс п'ять модалок із табами). У CI ганяється саме він.

Результат треба **побачити**, а не припустити: твердження «тести проходять»
робиться після прогону, а не замість нього.

## Деплой і адреса

🌐 **https://alik532ua.github.io/Slovko/** — спільний домен, власного тут немає. Тому `paths.base` дорівнює `/Slovko` (навіть у dev), а всі ключі сховища мають префікс `slovko_`: origin ділиться з сусідніми проєктами.

Про переїзд на власний домен — [CUSTOM-DOMAIN-v8.md](../sveltekit-canon/selection_criteria/v8/ops/CUSTOM-DOMAIN-v8.md). Окремо варто знати, що деплой тут іде через `peaceiris/actions-gh-pages`, який **перезаписує гілку публікації**: за власного домену знадобився б `static/CNAME`, інакше прив'язка злетить після першого ж деплою.

GitHub Pages з гілки `main` через `.github/workflows/deploy.yml`.
Скрипт `npm run deploy` існує як ручний запасний шлях, але штатний — CI.

## Стандарти

Загальні правила — у пакеті [`sveltekit-canon/selection_criteria/v8`](../sveltekit-canon/selection_criteria/v8/README.md).
Специфіка цього проєкту — в [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md).
Інструкції для AI-асистентів — в [AGENTS.md](AGENTS.md).

## ☕ Підтримка проєкту

Ми розвиваємо Slovko як інструмент, що допомагає людям розширювати свій
словниковий запас. Якщо ви вважаєте проєкт корисним або хочете подякувати за
роботу, ви можете підтримати нас фінансово:

👉 **[Підтримати проєкт через Monobank (Банка)](https://send.monobank.ua/jar/7sCsydhJnR)**

Ваша підтримка допомагає швидше впроваджувати нові функції та покращувати
навчальні матеріали. Дякуємо!
