---
title: План покращення архітектури v0.0
description: Результати аудиту та стратегія оптимізації проекту Slovko для кращої підтримки AI-агентами та масштабування.
type: plan
status: 45%
created: 2026-02-04
updated: 2026-02-04
---

# Частина 1: Комплексний Аудит

Оцінка проводиться за шкалою 0-100 балів.

### 1. Reactivity & State (Реактивність) — **95/100** (↑ +10)

- **Derived over Sync:** Виконано рефакторинг ключових компонентів. `AvatarEditor` позбувся ручної синхронізації.
- **Effect Discipline:** Зменшено кількість ефектів. Додано очищення (cleanup) в `Leaderboard`, `FriendsList` та `VoiceSelectionModal`.
- **Fine-grained Reactivity:** Стан у сторах залишається стабільним.

### 2. Architecture & Data (Архітектура) — **90/100** (↑ +20)

- **Server-First:** Хоча це SPA, логіка завантаження в `+page.ts` тепер є Single Source of Truth.
- **URL as State:** ПОВНІСТЮ реалізовано. Режим гри, рівні, теми та мови карток синхронізуються з URL.
- **Type Safety:** `Zod` тепер валідує налаштування при завантаженні з LocalStorage та Firebase (через `SyncService`).

### 3. Component Design (Дизайн компонентів) — **80/100**

- **Headless Logic:** Без змін, архітектура контролерів працює добре.
- **Composition:** В планах перехід на сніпети.

### 4. Stability & Performance (Стабільність) — **75/100** (↑ +15)

- **Cleanup:** Додано функції очищення до критичних ефектів та обробників подій.
- **Error Boundaries:** Частково впроваджено (`ErrorBoundary.svelte` у `+page.svelte`).
- **Keyed Blocks:** Використовуються правильно.

### 5. Security & A11y (Безпека та Доступність) — **90/100**

- **No HTML Injection:** `{@html}` не використовується.

---

# Частина 2: План Покращень (Backlog)

| ID  | Задача                                                                            | Пріоритет (0-100) | Статус |
| :-- | :-------------------------------------------------------------------------------- | :---------------: | :----: |
| 1.1 | **Аудит `$effect`**: Замінити синхронізуючі ефекти на `$derived`.                 |        90         |  [x]   |
| 1.2 | **Fine-grained State**: Перетворити масиви в `gameState` на проксі-об'єкти.       |        70         |  [ ]   |
| 2.1 | **URL Synchronization**: Перенести стан категорій/мов в URL Params.               |        95         |  [x]   |
| 2.2 | **Zod Integration**: Валідація схем для Settings (LocalStorage/Firebase).         |        90         |  [x]   |
| 3.1 | **Snippets Refactoring**: Замінити складні пропси в `WordCard.svelte` на сніпети. |        60         |  [ ]   |
| 4.1 | **Error Resilience**: Додати `<svelte:boundary>` навколо основних зон.            |        75         |  [ ]   |
| 4.2 | **Effect Cleanup**: Додати очищення до всіх ефектів (Таймери/Window Events).      |        95         |  [x]   |
| 5.1 | **A11y Audit**: Перевірити контрастність та Screen Readers.                       |        50         |  [ ]   |

## Виконано в v0.0-alpha:

- [x] Рефакторинг `AvatarEditor` (видалення `$effect`).
- [x] Очищення `onvoiceschanged` у `VoiceSelectionModal`.
- [x] Синхронізація `settingsStore` через `+page.ts` (URL SSoT).
- [x] Додано `source` та `target` мови в URL.
- [x] `AbortController` у списках для запобігання Race Conditions.
- [x] Сувора валідація `AppSettings` через Zod.

## Ціль на наступну ітерацію

- Мінімізувати використання `$effect` до 3-5 критичних випадків.
- Забезпечити 100% Type Safety для вхідних даних через Zod.
- Зробити гру "Bookmarkable" через URL State.
