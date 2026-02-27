<script lang="ts">
	import { _ } from "svelte-i18n";
	import { speakText } from "$lib/services/speechService";
	import { Speech } from "lucide-svelte";

	interface SwipeItem {
		id: string;
		wordKey: string;
		front: string;
		back: string;
		transcription?: string;
		frontLanguage: string;
		backLanguage: string;
	}

	let {
		item,
		handleSwipeUp,
		handleSwipeDown,
	}: {
		item: SwipeItem;
		handleSwipeUp: () => void;
		handleSwipeDown: () => void;
	} = $props();

	let flipped = $state(false);

	// Basic drag handling
	let startY = $state(0);
	let currentY = $state(0);
	let isDragging = $state(false);

	let transformY = $derived(isDragging ? currentY - startY : 0);
	let opacity = $derived(
		isDragging ? 1 - Math.min(Math.abs(transformY) / 300, 0.5) : 1,
	);
	let rotationX = $derived(isDragging ? -(transformY / 10) : 0); // slight tilt when dragging

	let swipeProgress = $derived(Math.max(-1, Math.min(1, transformY / 150)));
	let cardTint = $derived.by(() => {
		if (swipeProgress < 0) {
			// Green (Know, Up)
			const alpha = Math.abs(swipeProgress) * 0.4;
			return `rgba(46, 204, 113, ${alpha})`;
		} else if (swipeProgress > 0) {
			// Red (Don't Know, Down)
			const alpha = Math.abs(swipeProgress) * 0.4;
			return `rgba(231, 76, 60, ${alpha})`;
		}
		return "transparent";
	});

	function onPointerDown(e: PointerEvent) {
		isDragging = true;
		startY = e.clientY;
		currentY = e.clientY;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		currentY = e.clientY;
	}

	function onPointerUp(e: PointerEvent) {
		if (!isDragging) return;

		const finalTransformY = transformY;
		const threshold = 80;

		if (finalTransformY < -threshold) {
			handleSwipeUp();
			return; // Do not reset isDragging, component will be unmounted
		} else if (finalTransformY > threshold) {
			handleSwipeDown();
			return; // Same here
		}

		isDragging = false;
		if (Math.abs(finalTransformY) < 10) {
			// It was a tap
			flipped = !flipped;
		}

		startY = 0;
		currentY = 0;
	}

	function onPointerCancel(e: PointerEvent) {
		if (!isDragging) return;

		const finalTransformY = transformY;
		const threshold = 80;

		// Try to evaluate if a threshold was crossed right before cancel (happens on fast swipes)
		if (finalTransformY < -threshold) {
			handleSwipeUp();
			return;
		} else if (finalTransformY > threshold) {
			handleSwipeDown();
			return;
		}

		isDragging = false;
		// Do NOT flip on cancel

		startY = 0;
		currentY = 0;
	}

	// Action to prevent native scrolling while swiping
	function preventScroll(node: HTMLElement) {
		const handleEvent = (e: Event) => {
			// Always prevent default to stop page from scrolling when interacting with the card
			if (e.cancelable) {
				e.preventDefault();
			}
		};
		node.addEventListener("touchmove", handleEvent, { passive: false });
		node.addEventListener("wheel", handleEvent, { passive: false });
		return {
			destroy() {
				node.removeEventListener("touchmove", handleEvent);
				node.removeEventListener("wheel", handleEvent);
			},
		};
	}
	function playAudio(text: string, lang: string, e: MouseEvent | PointerEvent) {
		e.stopPropagation();
		speakText(text, lang);
	}
</script>

<div
	class="swipe-card-wrapper"
	data-testid="swipe-card-wrapper"
	use:preventScroll
	style="transform: translateY({transformY}px) rotateX({rotationX}deg); opacity: {opacity}; --swipe-tint: {cardTint};"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerCancel}
	role="button"
	tabindex="0"
	aria-pressed={flipped}
>
	<div class="card-inner" class:flipped data-testid="swipe-card-inner">
		<div class="card-face card-front" data-testid="swipe-card-front">
			<button
				class="speech-btn"
				onclick={(e) => playAudio(item.front, item.frontLanguage, e)}
				onpointerdown={(e) => e.stopPropagation()}
				aria-label="Play audio"
				title="Play audio"
			>
				<Speech size={24} />
			</button>
			<span
				class="word"
				class:medium={item.front.length > 12 && item.front.length <= 22}
				class:long={item.front.length > 22}
				data-testid="swipe-card-word-front"
			>
				{item.front}
			</span>
			{#if item.transcription}
				<span class="transcription" data-testid="swipe-card-transcription"
					>[{item.transcription}]</span
				>
			{/if}
			<div class="hint-text" data-testid="swipe-card-hint">
				{$_("swipe.tapToFlip")}
			</div>
		</div>

		<div class="card-face card-back" data-testid="swipe-card-back">
			<button
				class="speech-btn"
				onclick={(e) => playAudio(item.back, item.backLanguage, e)}
				onpointerdown={(e) => e.stopPropagation()}
				aria-label="Play audio"
				title="Play audio"
			>
				<Speech size={24} />
			</button>
			<span
				class="word original"
				class:medium={item.front.length > 12 && item.front.length <= 22}
				class:long={item.front.length > 22}
				data-testid="swipe-card-word-original-back"
			>
				{item.front}
			</span>
			<span
				class="word highlight"
				class:medium={item.back.length > 12 && item.back.length <= 22}
				class:long={item.back.length > 22}
				data-testid="swipe-card-word-back"
			>
				{item.back}
			</span>
		</div>
	</div>
</div>

<style>
	.swipe-card-wrapper {
		width: 100%;
		height: 300px;
		max-width: 320px;
		cursor: grab;
		transform-style: preserve-3d;
		transition:
			transform 0.1s ease-out,
			opacity 0.1s ease-out;
		touch-action: none; /* Prevent browser scrolling while swiping */
	}

	.swipe-card-wrapper:active {
		cursor: grabbing;
	}

	.card-inner {
		position: relative;
		width: 100%;
		height: 100%;
		text-align: center;
		transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
		transform-style: preserve-3d;
		border-radius: 20px;
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
	}

	.card-inner.flipped {
		transform: rotateX(180deg);
	}

	.card-face {
		position: absolute;
		width: 100%;
		height: 100%;
		-webkit-backface-visibility: hidden;
		backface-visibility: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--bg-secondary);
		border: 2px solid var(--border);
		border-radius: 20px;
		padding: 2rem;
		user-select: none;
	}

	.card-face::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background-color: var(--swipe-tint, transparent);
		pointer-events: none;
		transition: background-color 0.1s ease-out;
		z-index: 0;
	}

	.card-face > * {
		position: relative;
		z-index: 1;
	}

	.card-back {
		transform: rotateX(180deg);
		background: var(--bg-secondary);
		border-color: var(--accent);
	}

	.speech-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			color 0.2s,
			background-color 0.2s;
	}

	.speech-btn:hover {
		color: var(--accent);
		background-color: var(--bg-hover, rgba(0, 0, 0, 0.05));
	}

	.word {
		font-size: 2rem;
		font-weight: 800;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
		word-break: normal;
		overflow-wrap: break-word;
		text-align: center;
		padding: 0 0.5rem;
		line-height: 1.2;
	}

	.word.medium {
		font-size: 1.5rem;
	}

	.word.long {
		font-size: 1.2rem;
	}

	.word.highlight {
		color: var(--accent);
	}

	.word.original {
		font-size: 1.2rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
		font-weight: 500;
	}

	.word.original.medium {
		font-size: 1rem;
	}

	.word.original.long {
		font-size: 0.85rem;
	}

	.transcription {
		font-size: 1.2rem;
		color: var(--text-secondary);
		font-family: monospace;
		margin-bottom: 1rem;
	}

	.hint-text {
		position: absolute;
		bottom: 1.5rem;
		font-size: 0.85rem;
		color: var(--text-muted);
		opacity: 0.7;
	}
</style>
