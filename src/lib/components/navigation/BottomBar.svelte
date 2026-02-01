<script lang="ts">
    /**
     * BottomBar — Нижня панель навігації
     * ← (рівень/тема) →
     */
    import { ChevronLeft, ChevronRight } from "lucide-svelte";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import { _ } from "svelte-i18n";
    import LevelTopicModal from "./LevelTopicModal.svelte";

    let showModal = $state(false);

    // Отримати поточний лейбл
    const currentLabel = $derived(
        settingsStore.value.mode === "levels"
            ? settingsStore.value.currentLevel
            : settingsStore.value.currentTopic || "",
    );

    // Перевірка чи можна перемикати рівні
    const canGoPrev = $derived(settingsStore.value.currentLevel !== "A1");
    const canGoNext = $derived(settingsStore.value.currentLevel !== "C2");
</script>

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
    .nav-btn:active,
    .nav-btn:focus,
    .nav-btn:visited {
        color: var(--text-primary);
        outline: none;
    }

    .nav-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .nav-btn:not(:disabled):hover {
        color: var(--accent);
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
