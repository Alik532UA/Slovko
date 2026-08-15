---
Назва: AGENTS.md — контекст проєкту Slovko
Опис: Архітектурні вказівки та конвенції для розробки проєкту
---

> **Спершу прочитай [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md).** Там персональний
> шар пакета v8: базові параметри, реєстр префіксів на спільному origin,
> прийняті рішення й перелік того, що тут **не** перевіряється автоматично.
> Цей файл — коротка витримка для щоденної роботи.
>
> Загальні стандарти живуть у `sveltekit-canon/selection_criteria/v8`.

# Архітектура та стек технологій

- **Фреймворк:** SvelteKit 2 + Svelte 5 (виключно Runes).
- **Стейт-менеджмент:** Контролери `.svelte.ts` (класи або функції з рунами `$state`, `$derived`, `$effect`).
- **Потік даних (Data Flow):** Однонаправлений потік даних (Unidirectional Data Flow - UDF).
- **Стилізація:** Tailwind CSS або звичайний CSS (відповідно до наявних налаштувань).
- **Іконки:** `lucide-svelte` (уникати використання емодзі в UI).

## Стратегія `data-testid` у production

**B — зберігати.** Плагіна, який вирізав би атрибут на етапі збірки, у проєкті
немає, отже де-факто вибрано B — і це записано, а не вдається за A
(TESTID-AND-NAMING-v8 § 1.11). Наслідки, з якими це рішення живе: локатори видно
у продакшн-версії (+0,5–2 КБ gzip і видима внутрішня структура), зате
smoke-тести можна писати проти живого сайту без окремої staging-збірки.

Якщо колись з'явиться плагін видалення — атрибут прибирається **лише** при
`mode === 'production'`, а для `staging`/`preview` лишається, і цей розділ
оновлюється разом із кодом.

# Проєктні конвенції

1. **Ізоляція браузерного сховища (localStorage / sessionStorage / Cache API):**
   - Усі ключі **ПОВИННІ** мати префікс `slovko_`. Це критично для безпеки даних, оскільки застосунок хоститься на спільному домені з іншими проєктами.
   - Заборонено використовувати `localStorage.clear()` / `sessionStorage.clear()`.

2. **Логування:**
   - `console.*` заборонений і **ловиться правилом** `no-console`. Виняток
     файловий: сам `logService`, фасад сховища (логер зберігає буфер через
     нього — зворотний імпорт замкнув би цикл) і `service-worker.js`.
   - Завжди використовуйте існуючий `logService` для виводу повідомлень чи помилок.
   - Редакцію персональних даних робить **логер**, а не місце виклику: `email`,
     `token`, `password` та решта ховаються всередині `addToRecent`, тож у звіт,
     який користувач надсилає розробнику, вони не потрапляють. Не додавайте
     власну санітизацію на місцях — з'явиться другий перелік полів, і вони
     розійдуться.
   - Не логуйте в обробниках, що спрацьовують на кожен рух вказівника:
     `addToRecent` серіалізує весь буфер у `sessionStorage` на кожен запис.

3. **Стейт та реактивність:**
   - Повністю відмовтесь від застарілих `writable`, `readable`, `derived` зі Svelte 4.
   - Усі реактивні стани повинні бути реалізовані через Svelte 5 Runes.

4. **Іменування файлів:**
   - Компоненти: `PascalCase.svelte` (наприклад, `WordCard.svelte`).
   - Контролери та сервіси: `camelCase.ts` або `PascalCase.svelte.ts` (залежно від вмісту).
   - Файли маршрутизації: стандартно `+page.svelte`, `+layout.svelte`, `+server.ts` тощо.

# 🚫 Anti-patterns (Що заборонено робити)

- **НЕ** використовуйте Svelte 4 API (stores, `export let`, життєві цикли `onMount` замість `$effect` без потреби).
- **НЕ** створюйте ключі в localStorage без префікса `slovko_`.
- **НЕ** використовуйте звичайні `console.log`, `console.warn` тощо в production коді (тільки `logService`).
- **НЕ** використовуйте системні емодзі для UI-елементів. Для цього є `lucide-svelte`.
- **НЕ** робіть `npm install` у CI-пайплайні, завжди `npm ci`.

# Приклади правильного коду (Svelte 5 Runes)

## 1. Стейт Контролер (`.svelte.ts`)
```typescript
export class CounterController {
  count = $state(0);
  
  increment() {
    this.count += 1;
  }
}
export const counter = new CounterController();
```

## 2. Svelte Компонент (`.svelte`)
```svelte
<script lang="ts">
  import { counter } from './counter.svelte.ts';
  import { Settings } from 'lucide-svelte';
  import { logService } from '$lib/services/logService';

  // Props в Svelte 5
  let { title }: { title: string } = $props();

  function handleClick() {
    counter.increment();
    logService.info('Counter clicked');
  }
</script>

<button onclick={handleClick}>
  <Settings size={16} />
  {title}: {counter.count}
</button>
```

# Локальні пастки

| Пастка | Що саме |
|---|---|
| `base` тут **завжди** `/Slovko` | `svelte.config.js` не робить винятку для dev (на відміну від MindStep). Тобто `npm run dev` віддає застосунок за `/Slovko/`, а не за коренем |
| Шляхи в e2e — **релятивні** | `baseURL` у `playwright.config.ts` містить `base`, тож `page.goto('')` і `page.goto('?modal=levels')`. Провідний слеш відкидає базовий шлях цілком, і тест піде на адресу, якої немає |
| Порт dev-сервера — **5197** | конфігурація `slovko-dev` у `.claude/launch.json` кореневої теки `GitHub`. Playwright бере власний **5273** зі `--strictPort` |
| e2e-крок у CI потребує змінних Firebase | `config.ts` викликає `getDatabase(app)` **на імпорті**, і без `databaseURL` це виняток. Коли блок `env:` стояв лише під `Build`, dev-сервер під Playwright віддавав `500` на всіх дев'яти станах, а падіння виглядало як зламаний `data-testid`. Не прибирай `env:` з кроку `E2E` |
| Фасад сховища є, і він обов'язковий | `src/lib/services/storage/storageProvider.ts`. Прямий `localStorage`/`sessionStorage` валить lint (`no-restricted-globals` + `no-restricted-properties`). Два винятки в коді — читання легасі-ключа без префікса, обидва з `eslint-disable` і причиною |
| Інлайн-скрипти в `app.html` — **нижче** `%sveltekit.head%` | вище мета-політика їх не покриває, і хеші зі `svelte.config.js` стають декоративними. Тримає інваріант `src/csp-inline-scripts.test.ts` |
| Хук перед комітом піднімає версію | у коміт самі додаються `package.json`, `package-lock.json` і `static/app-version.json` — це `scripts/bump-version.js`, а не сміття |

# Команди перевірки

```
npm run check       # svelte-check, має бути 0 помилок
npm run lint        # eslint: 0 помилок, 12 попереджень (усі — no-navigation-without-resolve, див. PROJECT-CONTEXT)
npm run test:unit   # Vitest: 10 файлів, 72 перевірки
npm run test:e2e    # Playwright: 14 перевірок (testid, smoke, axe), сервер на 5273
npm run i18n:check  # паритет ключів у семи мовах
npm run build       # збірка
npm run check:build # інваріанти над build/ — те, чого не видно в src/
```

**Результат треба побачити, а не припустити.** Твердження «правило виконано»
робиться після прогону, а не замість нього (AI-AGENT-PITFALLS-v8 § 5.1).
Крок CI зі статусом `-` (skipped) означає «невідомо», а не «гаразд» (§ 1.4).

**Підсумок читається там, де він написаний.** Останній рядок `npm run lint` —
це «скільки лагодить `--fix`», а не результат. Справжній підсумок рядком вище:
`npm run lint 2>&1 | grep -E "^✖"`. Так само `vitest`: успіх — це код виходу,
а не слово «passed» у виводі (§ 1.2, § 5.6).

**Нова перевірка вважається робочою лише після зворотного експерименту:**
зламати рівно те, від чого вона захищає, побачити її червоною, повернути
виправлення, побачити зеленою. Результат згадується в коміті (§ 1.1).
