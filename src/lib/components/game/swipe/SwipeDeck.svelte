<script lang="ts">
	import { gameState } from "$lib/stores/gameState.svelte";
	import { getGameController } from "$lib/context/gameContext";
	import { logService } from "$lib/services/logService.svelte";
	import { untrack } from "svelte";
	import { fade, fly } from "svelte/transition";
	import { _ } from "svelte-i18n";
	import { playlistStore } from "$lib/stores/playlistStore.svelte";
	import type { GameData } from "$lib/services/gameDataService";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { ArrowDown, ArrowUp } from "lucide-svelte";
	import SwipeCard from "./SwipeCard.svelte";

	let { gameData }: { gameData?: GameData } = $props();
	const gameController = getGameController();

	let lastDataKey = "";
	let currentCardIndex = $state(0);

	// Картки для свайпів. Генеруються зі sourceCards та targetCards.
	let swipeCards = $derived.by(() => {
		const sources = gameState.sourceCards;
		const targets = gameState.targetCards;

		if (!sources.length || !targets.length) return [];

		const pairs: {
			id: string;
			wordKey: string;
			front: string;
			back: string;
			transcription?: string;
			frontLanguage: string;
			backLanguage: string;
		}[] = [];
		const targetMap = new Map(targets.map((t) => [t.wordKey, t]));

		for (const src of sources) {
			const tgt = targetMap.get(src.wordKey);
			if (tgt) {
				pairs.push({
					id: src.wordKey,
					wordKey: src.wordKey,
					front: src.text,
					back: tgt.text,
					transcription: src.transcription,
					frontLanguage: src.language,
					backLanguage: tgt.language,
				});
			}
		}

		return pairs;
	});

	let currentCard = $derived(swipeCards[currentCardIndex]);

	// Попередня ініціалізація (як і в GameBoard)
	$effect(() => {
		const data = gameData;
		untrack(() => {
			if (!data) return;
			const currentDataKey = JSON.stringify(data.settings);
			if (currentDataKey !== lastDataKey) {
				lastDataKey = currentDataKey;
				logService.log("game", "Initializing SwipeDeck", {
					mode: data.settings.mode,
				});
				gameController.initGame(data);
				currentCardIndex = 0;
			}
		});
	});

	function handleSwipeUp() {
		if (!currentCard) return;
		logService.log("game", "Swipe UP for:", currentCard.wordKey);
		// В режимі Swipe правильні відповіді не записуємо в статистику
		nextCard();
	}

	function handleSwipeDown() {
		if (!currentCard) return;
		logService.log("game", "Swipe DOWN for:", currentCard.wordKey);
		// Додаємо слово до `data-testid="playlist-extra"`
		playlistStore.addWordToPlaylist("extra", currentCard.wordKey);
		nextCard();
	}

	function nextCard() {
		// Якщо дійшли до кінця, треба підвантажити нові слова
		if (currentCardIndex >= swipeCards.length - 1) {
			gameController.initGame(gameData);
			currentCardIndex = 0;
		} else {
			currentCardIndex++;
		}
	}
</script>

{#if gameState.isLoading}
	<div class="loading-overlay" in:fade aria-live="polite">
		<div class="loading-spinner" aria-label={$_("leaderboard.loading")}></div>
	</div>
{:else if gameState.error}
	<div class="error-overlay" in:fade aria-live="assertive">
		<div class="error-content">
			<span class="error-icon" aria-hidden="true">⚠️</span>
			<h3>{$_("errors.loadFailed")}</h3>
			<p>{gameState.error}</p>
			<button
				type="button"
				class="retry-button"
				onclick={() => gameController.initGame()}
			>
				{$_("common.retry")}
			</button>
		</div>
	</div>
{:else}
	<section
		class="swipe-board"
		role="main"
		tabindex="-1"
		aria-label="Swipe Board"
		data-testid="swipe-board"
	>
		{#if !currentCard}
			<div
				class="empty-state-message"
				role="status"
				data-testid="game-empty-message"
			>
				<p>
					{settingsStore.value.mode === "playlists"
						? settingsStore.value.currentPlaylists.includes("mistakes")
							? $_("playlists.emptyMistakes")
							: $_("playlists.empty")
						: $_("levels.underConstruction")}
				</p>
			</div>
		{:else}
			<div class="deck-container">
				{#key currentCard.id}
					<div
						class="card-container"
						data-testid="swipe-card-container"
						in:fly={{ y: 50, duration: 400, delay: 100 }}
						out:fade={{ duration: 200 }}
					>
						<SwipeCard item={currentCard} {handleSwipeUp} {handleSwipeDown} />
					</div>
				{/key}
			</div>

			<div class="swipe-actions" data-testid="swipe-actions-container">
				<button
					class="action-btn wrong"
					onclick={handleSwipeDown}
					title={$_("swipe.dontKnowTitle")}
					data-testid="swipe-btn-down"
				>
					<ArrowDown size={20} />
					<span>{$_("swipe.dontKnow")}</span>
				</button>
				<button
					class="action-btn correct"
					onclick={handleSwipeUp}
					title={$_("swipe.knowTitle")}
					data-testid="swipe-btn-up"
				>
					<span>{$_("swipe.know")}</span>
					<ArrowUp size={20} />
				</button>
			</div>
		{/if}
	</section>
{/if}

<style>
	.swipe-board {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 400px;
		height: 100%;
		margin: 0 auto;
		position: relative;
		outline: none;
		overflow: hidden;
	}

	.deck-container {
		width: 100%;
		flex: 1;
		display: grid;
		place-items: center;
	}

	.card-container {
		grid-area: 1 / 1;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		perspective: 1000px;
	}

	.swipe-actions {
		display: flex;
		gap: 1.5rem;
		width: 100%;
		padding: 1rem;
		justify-content: center;
	}

	.action-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: 12px;
		font-size: 1.1rem;
		font-weight: bold;
		border: none;
		cursor: pointer;
		color: white;
		transition:
			transform 0.2s,
			opacity 0.2s;
	}

	.action-btn:active {
		transform: scale(0.95);
	}

	.action-btn.wrong {
		background-color: var(--wrong-color, #e74c3c);
	}

	.action-btn.correct {
		background-color: var(--correct-color, #2ecc71);
	}

	.empty-state-message {
		text-align: center;
		padding: 2rem;
		color: var(--text-secondary);
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
	}

	.retry-button {
		background: var(--accent);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		margin-top: 1rem;
	}
</style>
