<script lang="ts">
	/**
	 * WordCard.svelte — Картка слова
	 * SoC: тільки відображення та передача подій
	 * Підтримка транскрипції та озвучування
	 */
	import type { ActiveCard } from "$lib/types/index";
	import { speakText } from "$lib/services/speechService";
	import type { Snippet } from "svelte";

	interface Props {
		card: ActiveCard;
		showTranscription?: boolean;
		enablePronunciation?: boolean;
		isDimmed?: boolean;
		onclick: () => void;
		onpointerdown?: (e: PointerEvent) => void;
		onlongpress?: (e: PointerEvent) => void;
		wordSnippet?: Snippet<[string]>;
		transcriptionSnippet?: Snippet<[string]>;
	}

	let {
		card,
		showTranscription = false,
		enablePronunciation = false,
		isDimmed = false,
		onclick,
		onpointerdown,
		onlongpress,
		wordSnippet,
		transcriptionSnippet,
	}: Props = $props();

	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let isLongPress = false;
	let startPos = { x: 0, y: 0 };

	function isInteractable(): boolean {
		return (
			card.status !== "correct" &&
			card.status !== "wrong"
		);
	}

	function handlePointerDown(e: PointerEvent) {
		if (!isInteractable()) return;

		// Озвучуємо слово одразу при натисканні
		if (enablePronunciation && card.status !== "selected") {
			speakText(card.text, card.language);
		}

		// Зовнішній обробник для драгу
		if (onpointerdown) onpointerdown(e);

		startPos = { x: e.clientX, y: e.clientY };
		isLongPress = false;
		longPressTimer = setTimeout(() => {
			isLongPress = true;
			if (onlongpress) onlongpress(e);
		}, 500);
	}

	function handlePointerMove(e: PointerEvent) {
		if (longPressTimer) {
			const dist = Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y);
			if (dist > 10) {
				clearTimeout(longPressTimer);
				longPressTimer = null;
			}
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		if (isLongPress) {
			e.preventDefault();
		}
	}

	function handlePointerLeave() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (onlongpress) {
			onlongpress(e as unknown as PointerEvent);
		}
	}

	function handleClick(e: MouseEvent) {
		e.stopPropagation();

		if (isLongPress) {
			setTimeout(() => {
				isLongPress = false;
			}, 50);
			return;
		}

		if (
			card.status === "correct" ||
			card.status === "wrong"
		)
			return;

		onclick();
	}
</script>

<button
	type="button"
	class="word-card"
	class:selected={card.status === "selected"}
	class:correct={card.status === "correct"}
	class:wrong={card.status === "wrong"}
	class:hint={card.status === "hint"}
	class:hint-slow={card.status === "hint-slow"}
	class:dimmed={isDimmed}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointerleave={handlePointerLeave}
	oncontextmenu={handleContextMenu}
	onclick={handleClick}
	aria-label="{card.text}{card.transcription && showTranscription ? `, ${card.transcription}` : ''}"
	aria-current={card.status === "selected" ? "true" : undefined}
	aria-disabled={card.status === "correct" || card.status === "wrong"}
	data-testid="word-card-{card.id}"
>
	{#if wordSnippet}
		{@render wordSnippet(card.text)}
	{:else}
		<span class="word-text">{card.text}</span>
	{/if}

	{#if card.transcription && showTranscription}
		{#if transcriptionSnippet}
			{@render transcriptionSnippet(card.transcription)}
		{:else}
			<span class="transcription">{card.transcription}</span>
		{/if}
	{/if}
</button>

<style>
	.word-card {
		width: 100%;
		height: 100%;
		min-height: 0;
		padding: 0.5rem;
		font-size: clamp(0.9rem, 2.2vh, 1.15rem);
		font-weight: 500;
		color: var(--text-on-card);
		/* Робимо фон напівпрозорим (30%), щоб було видно блюр від батьківського елемента */
		background: color-mix(in srgb, var(--card-bg), transparent 30%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		cursor: pointer;
		opacity: 1;
		user-select: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		overflow: hidden;
		touch-action: none;
		-webkit-user-select: none;
		transform: translateZ(0);

		transition:
			transform 0.15s ease,
			background-color 0.4s ease,
			border-color 0.4s ease,
			box-shadow 0.4s ease,
			opacity 0.3s ease;
	}

	.word-text {
		text-align: center;
		word-break: break-word;
		line-height: 1.15;
		max-width: 100%;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.transcription {
		font-size: clamp(0.6rem, 1.5vh, 0.8rem);
		color: var(--text-on-card);
		opacity: 0.7;
		font-weight: 400;
		line-height: 1;
	}

	.word-card:hover {
		transform: scale(var(--hover-scale)) translateZ(0);
		border-color: var(--card-hover-border);
		z-index: 2;
		background: color-mix(in srgb, var(--card-bg), transparent 10%);
	}

	.word-card:active {
		transform: scale(var(--active-scale)) translateZ(0);
	}

	.word-card.correct {
		background: color-mix(in srgb, var(--correct-bg), transparent 50%);
		border-color: var(--correct-border);
		animation: correctFade 0.8s ease-out forwards;
		cursor: default;
	}

	.word-card.correct:hover {
		transform: none;
		border-color: var(--correct-border);
	}

	.word-card.selected {
		background: color-mix(in srgb, var(--selected-bg), transparent 30%);
		border-color: var(--selected-border);
		animation: selectedPulse 2s infinite ease-in-out;
		box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.3);
	}

	.word-card.dimmed {
		filter: brightness(0.4) blur(2px);
		pointer-events: none;
		opacity: 0.4;
	}

	@keyframes selectedPulse {
		0%, 100% {
			transform: scale(1) translateZ(0);
			box-shadow: 0 0 5px rgba(var(--accent-rgb), 0.2);
		}
		50% {
			transform: scale(1.02) translateZ(0);
			box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.5);
		}
	}

	@keyframes correctFade {
		0% {
			background-color: color-mix(in srgb, var(--correct-bg), transparent 0%);
			transform: scale(1) translateZ(0);
		}
		20% {
			background-color: color-mix(in srgb, var(--correct-bg), transparent 0%);
			transform: scale(1.08) translateZ(0);
		}
		100% {
			background-color: color-mix(in srgb, var(--correct-bg), transparent 50%);
			transform: scale(0.95) translateZ(0);
		}
	}

	.word-card.wrong {
		animation: shake 0.4s ease-in-out;
		background: color-mix(in srgb, var(--wrong-bg), transparent 30%);
		border-color: var(--wrong-border);
	}

	.word-card.hint {
		animation: hintPulse 2s ease-in-out infinite;
	}

	.word-card.hint-slow {
		animation: hintPulse 5s ease-in-out infinite;
	}

	@keyframes hintPulse {
		0% {
			transform: scale(1);
			background-color: var(--card-bg);
			box-shadow: 0 0 0 rgba(233, 84, 32, 0);
		}
		50% {
			transform: scale(1.03);
			background-color: rgba(233, 84, 32, 0.18);
			box-shadow: 0 0 30px rgba(233, 84, 32, 0.45);
		}
		100% {
			transform: scale(1);
			background-color: var(--card-bg);
			box-shadow: 0 0 0 rgba(233, 84, 32, 0);
		}
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-8px); }
		40% { transform: translateX(8px); }
		60% { transform: translateX(-6px); }
		80% { transform: translateX(6px); }
	}

	@media (max-width: 480px) {
		.word-card {
			border-radius: 8px;
			padding: 0.2rem;
			gap: 0.1rem;
		}
		.word-text { font-size: clamp(0.8rem, 4vw, 1rem); }
	}

	@media (max-height: 600px) {
		.word-card {
			padding: 0.15rem;
			gap: 0;
			min-height: auto;
		}
		.word-text {
			line-height: 1.1;
			font-size: clamp(0.75rem, 3.5vh, 1rem);
		}
		.transcription {
			font-size: 0.7em;
			margin-top: 1px;
		}
	}
</style>
