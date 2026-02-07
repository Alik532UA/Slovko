<script lang="ts">
	import { _ } from "svelte-i18n";
	import { ALL_TOPICS } from "$lib/types";
	import { APP_ICONS } from "$lib/config/icons";
	import { Check } from "lucide-svelte";

	interface Props {
		selectedIds: string[];
		onselect: (topicId: string) => void;
	}

	let { selectedIds, onselect }: Props = $props();
</script>

<div class="grid topics-grid">
	{#each ALL_TOPICS as topic (topic.id)}
		{@const Icon = (APP_ICONS as any)[topic.icon]}
		<button
			class="item topic-item"
			class:selected={selectedIds.includes(topic.id)}
			onclick={() => onselect(topic.id)}
			data-testid="topic-item-{topic.id}"
		>
			<span class="item-icon">
				{#if Icon}
					<Icon size={24} />
				{:else}
					?
				{/if}
			</span>
			<span class="item-title">{$_(`topics.${topic.id}`)}</span>
			
			<div class="check-indicator">
				{#if selectedIds.includes(topic.id)}
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

	.topics-grid {
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
		min-height: 72px;
		gap: 0.75rem;
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
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent);
		flex-shrink: 0;
	}

	.item-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.25;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
</style>
