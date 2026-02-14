<script lang="ts">
	import { _ } from "svelte-i18n";
	import { ALL_TENSES } from "$lib/types";
	import { APP_ICONS } from "$lib/config/icons";
	import { Check } from "lucide-svelte";

	interface Props {
		selectedIds: string[];
		onselect: (tenseId: string) => void;
	}

	let { selectedIds, onselect }: Props = $props();
</script>

<div class="grid tenses-grid" data-testid="tenses-grid">
	{#each ALL_TENSES as tense (tense.id)}
		{@const Icon = (APP_ICONS as any)[tense.icon]}
		<button
			class="item tense-item"
			class:selected={selectedIds.includes(tense.id)}
			onclick={() => onselect(tense.id)}
			data-testid="tense-item-{tense.id}"
		>
			<span class="item-icon group-{tense.group}">
				{#if Icon}
					<Icon size={24} />
				{:else}
					?
				{/if}
			</span>
			<div class="item-info">
				<span class="item-title">{$_(`tenses.${tense.id}`)}</span>
				<span class="item-group">{$_(`tenses.groups.${tense.group}`)}</span>
			</div>
			
			<div class="check-indicator">
				{#if selectedIds.includes(tense.id)}
					<Check size={16} />
				{/if}
			</div>
		</button>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		gap: 0.75rem;
	}

	.tenses-grid {
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	}

	.item {
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--card-bg);
		border: 2px solid var(--card-border);
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		min-height: 80px;
		gap: 1rem;
		text-align: left;
		position: relative;
	}

	.check-indicator {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid var(--card-border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: transparent;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.item.selected .check-indicator {
		background: var(--accent);
		border-color: var(--accent);
		color: white;
	}

	.item:hover {
		border-color: var(--card-hover-border);
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
	}

	.item.selected {
		background: var(--selected-bg);
		border-color: var(--selected-border);
	}

	.item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		background: var(--bg-secondary);
		flex-shrink: 0;
	}

	.item-icon.group-present { color: #2ecc71; }
	.item-icon.group-past { color: #3498db; }
	.item-icon.group-future { color: #f1c40f; }

	.item-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 0.15rem;
	}

	.item-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.item-group {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
