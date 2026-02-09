<script lang="ts">
	/**
	 * WordCard.svelte — Картка слова
	 * SoC: тільки відображення та передача подій
	 * Підтримка транскрипції та озвучування
	 */
	import type { ActiveCard } from "$lib/types";
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
	let wasSpoken = false;

	function handlePointerDown(e: PointerEvent) {
		// Якщо картка вже в особливому стані, ігноруємо
		if (
			card.status === "correct" ||
			card.status === "wrong" ||
			card.status === "hint" ||
			card.status === "hint-slow"
		)
			return;

		wasSpoken = false;

		// Спроба озвучити при натисканні (важливо для початку драгу)
		if (enablePronunciation && card.status !== "selected") {
			const text = card.text;
			const lang = card.language;
			setTimeout(() => {
				speakText(text, lang);
			}, 0);
			wasSpoken = true;
			// Скидаємо прапорець через короткий час
			setTimeout(() => { wasSpoken = false; }, 300);
		}

		// Якщо передано зовнішній обробник (для драгу), викликаємо його
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
			// Якщо зміщення більше 10px, вважаємо це початком руху і скасовуємо лонг-прес
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
		// Запобігаємо відкриттю стандартного меню браузера
		e.preventDefault();
		e.stopPropagation();

		// Викликаємо меню (використовуємо той самий колбек, що і для лонг-пресу)
		if (onlongpress) {
			onlongpress(e as unknown as PointerEvent);
		}
	}

	function handleClick(e: MouseEvent) {
		// Запобігаємо спливанню події
		e.stopPropagation();

		if (isLongPress) {
			// Delay clearing the flag to catch trailing events on iOS
			setTimeout(() => {
				isLongPress = false;
			}, 50);
			return;
		}

		// Якщо картка вже в особливому стані, ігноруємо клік
		if (
			card.status === "correct" ||
			card.status === "wrong" ||
			card.status === "hint" ||
			card.status === "hint-slow"
		)
			return;

		// Для iOS: якщо в pointerdown звук не спрацював (через блокування Safari),
		// то handleClick — наш останній шанс, він точно має спрацювати.
		if (enablePronunciation && card.status !== "selected" && !wasSpoken) {
			const text = card.text;
			const lang = card.language;
			setTimeout(() => {
				speakText(text, lang);
			}, 0);
		}

		onclick();
	}
</script>

<button
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
		color: var(--text-primary);
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
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		overflow: hidden; /* Запобігаємо виходу за межі */
		touch-action: none; /* Забороняємо скрол браузера при свайпі з картки (для малювання ліній) */
		-webkit-user-select: none; /* iOS Safari fix */
	}

	.word-text {
		text-align: center;
		word-break: break-word;
		line-height: 1.15;
		max-width: 100%;
	}

	.transcription {
		font-size: clamp(0.6rem, 1.5vh, 0.8rem);
		color: var(--text-secondary);
		font-weight: 400;
		line-height: 1;
	}

	.word-card:hover {
		transform: translateY(-2px);
		border-color: var(--card-hover-border);
	}

	.word-card:active {
		transform: translateY(0);
	}

	/* Remove specific disabled styling or keep it if needed for visual indication that it's matched */
	.word-card.correct {
		background: var(--correct-bg);
		border-color: var(--correct-border);
		animation: correctFade 0.8s ease-out forwards;
		cursor: default; /* Show it's not clickable */
	}

	/* Ensure hover doesn't trigger on correct cards */
	.word-card.correct:hover {
		transform: none; /* override hover lift */
		border-color: var(--correct-border);
	}

	/* Вибрана картка */
	.word-card.selected {
		background: var(--selected-bg);
		border-color: var(--selected-border);
		animation: selectedPulse 2s infinite ease-in-out;
	}

	.word-card.dimmed {
		filter: brightness(0.4) blur(2px);
		pointer-events: none;
		opacity: 0.8;
	}

	@keyframes selectedPulse {
		0%,
		100% {
			box-shadow: 0 0 0 rgba(58, 143, 214, 0);
		}
		50% {
			box-shadow: 0 0 12px rgba(58, 143, 214, 0.3);
		}
	}

	/* Правильна відповідь — зелений спалах + 25% прозорість */
	/* ... rest of animations same ... */
	@keyframes correctFade {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		20% {
			opacity: 1;
			transform: scale(1.08);
		}
		100% {
			opacity: 0.25;
			transform: scale(0.95);
		}
	}

	/* Неправильна відповідь — червоне блимання */
	.word-card.wrong {
		animation: shake 0.4s ease-in-out;
		background: var(--wrong-bg);
		border-color: var(--wrong-border);
	}

	/* Підказка — плавне блимання */
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
			border-color: var(--card-border);
			box-shadow: 0 0 0 rgba(58, 143, 214, 0);
		}
		50% {
			transform: scale(1.03);
			background-color: rgba(58, 143, 214, 0.15);
			border-color: #3a8fd6;
			box-shadow: 0 0 25px rgba(58, 143, 214, 0.4);
		}
		100% {
			transform: scale(1);
			background-color: var(--card-bg);
			border-color: var(--card-border);
			box-shadow: 0 0 0 rgba(58, 143, 214, 0);
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

	/* Адаптивність для малих екранів */
	@media (max-width: 480px) {
		.word-card {
			border-radius: 8px;
			padding: 0.2rem; /* Мінімальні відступи */
			gap: 0.1rem;
		}

		.word-text {
			font-size: clamp(0.8rem, 4vw, 1rem); /* Трохи менший шрифт */
		}
	}

	/* Адаптивність для екранів з малою висотою (ландшафт на мобільному) */
	@media (max-height: 600px) {
		.word-card {
			padding: 0.15rem; /* Ще менші відступи */
			gap: 0; /* Прибираємо gap, якщо місця мало */
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
