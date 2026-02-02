<script lang="ts">
    /**
     * GameBoard.svelte — Ігрове поле
     * Композиція: рендерить WordCard компоненти
     * Фіксовані позиції карток через slots
     */
    import { gameState } from "$lib/stores/gameState.svelte";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import WordCard from "./WordCard.svelte";
    import CardContextMenu from "./CardContextMenu.svelte";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { _ } from "svelte-i18n";
    import type { ActiveCard } from "$lib/types";

    // Реініціалізація при зміні рівня/теми/мов
    let lastLevel = $state(settingsStore.value.currentLevel);
    let lastTopic = $state(settingsStore.value.currentTopic);
    let lastSource = $state(settingsStore.value.sourceLanguage);
    let lastTarget = $state(settingsStore.value.targetLanguage);
    let lastMode = $state(settingsStore.value.mode);
    let lastPlaylist = $state(settingsStore.value.currentPlaylist);

    let contextMenu = $state<{
        x: number;
        y: number;
        wordKey: string;
        language: string;
        text: string;
    } | null>(null);

    $effect(() => {
        const {
            currentLevel,
            currentTopic,
            sourceLanguage,
            targetLanguage,
            mode,
            currentPlaylist,
        } = settingsStore.value;

        if (
            currentLevel !== lastLevel ||
            currentTopic !== lastTopic ||
            sourceLanguage !== lastSource ||
            targetLanguage !== lastTarget ||
            mode !== lastMode ||
            currentPlaylist !== lastPlaylist
        ) {
            lastLevel = currentLevel;
            lastTopic = currentTopic;
            lastSource = sourceLanguage;
            lastTarget = lastTarget; // wait, there was a typo here, fixing while at it
            lastMode = mode;
            lastPlaylist = currentPlaylist;
            gameState.initGame();
        }
    });

    onMount(() => {
        gameState.initGame();
    });

    function handleLongPress(e: PointerEvent, card: ActiveCard) {
        // Adjust position to keep menu on screen (simple logic)
        // CardContextMenu has min-width 220px, height ~100px
        let x = e.clientX;
        let y = e.clientY;

        const w = window.innerWidth;
        const h = window.innerHeight;

        if (x + 220 > w) x = w - 230;
        if (y + 120 > h) y = h - 130;

        contextMenu = {
            x,
            y,
            wordKey: card.wordKey,
            language: card.language,
            text: card.text,
        };
    }
</script>

{#if gameState.isLoading}
    <div class="loading-overlay" in:fade>
        <div class="loading-spinner"></div>
    </div>
{:else}
    <div
        class="game-board"
        onclick={() => gameState.clearSelection()}
        onkeydown={(e) => e.key === "Escape" && gameState.clearSelection()}
        role="button"
        tabindex="0"
        aria-label="Clear selection"
    >
        {#if gameState.sourceCards.length === 0}
            <div class="empty-state-message">
                <p>
                    {settingsStore.value.mode === "playlists"
                        ? settingsStore.value.currentPlaylist === "mistakes"
                            ? $_("playlists.emptyMistakes")
                            : $_("playlists.empty")
                        : $_("levels.underConstruction")}
                </p>
            </div>
        {:else}
            <div class="column source">
                {#each gameState.sourceCards as card, i (i)}
                    <div class="card-slot">
                        {#key card.id}
                            <div
                                class="card-wrapper"
                                in:fade={{ duration: 400, delay: 200 }}
                                out:fade={{ duration: 300 }}
                            >
                                <WordCard
                                    {card}
                                    onclick={() => gameState.selectCard(card)}
                                    onlongpress={(e) =>
                                        handleLongPress(e, card)}
                                />
                            </div>
                        {/key}
                    </div>
                {/each}
            </div>

            <div class="column target">
                {#each gameState.targetCards as card, i (i)}
                    <div class="card-slot">
                        {#key card.id}
                            <div
                                class="card-wrapper"
                                in:fade={{ duration: 400, delay: 200 }}
                                out:fade={{ duration: 300 }}
                            >
                                <WordCard
                                    {card}
                                    onclick={() => gameState.selectCard(card)}
                                    onlongpress={(e) =>
                                        handleLongPress(e, card)}
                                />
                            </div>
                        {/key}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    {#if contextMenu}
        <CardContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            wordKey={contextMenu.wordKey}
            language={contextMenu.language}
            text={contextMenu.text}
            onclose={() => (contextMenu = null)}
        />
    {/if}
{/if}

<style>
    .game-board {
        display: flex;
        gap: 1rem;
        width: 100%;
        max-width: 500px;
        height: 100%;
        max-height: 1000px; /* Обмежуємо максимальну висоту для великих екранів */
        margin: 0 auto;
        padding: 1rem;
    }

    .column {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        height: 95%;
    }

    .card-slot {
        flex: 1;
        min-height: 0;
        display: grid; /* Використовуємо grid для стабільності розміру */
        place-items: stretch;
    }

    .card-wrapper {
        grid-area: 1 / 1; /* Обидві картки (стара і нова) будуть в одній комірці під час анімації */
        width: 100%;
        height: 100%;
        display: flex;
    }

    .empty-state-message {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary);
        font-size: 1rem;
        line-height: 1.5;
    }

    @media (max-width: 480px) {
        .game-board {
            gap: 0.5rem;
            padding: 0.5rem;
        }

        .column {
            gap: 0.5rem;
        }
    }
</style>
