<script lang="ts">
	import { _ } from "svelte-i18n";
	import type { TenseForm } from "$lib/types";
	import { Plus, Minus, HelpCircle, Layers, LayoutGrid } from "lucide-svelte";
	import SegmentedControl from "../../ui/SegmentedControl.svelte";

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
		<SegmentedControl 
			options={[
				{ id: '1', label: 'tenses.qty1', testId: 'tense-qty-1' },
				{ id: '3', label: 'tenses.qty3', testId: 'tense-qty-3' },
				{ id: 'many', label: 'tenses.qtyMany', testId: 'tense-qty-many', disabled: true, title: 'tenses.underConstruction' }
			]}
			value={quantity}
			onchange={(id) => onChangeQuantity(id as any)}
			testid="tense-quantity-radio-group"
		/>
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
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 18px;
		cursor: pointer;
		transition: all var(--hover-transition);
		position: relative;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.modern-form-card:hover {
		background: rgba(255, 255, 255, 0.06);
		transform: scale(var(--hover-scale));
		border-color: rgba(255, 255, 255, 0.1);
		z-index: 2;
	}

	.modern-form-card.selected {
		background: rgba(var(--accent-rgb), 0.1);
		border: 1px solid rgba(var(--accent-rgb), 0.2);
		box-shadow: 0 6px 20px rgba(var(--accent-rgb), 0.1);
		padding: 1rem 0.5rem;
	}

	.card-icon-box {
		width: 38px;
		height: 38px;
		border-radius: 11px;
		background: rgba(255, 255, 255, 0.04);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.modern-form-card.selected .card-icon-box {
		background: var(--accent);
		color: white;
		transform: scale(1.1);
		box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.3);
	}

	.card-label {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
		text-align: center;
		line-height: 1.1;
		transition: all 0.3s;
	}

	.modern-form-card.selected .card-label {
		font-weight: 800;
		color: white;
	}

	.custom-checkbox {
		position: absolute;
		top: 0.7rem;
		right: 0.7rem;
		width: 16px;
		height: 16px;
		border-radius: 5px;
		border: 1.5px solid rgba(255, 255, 255, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.modern-form-card.selected .custom-checkbox {
		background: var(--accent);
		border: none;
		box-shadow: 0 2px 6px rgba(var(--accent-rgb), 0.4);
	}

	.check-inner {
		width: 7px;
		height: 7px;
		background: white;
		border-radius: 1.5px;
	}

	@media (max-width: 480px) {
		.forms-grid {
			grid-template-columns: 1fr;
		}
		
		.modern-form-card {
			flex-direction: row;
			justify-content: flex-start;
			padding: 0.85rem 1rem;
			gap: 1.25rem;
		}

		.modern-form-card.selected {
			padding: calc(0.85rem + 1px) calc(1rem + 1px);
		}

		.card-label {
			font-size: 0.95rem;
			text-align: left;
		}
		
		.card-icon-box {
			width: 34px;
			height: 34px;
		}
	}
</style>
