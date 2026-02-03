<script lang="ts">
    /**
     * GameBoard.svelte — Ігрове поле
     * Композиція: рендерить WordCard компоненти
     * Фіксовані позиції карток через slots
     */
    import { gameState } from "$lib/stores/gameState.svelte";
    import { gameController } from "$lib/services/gameController";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import WordCard from "./WordCard.svelte";
    import CardContextMenu from "./CardContextMenu.svelte";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { _ } from "svelte-i18n";
    import type { ActiveCard } from "$lib/types";
    import type { GameData } from "$lib/services/gameDataService";

    let { gameData }: { gameData?: GameData } = $props();

    // Реініціалізація при зміні рівня/теми/мов
    let lastLevel = $state(settingsStore.value.currentLevel);
    let lastTopic = $state(settingsStore.value.currentTopic);
    let lastSource = $state(settingsStore.value.sourceLanguage);
    let lastTarget = $state(settingsStore.value.targetLanguage);
    let lastMode = $state(settingsStore.value.mode);
    let lastPlaylist = $state(settingsStore.value.currentPlaylist);
    // Додаємо відстеження зміни gameData
    let lastGameData = gameData;

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

        // Якщо gameData змінився (нова навігація), ініціалізуємо з ним
        if (gameData !== lastGameData) {
            lastGameData = gameData;
            // Оновлюємо також трекери налаштувань, щоб не тригерити подвійний апдейт
            lastLevel = currentLevel;
            lastTopic = currentTopic;
            lastSource = sourceLanguage;
            lastTarget = targetLanguage;
            lastMode = mode;
            lastPlaylist = currentPlaylist;
            gameController.initGame(gameData);
            return;
        }

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
            lastTarget = targetLanguage;
            lastMode = mode;
            lastPlaylist = currentPlaylist;
            
            // Тут ми не передаємо gameData, бо налаштування змінились "всередині" компонента (наприклад, зміна мови),
            // і треба перезавантажити дані. АЛЕ: якщо зміна рівня/теми йде через URL, то спрацює блок вище (gameData !== lastGameData).
            // Якщо зміна мови (яка не в URL load function поки що? А, load function бере settingsStore),
            // то load function не перезапуститься, якщо URL не змінився.
            // Тому для зміни мови (яка не в URL) залишаємо старий механізм.
            gameController.initGame();
        }
    });

    onMount(() => {
        gameController.initGame(gameData);
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
{:else if gameState.error}
    <div class="error-overlay" in:fade>
        <div class="error-content">
            <span class="error-icon">⚠️</span>
            <h3>{$_("errors.loadFailed")}</h3>
            <p>{gameState.error}</p>
            <button class="retry-button" onclick={() => gameController.initGame()}>
                {$_("common.retry")}
            </button>
        </div>
    </div>
{:else}
    <div
        class="game-board"
        onclick={() => gameState.setSelectedCard(null)}
        onkeydown={(e) => e.key === "Escape" && gameState.setSelectedCard(null)}
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
                                    showTranscription={settingsStore.value.showTranscriptionSource}
                                    enablePronunciation={settingsStore.value.enablePronunciationSource}
                                    onclick={() => gameController.selectCard(card)}
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
                                    showTranscription={settingsStore.value.showTranscriptionSource}
                                    enablePronunciation={settingsStore.value.enablePronunciationSource}
                                    onclick={() => gameController.selectCard(card)}
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

    .error-overlay {
        position: absolute;
        inset: 0;
        background: var(--bg-primary);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10;
        padding: 2rem;
    }

    .error-content {
        text-align: center;
        max-width: 300px;
    }

    .error-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 1rem;
    }

    .error-content h3 {
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }

    .error-content p {
        color: var(--text-secondary);
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
    }

    .retry-button {
        background: var(--accent-primary);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .retry-button:hover {
        opacity: 0.9;
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
