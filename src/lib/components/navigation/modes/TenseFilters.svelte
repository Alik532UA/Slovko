<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { TenseForm } from "$lib/types";
	import { Plus, Minus, HelpCircle, Layers, LayoutGrid } from "lucide-svelte";

	interface Props {
		selectedForms: TenseForm[];
		quantity: "1" | "3" | "many";
		onToggleForm: (form: TenseForm) => void;
		onChangeQuantity: (qty: "1" | "3" | "many") => void;
	}

	let { selectedForms, quantity, onToggleForm, onChangeQuantity }: Props = $props();

	const FORMS: { id: TenseForm; label: string; icon: any }[] = [
		{ id: "aff", label: "tenses.forms.aff", icon: Plus },
		{ id: "neg", label: "tenses.forms.neg", icon: Minus },
		{ id: "ques", label: "tenses.forms.ques", icon: HelpCircle }
	];
</script>

<div class="filters-outer-container" data-testid="tense-filters-container">
	<!-- Quantity Section (Tabs Style) -->
	<div class="filter-section quantity-section">
		<div class="section-header">
			<span class="header-icon"><LayoutGrid size={16} /></span>
			<span class="section-label">{$_("tenses.filterQuantity")}</span>
		</div>
		<div class="segmented-control" data-testid="tense-quantity-radio-group">
			<button
				class="segment-btn"
				class:active={quantity === "1"}
				onclick={() => onChangeQuantity("1")}
				data-testid="tense-qty-1"
			>
				{$_("tenses.qty1")}
			</button>
			<button
				class="segment-btn"
				class:active={quantity === "3"}
				onclick={() => onChangeQuantity("3")}
				data-testid="tense-qty-3"
			>
				{$_("tenses.qty3")}
			</button>
			<button
				class="segment-btn disabled"
				class:active={quantity === "many"}
				disabled
				title={$_("tenses.underConstruction")}
				data-testid="tense-qty-many"
			>
				{$_("tenses.qtyMany")}
			</button>
			<div 
				class="selection-slider" 
				class:pos-1={quantity === "1"}
				class:pos-3={quantity === "3"}
				class:pos-many={quantity === "many"}
			></div>
		</div>
	</div>

	<!-- Forms Section (Modern Cards) -->
	<div class="filter-section forms-section">
		<div class="section-header">
			<span class="header-icon"><Layers size={16} /></span>
			<span class="section-label">{$_("tenses.filterForms")}</span>
		</div>
		<div class="forms-grid" data-testid="tense-forms-grid">
			{#each FORMS as form}
				<button
					class="modern-form-card"
					class:selected={selectedForms.includes(form.id)}
					onclick={() => onToggleForm(form.id)}
					data-testid="tense-form-{form.id}"
				>
					<div class="card-icon-box">
						<form.icon size={18} />
					</div>
					<span class="card-label">{$_(form.label)}</span>
					<div class="custom-checkbox">
						{#if selectedForms.includes(form.id)}
							<div class="check-inner"></div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.filters-outer-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.25rem;
		background: rgba(255, 255, 255, 0.02);
		backdrop-filter: blur(12px);
		border-radius: 24px;
		margin-bottom: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
	}

	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-left: 0.25rem;
		color: var(--text-secondary);
	}

	.header-icon {
		opacity: 0.6;
	}

	.section-label {
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	/* Segmented Control Styles */
	.segmented-control {
		display: flex;
		background: rgba(0, 0, 0, 0.2);
		padding: 0.25rem;
		border-radius: 14px;
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.segment-btn {
		flex: 1;
		padding: 0.6rem;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		position: relative;
		z-index: 1;
		transition: color 0.3s;
		border-radius: 10px;
	}

	.segment-btn.active {
		color: white;
	}

	.segment-btn.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.selection-slider {
		position: absolute;
		top: 0.25rem;
		bottom: 0.25rem;
		left: 0.25rem;
		width: calc(33.33% - 0.25rem);
		background: var(--accent);
		border-radius: 10px;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 8px rgba(58, 143, 214, 0.4);
	}

	.selection-slider.pos-1 {
		transform: translateX(0);
	}

	.selection-slider.pos-3 {
		transform: translateX(100%);
	}

	.selection-slider.pos-many {
		transform: translateX(200%);
	}

	/* Modern Form Cards */
	.forms-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.modern-form-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem 0.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 18px;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		overflow: hidden;
	}

	.modern-form-card:hover {
		background: rgba(255, 255, 255, 0.07);
		transform: translateY(-2px);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.modern-form-card.selected {
		background: rgba(58, 143, 214, 0.1);
		border-color: var(--accent);
		box-shadow: 0 4px 15px rgba(58, 143, 214, 0.15);
	}

	.card-icon-box {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.05);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		transition: all 0.3s;
	}

	.modern-form-card.selected .card-icon-box {
		background: var(--accent);
		color: white;
		transform: scale(1.1);
	}

	.card-label {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-primary);
		text-align: center;
		line-height: 1.1;
	}

	.custom-checkbox {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		width: 14px;
		height: 14px;
		border-radius: 4px;
		border: 1.5px solid rgba(255, 255, 255, 0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.modern-form-card.selected .custom-checkbox {
		background: var(--accent);
		border-color: var(--accent);
	}

	.check-inner {
		width: 6px;
		height: 6px;
		background: white;
		border-radius: 1px;
	}

	@media (max-width: 480px) {
		.forms-grid {
			grid-template-columns: 1fr;
		}
		
		.modern-form-card {
			flex-direction: row;
			justify-content: flex-start;
			padding: 0.8rem 1rem;
			gap: 1.25rem;
		}

		.card-label {
			font-size: 0.9rem;
			text-align: left;
		}
		
		.card-icon-box {
			width: 32px;
			height: 32px;
		}
	}
</style>
