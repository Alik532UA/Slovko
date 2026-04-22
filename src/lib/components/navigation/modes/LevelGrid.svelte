<script lang="ts">
	import { _ } from "svelte-i18n";
	import { ALL_LEVELS, type CEFRLevel } from "$lib/types/index";
	import { APP_ICONS } from "$lib/config/icons";
	import { Check, Plus, Minus } from "lucide-svelte";

	interface Props {
		mode: "levels" | "phrases";
		selectedIds: string[];
		onchange: (id: string, action: "add" | "remove" | "clear") => void;
	}

	let { mode, selectedIds, onchange }: Props = $props();
</script>

<div class="grid safe-scale-grid" data-testid="{mode}-grid">
	{#each ALL_LEVELS as level (level)}
		{@const count = selectedIds.filter((id) => id === level).length}
		<div class="level-wrapper">
			<button
				class="item"
				class:selected={count > 0}
				onclick={() => {
					if (count === 0) onchange(level, "add");
					else onchange(level, "clear");
				}}
				data-testid="{mode}-item-{level}"
			>
				<div class="check-indicator">
					{#if count > 0}
						<Check size={16} />
					{/if}
				</div>
				{#if mode === "phrases"}
					<div class="item-icon">
						<APP_ICONS.MessageSquare size={24} />
					</div>
				{/if}
				<span class="item-title">{level}</span>
				<span class="item-desc">{$_(`levels.${level}`)}</span>
			</button>
			{#if count > 0}
				<div
					class="multiplier-controls"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
					role="group"
				>
					<button class="ctrl-btn" onclick={() => onchange(level, "remove")}>
						<Minus size={14} />
					</button>
					<span class="count-badge">x{count}</span>
					<button class="ctrl-btn" onclick={() => onchange(level, "add")} disabled={count >= 5}>
						<Plus size={14} />
					</button>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 0.75rem;
	}

	.level-wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 100%;
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
		flex: 1;
		position: relative;
	}

	.check-indicator {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid var(--card-border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: transparent;
		transition: all 0.2s;
	}

	.item.selected .check-indicator {
		background: var(--accent);
		border-color: var(--accent);
		color: white;
	}

	.item:hover {
		border-color: var(--card-hover-border);
		transform: scale(var(--hover-scale));
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
		z-index: 2;
	}

	.item:active {
		transform: scale(var(--active-scale));
	}

	.item.selected {
		background: var(--selected-bg);
		border-color: var(--selected-border);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
		text-align: center;
	}

	.item-icon {
		margin-bottom: 0.5rem;
		color: var(--accent);
	}

	.multiplier-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		border-radius: 12px;
		padding: 0.25rem;
		margin-top: auto;
	}

	.ctrl-btn {
		background: var(--bg-primary);
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 8px;
		transition: all 0.2s;
	}

	.ctrl-btn:hover:not(:disabled) {
		background: var(--accent);
		color: white;
	}

	.ctrl-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.count-badge {
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--text-primary);
		min-width: 1.5rem;
		text-align: center;
	}
</style>
