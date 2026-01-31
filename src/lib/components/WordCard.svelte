<script lang="ts">
	/**
	 * WordCard.svelte — Картка слова
	 * SoC: тільки відображення та передача подій
	 */
	import type { ActiveCard } from '$lib/types';

	interface Props {
		card: ActiveCard;
		onclick: () => void;
	}

	let { card, onclick }: Props = $props();
</script>

<button
	class="word-card"
	class:selected={card.status === 'selected'}
	class:correct={card.status === 'correct'}
	class:wrong={card.status === 'wrong'}
	onclick={onclick}
	disabled={card.status === 'correct'}
>
	{card.text}
</button>

<style>
	.word-card {
		width: 100%;
		padding: 1.25rem 1rem;
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--text-color);
		background: var(--card-bg);
		border: 2px solid var(--card-border);
		border-radius: 12px;
		cursor: pointer;
		transition:
			transform 0.15s ease,
			background-color 0.2s ease,
			border-color 0.2s ease,
			opacity 0.3s ease,
			scale 0.3s ease;
		user-select: none;
	}

	.word-card:hover:not(:disabled) {
		transform: translateY(-2px);
		border-color: var(--card-hover-border);
	}

	.word-card:active:not(:disabled) {
		transform: translateY(0);
	}

	/* Вибрана картка */
	.word-card.selected {
		background: var(--selected-bg);
		border-color: var(--selected-border);
	}

	/* Правильна відповідь — зелений + зникнення */
	.word-card.correct {
		background: var(--correct-bg);
		border-color: var(--correct-border);
		animation: fadeOut 0.5s ease-out forwards;
	}

	/* Неправильна відповідь — червоне блимання */
	.word-card.wrong {
		animation: shake 0.4s ease-in-out;
		background: var(--wrong-bg);
		border-color: var(--wrong-border);
	}

	@keyframes fadeOut {
		0% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
			scale: 0.8;
		}
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-8px);
		}
		40% {
			transform: translateX(8px);
		}
		60% {
			transform: translateX(-6px);
		}
		80% {
			transform: translateX(6px);
		}
	}
</style>
