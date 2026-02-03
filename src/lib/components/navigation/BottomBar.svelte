<script lang="ts">
    /**
     * BottomBar — Нижня панель навігації
     * ← (рівень/тема) →
     */
    import { ChevronLeft, ChevronRight } from "lucide-svelte";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import { _ } from "svelte-i18n";
    import { ALL_LEVELS, ALL_TOPICS } from "$lib/types";
    import LevelTopicModal from "./LevelTopicModal.svelte";

    let showModal = $state(false);

    // Отримати поточний лейбл
    const currentLabel = $derived.by(() => {
        const { mode, currentLevel, currentTopic, currentPlaylist } =
            settingsStore.value;

        if (mode === "levels") {
            return $_(`levels.${currentLevel}`);
        } else if (mode === "topics") {
            return $_(`topics.${currentTopic}`);
        } else if (mode === "phrases") {
            // Phrases use levels too (A1, A2...)
            // Optional: add prefix like "Phrases: A1"? User didn't request it.
            return $_(`levels.${currentLevel}`);
        } else if (mode === "playlists") {
            return $_(`playlists.${currentPlaylist}`);
        }
        return "";
    });

    // Перевірка чи можна перемикати (залежить від режиму)
    const canGoPrev = $derived.by(() => {
        const { mode, currentLevel, currentTopic } = settingsStore.value;

        if (mode === "levels" || mode === "phrases") {
            return currentLevel !== ALL_LEVELS[0];
        } else if (mode === "topics") {
            return currentTopic !== ALL_TOPICS[0].id;
        }
        // Playlists: disable navigation for now
        return false;
    });

    const canGoNext = $derived.by(() => {
        const { mode, currentLevel, currentTopic } = settingsStore.value;

        if (mode === "levels" || mode === "phrases") {
            return currentLevel !== ALL_LEVELS[ALL_LEVELS.length - 1];
        } else if (mode === "topics") {
            return currentTopic !== ALL_TOPICS[ALL_TOPICS.length - 1].id;
        }
        return false;
    });

    function handleKeydown(event: KeyboardEvent) {
        // Prevent navigation if user is typing in an input
        const target = event.target as HTMLElement;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
            return;
        }

        if (event.key === "ArrowLeft" && canGoPrev) {
            settingsStore.prevLevel();
        } else if (event.key === "ArrowRight" && canGoNext) {
            settingsStore.nextLevel();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="bottom-bar">
    <button
        class="nav-btn"
        onclick={() => settingsStore.prevLevel()}
        disabled={!canGoPrev}
        data-testid="prev-level-btn"
    >
        <ChevronLeft size={32} />
    </button>

    <button
        class="level-btn"
        onclick={() => (showModal = true)}
        data-testid="level-topic-selector-btn"
    >
        {currentLabel}
    </button>

    <button
        class="nav-btn"
        onclick={() => settingsStore.nextLevel()}
        disabled={!canGoNext}
        data-testid="next-level-btn"
    >
        <ChevronRight size={32} />
    </button>
</div>

{#if showModal}
    <LevelTopicModal onclose={() => (showModal = false)} />
{/if}

<style>
    .bottom-bar {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
        background: transparent;
        width: 100%;
    }

    .nav-btn {
        background: transparent;
        border: none;
        padding: 0.5rem;
        cursor: pointer;
        color: var(--text-primary);
        transition: opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-tap-highlight-color: transparent; /* Remove mobile highlight */
    }

    /* Fix visual issue: keep color same on click/focus */
    .nav-btn:active {
        color: var(--text-primary);
        transform: scale(0.95);
    }

    .nav-btn:focus {
        outline: none; /* Remove default browser outline */
        color: var(--text-primary); /* Explicitly keep color active */
    }

    .nav-btn:focus-visible {
        color: var(--text-primary);
        outline: 2px solid var(--accent);
        border-radius: 8px;
    }

    .nav-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    /* Only apply hover effect on devices that support hover (mouse) to avoid sticky hover on mobile */
    @media (hover: hover) {
        .nav-btn:not(:disabled):hover {
            color: var(--accent);
        }
    }

    .level-btn {
        min-width: 100px;
        padding: 0.75rem 1.5rem;
        font-size: 1.25rem;
        font-weight: 600;
        background: var(--accent);
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s;
    }

    .level-btn:hover {
        transform: scale(1.05);
    }
</style>
