# Architecture Improvement Plan

**Status:** Draft
**Date:** 2026-02-03
**Version:** v00

## Частина 1: Комплексний Аудит

### 1. Reactivity & State (Реактивність) — 90/100
Codebase demonstrates strong adoption of Svelte 5 patterns.
*   **Derived over Sync:** ✅ `gameState.svelte.ts` heavily uses `$derived` and `$derived.by` for statistics (accuracy, wpm). No manual sync observed in the store logic.
*   **Effect Discipline:** ⚠️ `src/routes/+page.svelte` uses bi-directional `$effect` for URL <-> Store synchronization. While functional, this pattern can lead to race conditions or infinite loops if not carefully managed.
*   **Fine-grained Reactivity:** ✅ Deep reactivity (`$state` with arrays/objects) is used effectively in `gameState`.

### 2. Architecture & Data (Архітектура) — 60/100
The project follows a "Service-Store-Component" layered architecture, which is clean, but misses some SvelteKit-specific strengths.
*   **Server-First (SvelteKit):** ⚠️ Data loading happens entirely client-side via `gameDataService` called in `onMount` (or `initGame`). SvelteKit's `load` functions (`+page.ts` for SPA) are underutilized. This makes "Loading" states manual (`isLoading` flag) rather than framework-managed.
*   **URL as State:** ✅ Strong effort to keep `level`, `topic`, `mode` in the URL.
*   **Type Safety:** ❌ Manual validation in `gameDataService` (`validateDictionary`) checks for `typeof object/string`. This is brittle. No Zod/Valibot schemas found for validating JSON data imported from files.

### 3. Component Design (Дизайн компонентів) — 85/100
Components are well-structured and focused.
*   **Headless Logic:** ✅ `gameState.svelte.ts` contains almost all game logic. `GameBoard.svelte` is strictly presentation.
*   **Composition:** ✅ `GameBoard` iterates over `WordCard`. Slots/snippets usage is appropriate.
*   **Locality of Behavior:** ✅ Event handlers are co-located. Styles are scoped.

### 4. Stability & Performance (Стабільність) — 85/100
*   **Cleanup:** ✅ Store subscriptions (if any) in Svelte 5 are auto-managed.
*   **Error Boundaries:** ✅ `<svelte:boundary>` is explicitly used in `+page.svelte` for both Stats and Board. This is excellent practice.
*   **Keyed Blocks:** ✅ `{#key card.id}` used in `GameBoard.svelte` to trigger transitions correctly.

### 5. Security & A11y (Безпека та Доступність) — 95/100
*   **No HTML Injection:** ✅ No usages of `{@html` found.
*   **Interactive Elements:** ✅ `div.game-board` has `role="button"`, `tabindex="0"`, `aria-label`, and `onkeydown`. Accessibility is clearly considered.

---

## Частина 2: План Покращень (Backlog)

### High Priority (Critical for Scalability & Safety)

- [x] **Integrate Zod/Valibot for Data Validation** (Impact: **90**)
    - *Problem:* `gameDataService` uses manual `typeof` checks. Malformed JSON files could cause runtime errors downstream.
    - *Solution:* Define schemas for Translation/Transcription dictionaries. Parse data with `Schema.parse()`.

- [x] **Migrate Data Loading to SvelteKit `load` functions** (Impact: **80**)
    - *Problem:* Data loading is triggered manually in `gameController` / `initGame`. This reinvents the wheel (handling loading states, errors) that SvelteKit does natively.
    - *Solution:* Move `gameDataService.loadGameData` calls to `src/routes/+page.ts`. Pass data as `data` prop to components. Use `gameState.setData(data)` inside an effect or init logic.

### Medium Priority (Refactoring & Cleanliness)

- [x] **Refactor URL Sync Logic** (Impact: **60**)
    - *Problem:* Bi-directional `$effect` in `+page.svelte` is complex and prone to edge cases.
    - *Solution:* Make URL the Single Source of Truth.
        - `Store` should be derived from `page.url` (or initialized from it).
        - User actions should call `goto(...)`.
        - Store updates should essentially just be optimistic updates or result of navigation.

- [ ] **Strict Typed Contexts / Services** (Impact: **50**)
    - *Problem:* Services are imported as singletons (`import { gameController }`). This makes SSR (if ever needed) or testing harder (mocking singletons is hard).
    - *Solution:* Use `setContext` / `getContext` for services if dependency injection is needed, or keep singletons if the app is strictly SPA and simple. (Low priority as current singleton pattern works for this scale).

### Low Priority (Polish)

- [ ] **Optimize `gameDataService` loading strategy** (Impact: **30**)
    - *Problem:* It loads all levels for playlists to build a mega-dictionary. This might scale poorly.
    - *Solution:* Load only necessary files on demand or index data better.

- [x] **Standardize Error Handling** (Impact: **40**)
    - *Problem:* Some errors are logged to console, others set `error` state.
    - *Solution:* Create a unified `ErrorHandler` service that can report to UI (Toast/Banner) and Logger.
