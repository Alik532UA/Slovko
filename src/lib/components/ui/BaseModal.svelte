<script lang="ts">
	import { _ } from "svelte-i18n";
	import { fade, scale } from "svelte/transition";
	import { X } from "lucide-svelte";
	import { onMount, onDestroy, type Snippet } from "svelte";

	interface Props {
		onclose: () => void;
		testid: string;
		children: Snippet;
		maxWidth?: string;
		showCloseButton?: boolean;
	}

	let {
		onclose,
		testid,
		children,
		maxWidth = "480px",
		showCloseButton = true,
	}: Props = $props();

	let modalEl = $state<HTMLElement | null>(null);

	onMount(() => {
		document.body.style.overflow = "hidden";
		// Фокусуємо модалку при відкритті
		modalEl?.focus();
	});

	onDestroy(() => {
		document.body.style.overflow = "";
	});

	/** Клік МИМО вікна. Клік по самому вікну сюди не доходить — його спиняє `.modal`. */
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}
</script>

<!--
	Тло — НЕ кнопка (ACCESSIBILITY-v8 § 10.1, axe `nested-interactive`).

	Тут стояли `role="button"`, `tabindex="0"` і `aria-label="Закрити"` — на
	елементі, ВСЕРЕДИНІ якого лежить усе вікно з власними кнопками. Наслідків
	було два, і обидва невидимі в коді: axe рахував порушення «фокусовані
	нащадки в елементі з роллю віджета» на КОЖНОМУ з чотирнадцяти вікон, а
	читалка оголошувала ціле вікно як «Закрити, кнопка» й давала перед ним
	мертву зупинку табуляції. Той самий дефект, що 2026-08-28 знайшовся в
	`BaseTooltip`, тільки на два порядки помітніший.

	Клік мимо лишається — це вказівникова зручність, а не єдиний спосіб вийти:
	з клавіатури працюють Escape (обробник на самому вікні, яке отримує фокус
	при монтуванні) і справжня кнопка «×» усередині. Саме тому клавіатурного
	еквівалента цьому `onclick` не потрібно — він нічого не додає до того, що
	вже є, і зразок стоїть поруч, у `GameStats.svelte`.
-->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="modal-backdrop"
	transition:fade={{ duration: 200 }}
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	data-testid="{testid}-backdrop"
>
	<div
		bind:this={modalEl}
		class="modal"
		style="max-width: {maxWidth}"
		data-testid={testid}
		transition:scale={{ duration: 300, start: 0.9 }}
		onclick={(e) => e.stopPropagation()}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		{#if showCloseButton}
			<button
				class="close-btn"
				data-testid="{testid}-close-btn"
				onclick={onclose}
				aria-label={$_("common.close") || "Close"}
			>
				<X size={24} />
			</button>
		{/if}

		<div class="modal-content" data-testid="{testid}-panel">
			{@render children()}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10100;
		background: var(--backdrop-bg);
		backdrop-filter: blur(var(--glass-blur));
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: 5dvh 1.5rem;
		overflow-y: auto;
		transition: background-color 0.3s ease;
	}

	.modal {
		background: transparent;
		width: 100%;
		position: relative;
		color: var(--text-primary);
		padding: 3.5rem 1.5rem 1.5rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.close-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		background: transparent;
		color: var(--text-secondary);
		padding: 0.5rem;
		border-radius: 50%;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.modal-content {
		width: 100%;
	}

	@media (max-width: 480px) {
		.modal {
			padding: 3rem 1rem 1.5rem;
		}
		.close-btn {
			top: 0.5rem;
			right: 0.5rem;
		}
	}
</style>
