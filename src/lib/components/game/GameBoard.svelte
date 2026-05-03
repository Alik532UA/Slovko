<script lang="ts">
	/**
	 * GameBoard.svelte — Ігрове поле
	 */
	import { gameState } from "$lib/stores/gameState.svelte";
	import { getGameController } from "$lib/context/gameContext";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { playlistStore } from "$lib/stores/playlistStore.svelte";
	import WordCard from "./WordCard.svelte";
	import CardContextMenu from "./CardContextMenu.svelte";
	import WordReportModal from "./WordReportModal.svelte";
	import { untrack } from "svelte";
	import { fade } from "svelte/transition";
	import { cubicOut, quadInOut } from "svelte/easing";
	import { _ } from "svelte-i18n";
	import type { ActiveCard, WordPair } from "$lib/types/index";
	import type { GameData } from "$lib/services/gameDataService";

	let { gameData }: { gameData?: GameData } = $props();
	const gameController = getGameController();

	let contextMenu = $state<{cardId: string; wordKey: string; language: string; text: string;} | null>(null);
	let reportingData = $state<{wordKey: string; pair: WordPair;} | null>(null);

	let lastDataKey = $state("");
	let lastPlaylistHash = $state("");

	$effect(() => {
		const mode = settingsStore.value.mode;
		const playlistIds = settingsStore.value.currentPlaylists;
		const data = gameData;
		const currentPlaylistWords = (mode === "playlists" && playlistIds.length > 0)
			? playlistIds.flatMap((id) => playlistStore.getPlaylist(id)?.words || []) : [];
		const playlistWordsHash = currentPlaylistWords.map((w) => (typeof w === "string" ? w : w.id)).join(",");

		untrack(() => {
			if (!data) return;
			const currentDataKey = JSON.stringify(data.settings);
			const isNewData = currentDataKey !== lastDataKey;
			const isPlaylistChanged = mode === "playlists" && playlistWordsHash !== lastPlaylistHash;

			if (isNewData) {
				lastDataKey = currentDataKey;
				lastPlaylistHash = playlistWordsHash;
				gameController.initGame(data);
			} else if (isPlaylistChanged) {
				lastPlaylistHash = playlistWordsHash;
				gameController.initGame();
			}
		});
	});

	function handleLongPress(e: PointerEvent, card: ActiveCard) {
		contextMenu = { cardId: card.id, wordKey: card.wordKey, language: card.language, text: card.text };
	}

	function openReport(wordKey: string) {
		const pair = gameState.constructWordPair(wordKey, settingsStore.value);
		if (pair) reportingData = { wordKey, pair };
	}

	// --- Drag & Drop Logic ---
	let dragState = $state<{active: boolean; startPoint: { x: number; y: number } | null; currentPoint: { x: number; y: number } | null; sourceCard: ActiveCard | null; hoveredCardId: string | null;}>({ active: false, startPoint: null, currentPoint: null, sourceCard: null, hoveredCardId: null });
	const dragStrokeWidth = $derived.by(() => {
		if (!dragState.startPoint || !dragState.currentPoint) return 10;
		return Math.max(4, 10 - (Math.hypot(dragState.currentPoint.x - dragState.startPoint.x, dragState.currentPoint.y - dragState.startPoint.y) / 500) * 6);
	});

	function handleDragStart(e: PointerEvent, card: ActiveCard) {
		if (card.status === "correct" || card.status === "wrong") return;
		dragState = { active: true, startPoint: { x: e.clientX, y: e.clientY }, currentPoint: { x: e.clientX, y: e.clientY }, sourceCard: card, hoveredCardId: null };
	}

	function handleDragMove(e: PointerEvent) {
		if (!dragState.active || !dragState.startPoint) return;
		dragState.currentPoint = { x: e.clientX, y: e.clientY };
		
		// Ховаємо лінію/оверлей на мить, щоб знайти елемент ПІД нею (іноді SVG drag-overlay перекриває картки)
		const svgOverlay = document.querySelector('.drag-overlay') as HTMLElement;
		if (svgOverlay) svgOverlay.style.pointerEvents = 'none';

		const elements = document.elementsFromPoint(e.clientX, e.clientY);
		let foundCardId: string | null = null;
		for (const el of elements) {
			const cardId = el.getAttribute("data-card-id");
			if (cardId) { foundCardId = cardId; break; }
			const closest = el.closest('[data-card-id]');
			if (closest) { foundCardId = closest.getAttribute("data-card-id"); break; }
		}
		
		if (foundCardId) {
			const targetCard = [...gameState.sourceCards, ...gameState.targetCards].find(c => c.id === foundCardId);
			dragState.hoveredCardId = (targetCard && targetCard.language !== dragState.sourceCard?.language && targetCard.status !== "correct") ? foundCardId : null;
		} else { dragState.hoveredCardId = null; }
		
		console.log("[DragMove] elements:", elements.length, "foundCardId:", foundCardId, "hovered:", dragState.hoveredCardId);
	}

	function handleDragEnd(_e?: PointerEvent) {
		console.log("[DragEnd] active:", dragState.active, "hovered:", dragState.hoveredCardId, "source:", dragState.sourceCard?.id);
		if (!dragState.active) return;
		
		if (dragState.hoveredCardId && dragState.sourceCard) {
			const targetCard = [...gameState.sourceCards, ...gameState.targetCards].find(c => c.id === dragState.hoveredCardId);
			if (targetCard) {
				console.log("[DragEnd] Select cards:", dragState.sourceCard.id, targetCard.id);
				// Якщо початкова картка ще не вибрана, ми маємо її вибрати
				if (gameState.selectedCard?.id !== dragState.sourceCard.id) {
					gameController.selectCard(dragState.sourceCard);
				}
				// Викликаємо одразу, щоб уникнути race condition з подією click на parent елементах
				gameController.selectCard(targetCard);
			}
		}
		dragState = { active: false, startPoint: null, currentPoint: null, sourceCard: null, hoveredCardId: null };
	}

	/**
	 * Спеціальна транзиція для направленого руху.
	 * Ефект скла (блюр) тепер успадковується від WordCard через прозорість.
	 * t: 0.0 -> 1.0 (in), 1.0 -> 0.0 (out)
	 * u: 1.0 -> 0.0 (in), 0.0 -> 1.0 (out)
	 */
	function glassTransition(node: HTMLElement, { duration = 800, delay = 0, x = 0, entrance = true }) {
		return {
			delay,
			duration,
			easing: entrance ? cubicOut : quadInOut,
			css: (t: number, u: number) => {
				const currentX = u * x;
				return `
					opacity: ${t};
					transform: translateX(${currentX}px) scale(${0.95 + t * 0.05}) translateZ(0);
					will-change: opacity, transform;
				`;
			}
		};
	}
</script>

<svelte:window onpointermove={handleDragMove} onpointerup={handleDragEnd} onpointercancel={handleDragEnd} />

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
			<button type="button" class="retry-button" onclick={() => gameController.initGame()}>{$_("common.retry")}</button>
		</div>
	</div>
{:else}
	{#if dragState.active && dragState.startPoint && dragState.currentPoint}
		<svg class="drag-overlay" aria-hidden="true">
			<line x1={dragState.startPoint.x} y1={dragState.startPoint.y} x2={dragState.currentPoint.x} y2={dragState.currentPoint.y} stroke="var(--selected-border)" stroke-width={dragStrokeWidth} stroke-linecap="round" opacity="0.6"/>
		</svg>
	{/if}

	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<section class="game-board" onclick={(e) => { if (e.target === e.currentTarget) gameState.setSelectedCard(null); }} onkeydown={(e) => { if (e.key === "Escape") gameState.setSelectedCard(null); }} role="main" tabindex="-1" aria-label="Game Board" data-testid="game-board">
		{#if gameState.sourceCards.length === 0}
			<div class="empty-state-message" role="status" data-testid="game-empty-message">
				<p>{settingsStore.value.mode === "playlists" ? settingsStore.value.currentPlaylists.includes("mistakes") ? $_("playlists.emptyMistakes") : $_("playlists.empty") : $_("levels.underConstruction")}</p>
			</div>
		{:else}
			<div class="column source safe-scale-container" role="list" aria-label="Source words" data-testid="column-source">
				{#each gameState.sourceCards as card, i (i)}
					<div class="card-slot" role="listitem">
						{#key card.id + lastDataKey}
							<div
								class="card-wrapper"
								in:glassTransition={{ duration: 3000, delay: i * 150, x: -50, entrance: true }}
								out:glassTransition={{ duration: 1000, delay: i * 100, x: -50, entrance: false }}
								data-testid="card-slot-source-{i}"
								data-card-id={card.id}
							>
								<WordCard
									testid="word-card-src"
									{card}
									showTranscription={settingsStore.value.showTranscriptionSource}
									enablePronunciation={settingsStore.value.enablePronunciationSource}
									isDimmed={contextMenu !== null && contextMenu.cardId !== card.id}
									onclick={() => gameController.selectCard(card)}
									onpointerdown={(e: PointerEvent) => handleDragStart(e, card)}
									onlongpress={(e: PointerEvent) => handleLongPress(e, card)}
								/>
								{#if dragState.hoveredCardId === card.id || dragState.sourceCard?.id === card.id}
									<div class="card-hover-highlight" aria-hidden="true"></div>
								{/if}
							</div>
						{/key}
					</div>
				{/each}
			</div>

			<div class="column target safe-scale-container" role="list" aria-label="Target translations" data-testid="column-target">
				{#each gameState.targetCards as card, i (i)}
					<div class="card-slot" role="listitem">
						{#key card.id + lastDataKey}
							<div
								class="card-wrapper"
								in:glassTransition={{ duration: 3000, delay: (i + 4) * 150, x: 50, entrance: true }}
								out:glassTransition={{ duration: 1000, delay: i * 100, x: 50, entrance: false }}
								data-testid="card-slot-target-{i}"
								data-card-id={card.id}
							>
								<WordCard
									testid="word-card-tgt"
									{card}
									showTranscription={settingsStore.value.showTranscriptionTarget}
									enablePronunciation={settingsStore.value.enablePronunciationTarget}
									isDimmed={contextMenu !== null && contextMenu.cardId !== card.id}
									onclick={() => gameController.selectCard(card)}
									onpointerdown={(e: PointerEvent) => handleDragStart(e, card)}
									onlongpress={(e: PointerEvent) => handleLongPress(e, card)}
								/>
								{#if dragState.hoveredCardId === card.id || dragState.sourceCard?.id === card.id}
									<div class="card-hover-highlight" aria-hidden="true"></div>
								{/if}
							</div>
						{/key}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	{#if contextMenu}
		<CardContextMenu wordKey={contextMenu.wordKey} language={contextMenu.language} text={contextMenu.text} onclose={() => (contextMenu = null)} onreport={() => openReport(contextMenu!.wordKey)}/>
	{/if}
	{#if reportingData}
		<WordReportModal wordKey={reportingData.wordKey} sourceTranslation={reportingData.pair.source} targetTranslation={reportingData.pair.target} onclose={() => (reportingData = null)}/>
	{/if}
{/if}

<style>
	.drag-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; }
	.card-hover-highlight { position: absolute; inset: 0; border: 2px solid var(--selected-border); border-radius: 12px; pointer-events: none; z-index: 10; box-shadow: 0 0 10px rgba(58, 143, 214, 0.3); animation: pulse-highlight 2s infinite ease-in-out; }
	@keyframes pulse-highlight { 0% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.004); } 100% { opacity: 0.5; transform: scale(1); } }
	.game-board { display: flex; gap: 1rem; width: 100%; max-width: 500px; height: 100%; max-height: 1000px; margin: 0 auto; padding: 1rem; position: relative; outline: none; -webkit-tap-highlight-color: transparent; user-select: none; }
	.column { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; height: 95%; }
	.card-slot { flex: 1; min-height: 0; display: grid; place-items: stretch; }
	.card-wrapper {
		grid-area: 1 / 1;
		width: 100%;
		height: 100%;
		display: flex;
		position: relative;
		transition: z-index 0.2s;
		opacity: 1;
		transform: scale(1) translateZ(0);
	}
	.card-wrapper:hover { z-index: 2; }
	.empty-state-message { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 1rem; line-height: 1.5; }
	.error-overlay { position: absolute; inset: 0; background: var(--bg-primary); display: flex; justify-content: center; align-items: center; z-index: 10; padding: 2rem; }
	.error-content { text-align: center; max-width: 300px; }
	.error-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
	.error-content h3 { margin-bottom: 0.5rem; color: var(--text-primary); }
	.error-content p { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem; }
	.retry-button { background: var(--accent); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
	.retry-button:hover { opacity: 0.9; }
	@media (max-width: 480px) { .game-board { gap: 0.5rem; padding: 0.5rem; } .column { gap: 0.5rem; } }
</style>
