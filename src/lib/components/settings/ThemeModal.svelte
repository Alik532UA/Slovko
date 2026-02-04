<script lang="ts">
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import type { AppTheme } from "$lib/types";
	import { Check } from "lucide-svelte";
	import { _ } from "svelte-i18n";

	let { onclose }: { onclose: () => void } = $props();

	const themes: { id: AppTheme; color: string }[] = [
		{ id: "dark-gray", color: "#1a1a2e" },
		{ id: "light-gray", color: "#f5f6fa" },
		{ id: "orange", color: "linear-gradient(135deg, #77216f, #e95420)" },
		{ id: "green", color: "#b2f7b8" },
	];

	function selectTheme(theme: AppTheme) {
		settingsStore.setTheme(theme);
	}
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
	<div
		class="modal"
		data-testid="theme-modal"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<div class="modal-header">
			<h2>{$_("settings.theme") || "Theme"}</h2>
		</div>

		<div class="themes-grid">
			{#each themes as theme (theme.id)}
				<button
					class="theme-card"
					class:selected={settingsStore.value.theme === theme.id}
					onclick={() => selectTheme(theme.id)}
					style="--theme-preview-bg: {theme.color}"
					data-testid="theme-card-{theme.id}"
				>
					<div class="theme-preview">
						{#if settingsStore.value.theme === theme.id}
							<div class="check-icon">
								<Check
									size={24}
									color={theme.id === "light-gray" || theme.id === "green"
										? "#000"
										: "#fff"}
								/>
							</div>
						{/if}
					</div>
					<span class="theme-name">{$_(`theme.${theme.id}`)}</span>
				</button>
			{/each}
		</div>

		<div class="modal-footer">
			<button
				class="confirm-btn"
				onclick={onclose}
				data-testid="confirm-theme-btn"
			>
				{$_("common.confirm")}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-footer {
		display: flex;
		justify-content: center;
		margin-top: 1.5rem;
	}

	.confirm-btn {
		padding: 0.8rem 2.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition:
			transform 0.2s,
			background 0.2s;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.confirm-btn:hover {
		background: var(--accent-hover);
		transform: translateY(-2px);
	}

	.confirm-btn:active {
		transform: scale(0.98);
	}

	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		flex-direction: column; /* Ensure vertical layout */
		/* justify-content: center; - Removed to fix scroll clipping */
		align-items: center;
		z-index: 1000;
		backdrop-filter: blur(5px);
		transition: background 0.3s;
		overflow-y: auto; /* Enable scroll */
		padding: 1.5rem 0; /* Vertical padding */
	}

	/* Light theme override for backdrop */
	:global([data-theme="light-gray"]) .modal-backdrop,
	:global([data-theme="green"]) .modal-backdrop {
		background: rgba(255, 255, 255, 0.9);
	}

	.modal {
		background: transparent;
		width: 100%;
		max-width: 500px;
		position: relative;
		color: var(--text-primary);
		padding: 0 1rem;
		margin: auto; /* Center vertically if space exists */
	}

	.modal-header {
		display: flex;
		justify-content: center; /* Center the title */
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: var(--text-primary);
	}

	.themes-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.theme-card {
		background: var(--bg-primary);
		border: 2px solid var(--border);
		border-radius: 12px;
		padding: 1rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		transition:
			transform 0.2s,
			border-color 0.2s;
	}

	.theme-card:hover {
		transform: scale(1.02);
		border-color: var(--text-secondary);
	}

	.theme-card.selected {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px var(--accent);
	}

	.theme-preview {
		width: 100%;
		height: 60px;
		border-radius: 8px;
		background: var(--theme-preview-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.theme-name {
		color: var(--text-primary);
		font-weight: 500;
		font-size: 0.9rem;
	}

	.check-icon {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 50%;
		padding: 4px;
		display: flex;
	}
</style>
