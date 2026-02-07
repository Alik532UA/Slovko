<script lang="ts">
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import type { AppTheme } from "$lib/types";
	import { Check } from "lucide-svelte";
	import { _ } from "svelte-i18n";
	import BaseModal from "../ui/BaseModal.svelte";

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

<BaseModal {onclose} testid="theme-modal" maxWidth="480px">
	<div class="modal-inner">
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
				class="confirm-btn primary-action-btn"
				onclick={onclose}
				data-testid="confirm-theme-btn"
			>
				{$_("common.confirm")}
			</button>
		</div>
	</div>
</BaseModal>

<style>
	.modal-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.modal-header {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.themes-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.theme-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 1rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.theme-card:hover {
		transform: translateY(-3px);
		border-color: var(--text-secondary);
		background: var(--border);
	}

	.theme-card.selected {
		background: var(--selected-bg);
		border-color: var(--selected-border);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.theme-preview {
		width: 100%;
		height: 64px;
		border-radius: 10px;
		background: var(--theme-preview-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.theme-name {
		color: var(--text-primary);
		font-weight: 600;
		font-size: 0.95rem;
	}

	.check-icon {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 50%;
		padding: 4px;
		display: flex;
	}

	.modal-footer {
		display: flex;
		justify-content: center;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.confirm-btn {
		width: 100%;
		max-width: 300px;
	}
</style>