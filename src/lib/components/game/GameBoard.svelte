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

	// Службові змінні для відстеження попереднього стану (не реактивні)
	let lastDataKey = "";
	let lastPlaylistHash = "";

	/**
	 * Реактивна ініціалізація та перезавантаження гри.
	 * Використовує точкові залежності (fine-grained reactivity).
	 */
	$effect(() => {
		// Підписуємось лише на необхідні сигнали
		const mode = settingsStore.value.mode;
		const playlistId = settingsStore.value.currentPlaylist;
		const data = gameData;
		
		// Отримуємо актуальний список слів для плейлиста
		const currentPlaylistWords = (mode === 'playlists' && playlistId)
			? (playlistStore.getPlaylist(playlistId)?.words || [])
			: [];
		
		// Використовуємо хеш для перевірки змін
		// (для об'єктів CustomWord використовуємо JSON, для рядків - просто join)
		const playlistWordsHash = currentPlaylistWords.map(w => typeof w === 'string' ? w : w.id).join(',');

		untrack(() => {
			if (!data) return;

			// Створюємо унікальний ключ конфігурації на основі даних
			const currentDataKey = JSON.stringify(data.settings);
			
			const isNewData = currentDataKey !== lastDataKey;
			const isPlaylistChanged = mode === 'playlists' && playlistWordsHash !== lastPlaylistHash;

			if (isNewData) {
				// Сценарій 1: Прийшли абсолютно нові дані (навігація, зміна URL)
				lastDataKey = currentDataKey;
				lastPlaylistHash = playlistWordsHash;

				logService.log("game", "Initializing game board (New Data)", { 
					mode: data.settings.mode, 
					playlistId: data.settings.currentPlaylist 
				});
				gameController.initGame(data);
			} else if (isPlaylistChanged) {
				// Сценарій 2: Дані ті самі, але локально змінився плейлист
				
				if (lastPlaylistHash) {
					const oldList = lastPlaylistHash.split(',').filter(Boolean);
					const newList = playlistWordsHash.split(',').filter(Boolean);
					const removed = oldList.filter(x => !newList.includes(x));
					const added = newList.filter(x => !oldList.includes(x));
					
					if (removed.length) logService.log("game", "PLAYLIST UPDATE: Removing words:", removed);
					if (added.length) logService.log("game", "PLAYLIST UPDATE: Adding words:", added);
				}

				lastPlaylistHash = playlistWordsHash;

				logService.log("game", "Refreshing game board due to playlist change");
				gameController.initGame();
			}
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

	// --- Drag & Drop Logic ---
	let dragState = $state<{
		active: boolean;
		startPoint: { x: number; y: number } | null;
		currentPoint: { x: number; y: number } | null;
		sourceCard: ActiveCard | null;
		hoveredCardId: string | null;
	}>({
		active: false,
		startPoint: null,
		currentPoint: null,
		sourceCard: null,
		hoveredCardId: null,
	});

	function handleDragStart(e: PointerEvent, card: ActiveCard) {
		// Ігноруємо якщо вже йде процес або картка в "фінальному" стані
		if (card.status === "correct" || card.status === "wrong") return;

		dragState = {
			active: true,
			startPoint: { x: e.clientX, y: e.clientY },
			currentPoint: { x: e.clientX, y: e.clientY },
			sourceCard: card,
			hoveredCardId: null,
		};
	}

	function handleDragMove(e: PointerEvent) {
		if (!dragState.active || !dragState.startPoint) return;

		dragState.currentPoint = { x: e.clientX, y: e.clientY };

		// Якщо ми почали реальний рух (більше 5px), скидаємо старий вибір (тапом),
		// щоб не було конфлікту візуалів (синій vs помаранчевий)
		const dist = Math.hypot(
			e.clientX - dragState.startPoint.x,
			e.clientY - dragState.startPoint.y
		);
		
		if (dist > 5 && gameState.selectedCard) {
			if (gameState.selectedCard.id !== dragState.sourceCard?.id) {
				gameState.updateCardStatus(gameState.selectedCard.id, "idle");
			}
			gameState.setSelectedCard(null);
		}

		// Hit testing для підсвічування
		const elements = document.elementsFromPoint(e.clientX, e.clientY);
		// Шукаємо елемент, який є WordCard (має data-testid починаючий з word-card-)
		// Або батьківський враппер.
		// Найпростіше: ми передамо data-card-id в WordCard (через враппер або сам компонент)
		// Але оскільки WordCard - це кнопка, ми шукаємо кнопку з певним атрибутом.
		
		let foundCardId: string | null = null;
		for (const el of elements) {
			const testId = el.getAttribute("data-testid");
			if (testId && testId.startsWith("word-card-")) {
				foundCardId = testId.replace("word-card-", "");
				break;
			}
			// Також перевіримо батьків, якщо elementsFromPoint повернув child
			const closest = el.closest('[data-testid^="word-card-"]');
			if (closest) {
				foundCardId = closest.getAttribute("data-testid")!.replace("word-card-", "");
				break;
			}
		}

		// Не підсвічуємо, якщо це та сама картка або з тієї ж колонки
		if (foundCardId) {
			const isSource = foundCardId === dragState.sourceCard?.id;
			// Тут ми не маємо прямого доступу до об'єкта картки за ID швидко, 
			// але можемо перевірити в sourceCards/targetCards
			const targetCard = [...gameState.sourceCards, ...gameState.targetCards].find(c => c.id === foundCardId);
			
			if (targetCard && targetCard.language !== dragState.sourceCard?.language && targetCard.status !== "correct") {
				dragState.hoveredCardId = foundCardId;
			} else {
				dragState.hoveredCardId = null;
			}
		} else {
			dragState.hoveredCardId = null;
		}
	}

	function handleDragEnd() {
		if (!dragState.active) return;

		// Якщо ми відпустили над валідною ціллю
		if (dragState.hoveredCardId && dragState.sourceCard) {
			const targetCard = [...gameState.sourceCards, ...gameState.targetCards].find(c => c.id === dragState.hoveredCardId);
			if (targetCard) {
				// Виконуємо послідовний вибір: спочатку джерело (якщо ще не вибране), потім ціль
				// Але gameController.selectCard має логіку "toggle".
				// Тому надійніше:
				// 1. Якщо джерело ще не вибране -> вибрати.
				// 2. Вибрати ціль.
				
				// Важливо: selectCard перевіряє gameState.selectedCard.
				// Якщо нічого не вибрано - вибирає. Якщо вибрано - матчить.
				
				// Сценарій 1: Нічого не вибрано. Drag A -> B.
				// selectCard(A) -> A selected. selectCard(B) -> Match attempt.
				
				// Сценарій 2: Вибрано C. Drag A -> B.
				// selectCard(A) -> C deselect, A selected. selectCard(B) -> Match attempt.
				
				// Сценарій 3: Вибрано A. Drag A -> B.
				// selectCard(A) -> A deselected (Toggle logic!). PROBLEM.
				
				// Тому нам треба перевірити поточний стан.
				const currentSelected = gameState.selectedCard;
				
				if (currentSelected?.id === dragState.sourceCard.id) {
					// Вже вибрана, просто вибираємо другу
					gameController.selectCard(targetCard);
				} else {
					// Не вибрана (або вибрана інша).
					gameController.selectCard(dragState.sourceCard);
					// Невелика затримка або синхронно? selectCard синхронний (окрім анімацій).
					// Але якщо ми викликаємо підряд, стан може не встигнути оновитись в сторі, якщо там є асинхронність?
					// В Svelte 5 runes стан миттєвий.
					gameController.selectCard(targetCard);
				}
			}
		} else {
			// Якщо відпустили в порожнечу - нічого не робимо, або можна вибирати картку (як клік)
			// Але клік і так спрацює через onclick, якщо рух був малий.
			// Якщо рух великий -> це скасування.
			
			// Можна додати логіку: якщо drag був дуже коротким (< 10px), то це клік, і нехай onclick обробить.
			// Якщо довгий - то це спроба драгу, яка провалилась -> нічого не робимо.
		}

		dragState = {
			active: false,
			startPoint: null,
			currentPoint: null,
			sourceCard: null,
			hoveredCardId: null,
		};
	}
</script>

<svelte:window onpointermove={handleDragMove} onpointerup={handleDragEnd} onpointercancel={handleDragEnd} />

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
	<!-- SVG Overlay for Drag Line -->
	{#if dragState.active && dragState.startPoint && dragState.currentPoint}
		<svg class="drag-overlay">
			<line 
				x1={dragState.startPoint.x} 
				y1={dragState.startPoint.y} 
				x2={dragState.currentPoint.x} 
				y2={dragState.currentPoint.y} 
				stroke="var(--accent)" 
				stroke-width="4" 
				stroke-linecap="round"
				opacity="0.6"
			/>
		</svg>
	{/if}

	<div
		class="game-board"
		onclick={(e) => {
			// Очищаємо вибір тільки якщо клікнули саме по фону, а не по картці
			if (e.target === e.currentTarget) {
				gameState.setSelectedCard(null);
			}
		}}
		onkeydown={(e) => {
			if (e.key === "Escape") gameState.setSelectedCard(null);
		}}
		role="presentation"
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
									onpointerdown={(e) => handleDragStart(e, card)}
									onlongpress={(e) => handleLongPress(e, card)}
								/>
								{#if dragState.hoveredCardId === card.id || dragState.sourceCard?.id === card.id}
									<div class="card-hover-highlight"></div>
								{/if}
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
									onpointerdown={(e) => handleDragStart(e, card)}
									onlongpress={(e) => handleLongPress(e, card)}
								/>
								{#if dragState.hoveredCardId === card.id || dragState.sourceCard?.id === card.id}
									<div class="card-hover-highlight"></div>
								{/if}
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
	.drag-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 9999;
	}

	.card-hover-highlight {
		position: absolute;
		inset: 0; /* Align perfectly with card edges */
		border: 2px solid var(--accent);
		border-radius: 12px; /* Match WordCard border-radius */
		pointer-events: none;
		z-index: 10;
		box-shadow: 0 0 10px rgba(233, 84, 32, 0.3);
		animation: pulse-highlight 2s infinite ease-in-out;
	}
	
	@keyframes pulse-highlight {
		0% { opacity: 0.5; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.004); }
		100% { opacity: 0.5; transform: scale(1); }
	}

	.game-board {
		display: flex;
		gap: 1rem;
		width: 100%;
		max-width: 500px;
		height: 100%;
		max-height: 1000px;
		margin: 0 auto;
		padding: 1rem;
		position: relative;
		outline: none;
		-webkit-tap-highlight-color: transparent;
		user-select: none;
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
		position: relative;
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
