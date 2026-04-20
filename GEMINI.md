---
Назва: Локальні правила проєкту Slovko
Опис: Архітектурні вказівки та конвенції для розробки проєкту
---

# Архітектура та стек технологій

- **Фреймворк:** SvelteKit 2 + Svelte 5 (виключно Runes).
- **Стейт-менеджмент:** Контролери `.svelte.ts` (класи або функції з рунами `$state`, `$derived`, `$effect`).
- **Потік даних (Data Flow):** Однонаправлений потік даних (Unidirectional Data Flow - UDF).
- **Стилізація:** Tailwind CSS або звичайний CSS (відповідно до наявних налаштувань).
- **Іконки:** `lucide-svelte` (уникати використання емодзі в UI).

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
