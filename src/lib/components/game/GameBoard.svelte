<script lang="ts">
	/**
	 * GameBoard.svelte — Ігрове поле
	 * Композиція: рендерить WordCard компоненти
	 * Фіксовані позиції карток через slots
	 */
	import { gameState } from "$lib/stores/gameState.svelte";
	import { getGameController } from "$lib/context/gameContext";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { playlistStore } from "$lib/stores/playlistStore.svelte";
	import { logService } from "$lib/services/logService";
	import WordCard from "./WordCard.svelte";
	import CardContextMenu from "./CardContextMenu.svelte";
	import WordReportModal from "./WordReportModal.svelte";
	import { onMount, untrack } from "svelte";
	import { fade } from "svelte/transition";
	import { _ } from "svelte-i18n";
	import type { ActiveCard, WordPair } from "$lib/types";
	import type { GameData } from "$lib/services/gameDataService";

	let { gameData }: { gameData?: GameData } = $props();
	const gameController = getGameController();

	let contextMenu = $state<{
		cardId: string;
		wordKey: string;
		language: string;
		text: string;
	} | null>(null);

	let reportingData = $state<{
		wordKey: string;
		pair: WordPair;
	} | null>(null);

	/**
	 * Реактивна ініціалізація та перезавантаження гри.
	 * Це єдина точка входу, яка гарантує, що ігрове поле 
	 * завжди відповідає поточним налаштуванням стору.
	 */
	$effect(() => {
		const settings = settingsStore.value;
		
		// Створюємо залежність від усіх важливих параметрів
		const trigger = {
			mode: settings.mode,
			level: settings.currentLevel.join(','),
			topic: settings.currentTopic.join(','),
			playlist: settings.currentPlaylist,
			// Для плейлістів також важливо знати кількість слів (реактивність на додавання/видалення)
			wordsCount: settings.mode === 'playlists' && settings.currentPlaylist 
				? playlistStore.getPlaylist(settings.currentPlaylist)?.words.length 
				: 0
		};

		untrack(() => {
			logService.log("game", "Settings changed, re-initializing game board", trigger);
			gameController.initGame();
		});
	});

	function handleLongPress(e: PointerEvent, card: ActiveCard) {
		contextMenu = {
			cardId: card.id,
			wordKey: card.wordKey,
			language: card.language,
			text: card.text,
		};
	}

	function openReport(wordKey: string) {
		const pair = gameState.constructWordPair(wordKey, settingsStore.value);
		if (pair) {
			reportingData = { wordKey, pair };
		}
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
		data-testid="game-board"
	>
		{#if gameState.sourceCards.length === 0}
			<div class="empty-state-message" data-testid="game-empty-message">
				<p>
					{settingsStore.value.mode === "playlists"
						? settingsStore.value.currentPlaylist === "mistakes"
							? $_("playlists.emptyMistakes")
							: $_("playlists.empty")
						: $_("levels.underConstruction")}
				</p>
			</div>
		{:else}
			<div class="column source" aria-label="Source words" data-testid="column-source">
				{#each gameState.sourceCards as card, i (i)}
					<div class="card-slot">
						{#key card.id}
							<div
								class="card-wrapper"
								in:fade={{ duration: 400, delay: 200 }}
								out:fade={{ duration: 300 }}
								data-testid="card-slot-source-{i}"
							>
								<WordCard
									{card}
									showTranscription={settingsStore.value
										.showTranscriptionSource}
									enablePronunciation={settingsStore.value
										.enablePronunciationSource}
									isDimmed={contextMenu !== null && contextMenu.cardId !== card.id}
									onclick={() => gameController.selectCard(card)}
									onlongpress={(e) => handleLongPress(e, card)}
								/>
							</div>
						{/key}
					</div>
				{/each}
			</div>

			<div class="column target" aria-label="Target translations" data-testid="column-target">
				{#each gameState.targetCards as card, i (i)}
					<div class="card-slot">
						{#key card.id}
							<div
								class="card-wrapper"
								in:fade={{ duration: 400, delay: 200 }}
								out:fade={{ duration: 300 }}
								data-testid="card-slot-target-{i}"
							>
								<WordCard
									{card}
									showTranscription={settingsStore.value
										.showTranscriptionTarget}
									enablePronunciation={settingsStore.value
										.enablePronunciationTarget}
									isDimmed={contextMenu !== null && contextMenu.cardId !== card.id}
									onclick={() => gameController.selectCard(card)}
									onlongpress={(e) => handleLongPress(e, card)}
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
			wordKey={contextMenu.wordKey}
			language={contextMenu.language}
			text={contextMenu.text}
			onclose={() => (contextMenu = null)}
			onreport={() => openReport(contextMenu!.wordKey)}
		/>
	{/if}

	{#if reportingData}
		<WordReportModal
			wordKey={reportingData.wordKey}
			sourceTranslation={reportingData.pair.source}
			targetTranslation={reportingData.pair.target}
			onclose={() => (reportingData = null)}
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
		max-height: 1000px;
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
		display: grid;
		place-items: stretch;
	}

	.card-wrapper {
		grid-area: 1 / 1;
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
		background: var(--accent);
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
