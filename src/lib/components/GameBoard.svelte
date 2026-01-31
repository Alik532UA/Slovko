<script lang="ts">
	/**
	 * GameBoard.svelte — Ігрове поле
	 * Композиція: рендерить WordCard компоненти
	 */
	import { gameState } from '$lib/stores/gameState.svelte';
	import WordCard from './WordCard.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		gameState.initGame();
	});
</script>

<div class="game-board">
	<div class="column ukrainian">
		{#each gameState.ukrainianCards as card (card.id)}
			<div class="card-slot">
				<WordCard {card} onclick={() => gameState.selectCard(card)} />
			</div>
		{/each}
	</div>

	<div class="column english">
		{#each gameState.englishCards as card (card.id)}
			<div class="card-slot">
				<WordCard {card} onclick={() => gameState.selectCard(card)} />
			</div>
		{/each}
	</div>
</div>

<style>
	.game-board {
		display: flex;
		gap: 1rem;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		padding: 1rem;
	}

	.column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card-slot {
		min-height: 60px;
	}
</style>
