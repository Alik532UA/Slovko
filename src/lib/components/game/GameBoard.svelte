<script lang="ts">
    /**
     * GameBoard.svelte — Ігрове поле
     * Композиція: рендерить WordCard компоненти
     * Фіксовані позиції карток через slots
     */
    import { gameState } from "$lib/stores/gameState.svelte";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import WordCard from "./WordCard.svelte";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";

    // Реініціалізація при зміні рівня/теми/мов
    let lastLevel = $state(settingsStore.value.currentLevel);
    let lastTopic = $state(settingsStore.value.currentTopic);
    let lastSource = $state(settingsStore.value.sourceLanguage);
    let lastTarget = $state(settingsStore.value.targetLanguage);

    $effect(() => {
        const { currentLevel, currentTopic, sourceLanguage, targetLanguage } =
            settingsStore.value;

        if (
            currentLevel !== lastLevel ||
            currentTopic !== lastTopic ||
            sourceLanguage !== lastSource ||
            targetLanguage !== lastTarget
        ) {
            lastLevel = currentLevel;
            lastTopic = currentTopic;
            lastSource = sourceLanguage;
            lastTarget = targetLanguage;
            gameState.initGame();
        }
    });

    onMount(() => {
        gameState.initGame();
    });
</script>

{#if gameState.isLoading}
    <div class="loading">
        <div class="loading-spinner"></div>
    </div>
{:else}
    <div 
        class="game-board" 
        onclick={() => gameState.clearSelection()}
        onkeydown={(e) => e.key === 'Escape' && gameState.clearSelection()}
        role="button"
        tabindex="0"
        aria-label="Clear selection"
    >
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
                            />
                        </div>
                    {/key}
                </div>
            {/each}
        </div>
    </div>
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

    .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 4rem;
    }

    .loading-spinner {
        width: 48px;
        height: 48px;
        border: 4px solid var(--text-secondary);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
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
