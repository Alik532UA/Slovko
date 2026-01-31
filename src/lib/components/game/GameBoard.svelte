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
    <div class="game-board">
        <div class="column source">
            {#each gameState.sourceCards as card (card.id)}
                <div class="card-slot">
                    {#if card.isVisible}
                        <WordCard
                            {card}
                            onclick={() => gameState.selectCard(card)}
                        />
                    {/if}
                </div>
            {/each}
        </div>

        <div class="column target">
            {#each gameState.targetCards as card (card.id)}
                <div class="card-slot">
                    {#if card.isVisible}
                        <WordCard
                            {card}
                            onclick={() => gameState.selectCard(card)}
                        />
                    {/if}
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
        min-height: 0; /* Дозволяємо стискатися менше за контент */
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
