<script lang="ts">
	import { fade } from "svelte/transition";
	import { browser } from "$app/environment";
	import { portal } from "$lib/actions/portal";

	interface Props {
		text: string;
		children: any;
	}

	let { text, children }: Props = $props();
	
	let isVisible = $state(false);
	let triggerEl = $state<HTMLElement | null>(null);
	let tooltipEl = $state<HTMLElement | null>(null);
	
	let coords = $state({ top: 0, left: 0, arrowLeft: 50, maxWidth: 300, placement: 'top' });

	function updatePosition() {
		if (!triggerEl || !tooltipEl || !browser) return;

		const triggerRect = triggerEl.getBoundingClientRect();
		const screenWidth = window.innerWidth;
		const screenHeight = window.innerHeight;
		const padding = 12;

		// 1. Встановлюємо maxWidth заздалегідь
		const availableWidth = screenWidth - (padding * 2);
		coords.maxWidth = Math.min(availableWidth, 280);

		// 2. Вимірюємо розміри тултіпа
		const tooltipRect = tooltipEl.getBoundingClientRect();

		// 3. Визначаємо вертикальну позицію (Flip logic)
		const spaceAbove = triggerRect.top;
		const spaceBelow = screenHeight - triggerRect.bottom;
		
		let placement = 'top';
		if (spaceAbove < tooltipRect.height + 20 && spaceBelow > spaceAbove) {
			placement = 'bottom';
		}
		coords.placement = placement;

		// 4. Розраховуємо X та Y
		let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
		let top = placement === 'top' 
			? triggerRect.top - tooltipRect.height - 10
			: triggerRect.bottom + 10;

		// 5. Clamping X (горизонтальні межі)
		if (left < padding) left = padding;
		if (left + tooltipRect.width > screenWidth - padding) {
			left = screenWidth - tooltipRect.width - padding;
		}

		// 6. Розраховуємо позицію стрілки
		const triggerCenter = triggerRect.left + triggerRect.width / 2;
		const arrowLeftRelative = triggerCenter - left;
		const arrowLeftPercent = Math.max(15, Math.min(85, (arrowLeftRelative / tooltipRect.width) * 100));

		coords = {
			top: top + window.scrollY,
			left: left + window.scrollX,
			arrowLeft: arrowLeftPercent,
			maxWidth: coords.maxWidth,
			placement
		};
	}

	function show() {
		isVisible = true;
		// Подвійний прохід для ідеального позиціонування
		setTimeout(() => {
			updatePosition();
			requestAnimationFrame(updatePosition);
		}, 0);
	}

	function hide() {
		isVisible = false;
	}

	$effect(() => {
		if (isVisible) {
			window.addEventListener('resize', updatePosition);
			window.addEventListener('scroll', updatePosition, { passive: true });
			return () => {
				window.removeEventListener('resize', updatePosition);
				window.removeEventListener('scroll', updatePosition);
			};
		}
	});
</script>

<div 
	bind:this={triggerEl}
	class="tooltip-trigger" 
	onmouseenter={show} 
	onmouseleave={hide}
	onfocusin={show}
	onfocusout={hide}
	role="button"
	tabindex="0"
	aria-label={text}
>
	{@render children()}
</div>

{#if isVisible && text}
	<div 
		use:portal
		bind:this={tooltipEl}
		class="tooltip-content {coords.placement}" 
		style:top="{coords.top}px"
		style:left="{coords.left}px"
		style:max-width="{coords.maxWidth}px"
		style:--arrow-left="{coords.arrowLeft}%"
		transition:fade={{ duration: 150 }}
		role="tooltip"
	>
		{text}
	</div>
{/if}

<style>
	.tooltip-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.tooltip-content {
		position: absolute;
		background: rgba(15, 15, 25, 0.98);
		color: white;
		padding: 0.6rem 1rem;
		border-radius: 12px;
		font-size: 0.85rem;
		line-height: 1.4;
		z-index: 200000;
		pointer-events: none;
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
		font-weight: 600;
		text-align: center;
		white-space: normal; 
		word-wrap: break-word;
	}

	.tooltip-content::after {
		content: '';
		position: absolute;
		border: 6px solid transparent;
		left: var(--arrow-left);
		transform: translateX(-50%);
	}

	.tooltip-content.top::after {
		top: 100%;
		border-top-color: rgba(15, 15, 25, 0.98);
	}

	.tooltip-content.bottom::after {
		bottom: 100%;
		border-bottom-color: rgba(15, 15, 25, 0.98);
	}

	@media (max-width: 768px) {
		:global(.tooltip-content) {
			display: none !important;
		}
	}
</style>
