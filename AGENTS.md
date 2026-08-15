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
   - Категорично заборонено залишати у фінальному коді `console.log()`.
   - Завжди використовуйте існуючий `logService` для виводу повідомлень чи помилок.

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
| `base` тут **завжди** `/Slovko` | `svelte.config.js` не робить винятку для dev (на відміну від MindStep). Тобто `npm run dev` віддає застосунок за `/Slovko/`, а не за коренем; Vite перенаправляє `/` туди сам |
| Порт dev-сервера — **5197** | конфігурація `slovko-dev` у `.claude/launch.json` кореневої теки `GitHub`. Playwright бере власний **5273** зі `--strictPort` |
| e2e-крок у CI потребує змінних Firebase | `config.ts` викликає `getDatabase(app)` **на імпорті**, і без `databaseURL` це виняток. Коли блок `env:` стояв лише під `Build`, dev-сервер під Playwright віддавав `500` на всіх дев'яти станах, а падіння виглядало як зламаний `data-testid`. Не прибирай `env:` з кроку `Unique data-testid invariant` |
| Фасаду сховища немає | попри вимогу префікса `slovko_`, `localStorage` викликається напряму в п'яти файлах. Провайдер — `src/lib/services/storage/storageProvider.ts`, але він нічого не гарантує; префікс доводиться тримати вручну |
| У CI йде лише один e2e-файл | `tests/e2e/invariants.spec.ts`. Інших наборів Playwright у проєкті немає — не вважай e2e широким покриттям |

# Команди перевірки

```
npm run check       # svelte-check, має бути 0 помилок
npm run lint        # eslint
npm run test:unit   # Vitest, шість наборів під src/
npm run test:e2e    # Playwright
npm run i18n:check  # паритет ключів у семи мовах
npm run build       # збірка
```

**Результат треба побачити, а не припустити.** Твердження «правило виконано»
робиться після прогону, а не замість нього (AI-AGENT-PITFALLS-v8 § 5.1).
Крок CI зі статусом `-` (skipped) означає «невідомо», а не «гаразд» (§ 1.4).
