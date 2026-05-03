<script lang="ts">
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import type { AppTheme } from "$lib/types/index";
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

	function setBgType(type: "solid" | "image") {
		settingsStore.setBgType(type);
	}

	function setBgBlur(blur: "blurred" | "sharp") {
		settingsStore.setBgBlur(blur);
	}
</script>

<BaseModal {onclose} testid="theme-modal" maxWidth="480px">
	<div class="modal-inner">
		<div class="modal-header">
			<h2>{$_("settings.theme") || "Theme"}</h2>
		</div>

		<div class="themes-grid" role="group" aria-label={$_("settings.theme") || "Select theme"}>
			{#each themes as theme (theme.id)}
				<button
					class="theme-card"
					class:selected={settingsStore.value.theme === theme.id}
					onclick={() => selectTheme(theme.id)}
					aria-pressed={settingsStore.value.theme === theme.id}
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

		<div class="settings-section">
			<h3>{$_("settings.background") || "Background"}</h3>
			<div class="segmented-control horizontal">
				<button
					class:active={settingsStore.value.bgType === "solid"}
					onclick={() => setBgType("solid")}
				>
					{$_("settings.bg_solid") || "Solid"}
				</button>
				<button
					class:active={settingsStore.value.bgType === "image"}
					onclick={() => setBgType("image")}
				>
					{$_("settings.bg_image") || "Image"}
				</button>
			</div>
		</div>

		{#if settingsStore.value.bgType === "image"}
			<div class="settings-section">
				<h3>{$_("settings.image_style") || "Image Style"}</h3>
				<div class="segmented-control horizontal">
					<button
						class:active={settingsStore.value.bgBlur === "blurred"}
						onclick={() => setBgBlur("blurred")}
					>
						{$_("settings.bg_blurred") || "Blurred"}
					</button>
					<button
						class:active={settingsStore.value.bgBlur === "sharp"}
						onclick={() => setBgBlur("sharp")}
					>
						{$_("settings.bg_sharp") || "Sharp"}
					</button>
				</div>
			</div>
		{/if}

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
		margin-bottom: 1.5rem;
	}

	.settings-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.settings-section h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	/* Segmented Control Styles */
	.segmented-control {
		display: flex;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 4px;
		gap: 4px;
	}

	.segmented-control button {
		flex: 1;
		padding: 0.6rem;
		border-radius: 8px;
		font-weight: 500;
		color: var(--text-secondary);
		transition: all 0.2s ease;
	}

	.segmented-control button.active {
		background: var(--accent);
		color: white;
		box-shadow: var(--shadow-sm);
	}

	.segmented-control button:hover:not(.active) {
		background: var(--bg-hover);
		color: var(--text-primary);
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
		transition: all var(--hover-transition);
	}

	.theme-card:hover {
		transform: scale(var(--hover-scale));
		border-color: var(--text-secondary);
		background: var(--border);
		z-index: 2;
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