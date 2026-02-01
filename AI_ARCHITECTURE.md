# AI Agent Guide & Architecture

## Project Overview
This is a language learning application ("Slovko") built with **SvelteKit** and **Svelte 5 (Runes)**. It focuses on ad-free word matching games.
The app supports multiple interface languages (UI) and multiple target languages for learning.

## Tech Stack & Conventions
- **Framework:** SvelteKit (SSR disabled for static adapter, or hybrid).
- **State Management:** Svelte 5 Runes (`$state`, `$derived`, `$effect`).
    - *Pattern:* Global stores are implemented as functions returning objects with getters/setters (e.g., `createSettingsStore`).
- **Styling:** CSS Variables for theming (Dark/Light/Orange/Green). Scoped styles in `.svelte` files.
- **Data Source:** Static JSON files (No database).
- **Routing:** Standard SvelteKit file-system routing.

## Data Architecture (Crucial)
The data is decentralized to allow lazy loading and code splitting.

### 1. Words (`src/lib/data/words/`)
- **Structure:** JSON files defining lists of word keys.
- **Levels:** `levels/A1.json`, `levels/B2.json`, etc.
- **Topics:** `topics/food.json`, `topics/travel.json`, etc.
- **Format:** `{ "id": "A1", "words": ["apple", "run", ...] }`

### 2. Translations (`src/lib/data/translations/`)
- **Structure:** Nested by Language -> Category -> File.
- **Path:** `{lang}/{category}/{id}.json` (e.g., `uk/levels/A1.json`, `en/topics/food.json`).
- **Format:** Key-Value pairs `{ "apple": "яблуко" }`.
- **Constraint:** All translation files must have matching keys for the same level/topic.

### 3. Transcriptions (`src/lib/data/transcriptions/`)
- **Structure:** Similar to translations, but language-agnostic (IPA is universal for English learning).
- **Path:** `levels/{id}.json` or `topics/{id}.json`.

### 4. UI Translations (`src/lib/i18n/translations/`)
- **Purpose:** Interface text (menus, buttons).
- **Files:** `uk.json`, `en.json`, etc.

## Key Directories
- `src/lib/components`: UI Components.
    - `game/`: Game logic components (Card, Board).
    - `navigation/`: BottomBar, TopBar, Modals.
    - `settings/`: Theme, Language settings.
- `src/lib/stores`: State management (`gameState`, `settingsStore`, `progressStore`).
- `scripts/`: Node.js maintenance scripts. **ALWAYS check `scripts/SCRIPTS_CATALOG.md` before writing new scripts.**

## Common Workflows for AI
1.  **Adding Words:**
    - Do NOT just edit JSONs manually if batch processing.
    - Use `scripts/generation/` or `scripts/maintenance/` tools.
    - Ensure translations are added for ALL supported languages (`uk`, `en`, `de`, `nl`, `crh`).

2.  **Fixing Bugs:**
    - If UI related: Check `src/app.css` for variables or Component styles.
    - If Logic related: Check `src/lib/stores`.
    - If Data related (missing words): Use analysis scripts in `scripts/analysis`.

3.  **Theming:**
    - Themes are defined in `src/app.css`.
    - Logic is in `settingsStore.svelte.ts` and `src/app.html` (inline script for avoiding FOUC).

## Strict Rules
- **Do NOT revert code** unless explicitly asked.
- **Do NOT break Svelte 5 syntax** (avoid legacy `export let`, use `$props()`).
- **Commit Messages:** Use English, Conventional Commits (e.g., `fix(ui): ...`, `feat(data): ...`).
- **Verify:** Always run build/check commands after major refactoring.
