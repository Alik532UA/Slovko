# System Map (Slovko)

## Overview

This document maps the key architectural components of the Slovko project, specifically focusing on the Game Logic layer which has recently undergone refactoring to a Model-View-Controller (MVC) pattern.

## Core Architecture (Game)

### 1. View (UI Components)

Responsible for rendering the game state and capturing user input.

- **`src/lib/components/game/GameBoard.svelte`**: Main game container. Renders cards and layout.
- **`src/lib/components/game/WordCard.svelte`**: Individual card component.
- **`src/lib/components/game/GameStats.svelte`**: Stats bar (streak, accuracy) and control buttons (hint, learning mode).
- **`src/lib/components/game/CardContextMenu.svelte`**: Context menu for additional actions (listen, favorite).

**Interaction:** Components _read_ data from `gameState` (Store) and _call_ methods on `gameController` (Controller).

### 2. Model (State Store)

Responsible for holding the current state of the game in a pure, reactive way.

- **`src/lib/stores/gameState.svelte.ts`**:
  - **Type:** Svelte 5 Runes Store.
  - **Responsibility:** Holds `sourceCards`, `targetCards`, `stats`, `isLoading`, etc.
  - **Pattern:** Passive Data Store. It has setters/updaters but contains NO business logic (e.g., no "rules of the game").
  - **API:** `setCards`, `updateCardStatus`, `recordMatch`, `getAvailableWords`.

### 3. Controller (Game Logic)

Responsible for coordinating the game flow, enforcing rules, and managing side effects.

- **`src/lib/services/gameController.ts`**:
  - **Responsibility:**
    - `initGame()`: Orchestrates data loading and initial setup.
    - `selectCard()`: Handles user clicks, match/miss logic.
    - `handleMatch()` / `handleMiss()`: Updates score, plays audio.
    - `checkAndRefill()`: Monitoring board state to add new words.
    - `useHint()` / `runLearningLoop()`: Automation logic.
  - **Dependencies:** Uses `gameState` to update the view, `gameDataService` for data, `gameAudioHandler` for sound.

### 4. Services (Infrastructure)

Helper services that handle specific domain capabilities.

- **`src/lib/services/gameDataService.ts`**: Unified data loader (Translations, Transcriptions).
- **`src/lib/services/gameAudioHandler.ts`**: Manages audio playback for game events.
- **`src/lib/services/gameFeedbackHandler.ts`**: Manages progress saving (streaks, mistakes) and external store updates.
- **`src/lib/data/wordService.ts`**: Low-level JSON loader (to be merged with gameDataService).

## Data Flow

1.  **User Action:** User clicks a card in `GameBoard`.
2.  **Controller:** `gameController.selectCard(card)` is called.
3.  **Logic:** Controller checks `gameState` for `selectedCard`.
    - If first selection: Calls `gameState.setSelectedCard(card)`.
    - If second selection: Checks match.
4.  **Update:**
    - **Match:** Controller calls `gameState.updateCardStatus('correct')`, plays sound, updates stats.
    - **Miss:** Controller calls `gameState.updateCardStatus('wrong')`, resets selection after delay.
5.  **Reactive Update:** `gameState` updates runed values -> Svelte re-renders `GameBoard` automatically.

## Key Files & Locations

| Component      | Path                                       | Description                     |
| :------------- | :----------------------------------------- | :------------------------------ |
| **Store**      | `src/lib/stores/gameState.svelte.ts`       | The "Database" of the frontend. |
| **Controller** | `src/lib/services/gameController.ts`       | The "Brain" of the game.        |
| **View**       | `src/lib/components/game/GameBoard.svelte` | The "Face" of the game.         |

## Future Improvements

- Merge `wordService` and `gameDataService`.
- Add stricter state machine for `CardStatus`.
