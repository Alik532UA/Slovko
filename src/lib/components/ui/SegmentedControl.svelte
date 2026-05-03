<script lang="ts">
	/**
	 * Універсальний компонент сегментованого перемикача (таби/слайдери)
	 * Дизайн уніфіковано з картками статистики та лідерборду
	 */
	import { _ } from "svelte-i18n";
	import type { ComponentType, SvelteComponent } from "svelte";

	interface Option {
		id: string;
		label?: string;
		icon?: ComponentType<SvelteComponent>;
		testId?: string;
		disabled?: boolean;
		title?: string;
	}

	interface Props {
		options: Option[];
		value: string;
		onchange: (id: string) => void;
		variant?: "horizontal" | "vertical";
		testid?: string;
		class?: string;
	}

	let { 
		options, 
		value, 
		onchange, 
		variant = "horizontal",
		testid,
		class: className = ""
	}: Props = $props();

	const activeIndex = $derived(options.findIndex(o => o.id === value));
	const itemWidthPercent = $derived(options.length > 0 ? 100 / options.length : 0);

	function formatLabel(label?: string) {
		if (!label) return "";
		if (label.includes(".") || label === "all" || label.startsWith("common.")) return $_(label);
		return label;
	}
</script>

<div 
	class="segmented-control {className}"
	class:horizontal={variant === "horizontal"}
	class:vertical={variant === "vertical"}
	data-testid={testid}
>
	<div class="slider-container">
		{#if activeIndex !== -1}
			<div 
				class="selection-slider-track" 
				style="width: {itemWidthPercent}%; transform: translateX({activeIndex * 100}%);"
			>
				<div class="selection-slider-thumb"></div>
			</div>
		{/if}
	</div>

	{#each options as option (option.id)}
		<button
			type="button"
			class="segment-btn"
			class:active={value === option.id}
			class:disabled={option.disabled}
			onclick={() => !option.disabled && onchange(option.id)}
			data-testid={option.testId || `segment-${option.id}`}
			title={option.title ? $_(option.title) : (option.label ? formatLabel(option.label) : undefined)}
		>
			{#if option.icon}
				<div class="icon-box">
					<option.icon size={variant === "vertical" ? 18 : 16} />
				</div>
			{/if}
			{#if option.label}
				<span class="label" data-text={formatLabel(option.label)}>{formatLabel(option.label)}</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.segmented-control {
		display: flex;
		/* Точна відповідність фону stat-card та leaderboard-item */
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		padding: 5px;
		border-radius: 20px;
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.05);
		gap: 2px;
		width: 100%;
		max-width: 100%;
		margin: 0 auto;
		overflow: hidden;
		align-items: stretch;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
	}

	.segmented-control.horizontal {
		flex-wrap: wrap;
	}

	/* Disable slider track for wrapped horizontal controls since it relies on a single line */
	.segmented-control.horizontal .slider-container {
		display: none;
	}
	.segmented-control.horizontal .segment-btn.active {
		background: rgba(var(--accent-rgb), 0.15);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb), 0.2);
	}

	.slider-container {
		position: absolute;
		top: 5px;
		bottom: 5px;
		left: 5px;
		right: 5px;
		pointer-events: none;
		z-index: 0;
	}

	.segment-btn {
		flex: 1 1 auto;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 0.75rem 0.5rem;
		border-radius: 15px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 1;
		font-size: 0.85rem;
		text-align: center;
		min-width: max-content;
		position: relative;
		align-self: stretch;
		white-space: nowrap; /* AC 4.1: never wrap text inside */
		word-break: keep-all;
	}

	.segment-btn.active {
		background: rgba(255, 255, 255, 0.05);
	}

	.segmented-control.vertical {
		min-height: 75px;
		flex-wrap: nowrap;
	}

	.segmented-control.vertical .segment-btn {
		flex-direction: column;
		gap: 6px;
		padding: 0.6rem 0.25rem;
		font-size: 0.7rem;
		justify-content: center;
		align-items: center;
		flex: 1;
		min-width: 0;
	}

	.segment-btn:hover:not(.disabled):not(.active) {
		color: var(--text-primary);
		background: rgba(255, 255, 255, 0.05);
	}

	.segment-btn.active {
		color: var(--text-primary);
	}

	.icon-box {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
		flex-shrink: 0;
		color: var(--text-secondary);
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: transparent;
	}

	.segment-btn.active .icon-box {
		background: var(--accent) !important;
		color: var(--text-on-accent) !important; /* Текст/іконка на акцентному фоні */
		transform: scale(1.1);
		box-shadow: 0 4px 10px rgba(var(--accent-rgb), 0.3);
	}

	/* Стиль іконки для вертикального режиму (профіль) */
	.vertical .icon-box {
		background: rgba(255, 255, 255, 0.08);
		margin: 0 auto;
	}

	.segment-btn.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.selection-slider-track {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		transition: transform 0.45s cubic-bezier(0.23, 1, 0.32, 1);
		z-index: 0;
		pointer-events: none;
		display: flex;
	}

	.selection-slider-thumb {
		flex: 1;
		/* Нейтральний фон з прозорістю 10% */
		background: rgba(255, 255, 255, 0.1);
		border-radius: 15px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	/* Спеціальний стан тексту для активних елементів */
	.segment-btn.active .label {
		color: var(--text-primary);
		font-weight: 700;
	}

	.label {
		white-space: nowrap;
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.2;
		transition: all 0.3s;
		position: relative;
	}

	.vertical .label {
		white-space: normal;
		font-size: 0.65rem;
		padding: 0 2px;
		text-align: center;
		width: 100%;
		display: block;
	}

	@media (max-width: 480px) {
		.segmented-control {
			padding: 4px;
			border-radius: 18px;
		}
		.segmented-control.vertical {
			flex-wrap: wrap;
			min-height: auto;
			gap: 0;
		}
		.segmented-control.vertical .segment-btn {
			flex: 0 0 33.333%;
			padding: 0.75rem 0.25rem;
		}
		.segmented-control.vertical .slider-container {
			display: none;
		}
		.segmented-control.vertical .segment-btn.active {
			background: rgba(255, 255, 255, 0.1);
			border-radius: 14px;
			box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
		}
		
		.slider-container {
			top: 4px;
			bottom: 4px;
			left: 4px;
			right: 4px;
		}
		.selection-slider-thumb {
			border-radius: 14px;
		}
		.segment-btn {
			padding: 0.6rem 0.2rem;
			gap: 4px;
			border-radius: 14px;
		}
	}
</style>
