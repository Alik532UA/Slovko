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
    const canGoPrev = $derived(
        settingsStore.value.mode === "levels" &&
            settingsStore.value.currentLevel !== "A1",
    );

    const canGoNext = $derived(
        settingsStore.value.mode === "levels" &&
            settingsStore.value.currentLevel !== "C2",
    );
</script>

<div class="bottom-bar">
    <button
        class="nav-btn"
        onclick={() => settingsStore.prevLevel()}
        disabled={!canGoPrev}
    >
        <ChevronLeft size={32} />
    </button>

    <button class="level-btn" onclick={() => (showModal = true)}>
        {currentLabel}
    </button>

    <button
        class="nav-btn"
        onclick={() => settingsStore.nextLevel()}
        disabled={!canGoNext}
    >
        <ChevronRight size={32} />
    </button>
</div>

{#if showModal}
    <LevelTopicModal onclose={() => (showModal = false)} />
{/if}

<style>
    .bottom-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--bg-secondary);
        border-top: 1px solid var(--border);
        z-index: 100;
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
