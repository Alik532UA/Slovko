<script lang="ts">
	import { _ } from "svelte-i18n";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { ALL_LEVELS, type CEFRLevel } from "$lib/types";
	import { APP_ICONS } from "$lib/config/icons";

	interface Props {
		mode: "levels" | "phrases";
		onselect: (level: CEFRLevel) => void;
	}

	let { mode, onselect }: Props = $props();
</script>

<div class="grid">
	{#each ALL_LEVELS as level (level)}
		<button
			class="item"
			class:selected={settingsStore.value.mode === mode && settingsStore.value.currentLevel === level}
			onclick={() => onselect(level)}
			data-testid="{mode}-item-{level}"
		>
			{#if mode === "phrases"}
				<div class="item-icon">
					<APP_ICONS.MessageSquare size={24} />
				</div>
			{/if}
			<span class="item-title">{level}</span>
			<span class="item-desc">{$_(`levels.${level}`)}</span>
		</button>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 0.75rem;
	}

	.item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem 0.75rem;
		background: var(--card-bg);
		border: 2px solid var(--card-border);
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		height: 100%;
	}

	.item:hover {
		border-color: var(--card-hover-border);
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
	}

	.item.selected {
		background: var(--selected-bg);
		border-color: var(--selected-border);
		box-shadow: 0 0 0 2px var(--selected-border);
	}

	.item-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.25;
	}

	.item-desc {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}

	.item-icon {
		margin-bottom: 0.5rem;
		color: var(--accent);
	}
</style>
