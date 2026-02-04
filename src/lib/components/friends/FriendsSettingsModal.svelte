<script lang="ts">
	import { Save, Shield } from "lucide-svelte";
	import { _ } from "svelte-i18n";
	import { FriendsService } from "$lib/firebase/FriendsService";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import { onMount } from "svelte";
	import type { UserPrivacySettings } from "$lib/types";
	import Toggle from "$lib/components/ui/Toggle.svelte";

	let { onclose }: { onclose: () => void } = $props();

	let isLoading = $state(false);
	let isSaving = $state(false);

	// Default settings
	let settings = $state<UserPrivacySettings>({
		showInSearch: true,
		allowFriendRequests: true,
		shareStats: true,
	});

	onMount(async () => {
		if (authStore.uid) {
			isLoading = true;
			try {
				const profile = await FriendsService.getUserProfile(authStore.uid);
				if (profile?.privacy) {
					settings = { ...settings, ...profile.privacy };
				}
			} catch (error) {
				console.error("Failed to load privacy settings:", error);
			} finally {
				isLoading = false;
			}
		}
	});

	async function handleSave() {
		if (!authStore.uid) return;

		isSaving = true;
		try {
			const success = await FriendsService.updatePrivacySettings(settings);
			if (success) {
				onclose();
			}
		} catch (error) {
			console.error("Failed to save privacy settings:", error);
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}
</script>

<div
	class="modal-backdrop"
	onclick={onclose}
	role="presentation"
	onkeydown={handleKeydown}
>
	<div
		class="modal"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		data-testid="friends-settings-modal"
	>
		<div class="modal-header">
			<h2>
				<Shield size={24} class="icon" />
				{$_("settings.privacyTitle", { default: "Privacy Settings" })}
			</h2>
			<p class="subtitle">
				{$_("settings.privacySubtitle", {
					default: "Manage who can see you and interact with you",
				})}
			</p>
		</div>

		<div class="modal-body">
			{#if isLoading}
				<div class="loading">
					<div class="spinner"></div>
				</div>
			{:else}
				<div class="settings-list">
					<div class="setting-item">
						<div class="setting-info">
							<span class="setting-label"
								>{$_("settings.showInSearch", {
									default: "Show me in search",
								})}</span
							>
							<span class="setting-desc"
								>{$_("settings.showInSearchDesc", {
									default: "Allow other users to find you by email or name",
								})}</span
							>
						</div>
						<Toggle bind:checked={settings.showInSearch} />
					</div>

					<div class="setting-item">
						<div class="setting-info">
							<span class="setting-label"
								>{$_("settings.allowFriendRequests", {
									default: "Allow friend requests",
								})}</span
							>
							<span class="setting-desc"
								>{$_("settings.allowFriendRequestsDesc", {
									default: "Allow others to send you friend requests",
								})}</span
							>
						</div>
						<Toggle bind:checked={settings.allowFriendRequests} />
					</div>

					<div class="setting-item">
						<div class="setting-info">
							<span class="setting-label"
								>{$_("settings.shareStats", {
									default: "Share statistics",
								})}</span
							>
							<span class="setting-desc"
								>{$_("settings.shareStatsDesc", {
									default: "Allow friends to see your learning progress",
								})}</span
							>
						</div>
						<Toggle bind:checked={settings.shareStats} />
					</div>
				</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button
				class="save-btn"
				onclick={handleSave}
				disabled={isSaving || isLoading}
			>
				{#if isSaving}
					<div class="spinner small"></div>
				{:else}
					<Save size={20} />
					{$_("common.save", { default: "Save Changes" })}
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(8px);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 10002;
		padding: 1rem;
		animation: fadeIn 0.3s ease-out;
	}

	/* Light theme override for backdrop */
	:global([data-theme="light-gray"]) .modal-backdrop,
	:global([data-theme="green"]) .modal-backdrop {
		background: rgba(255, 255, 255, 0.9);
	}

	.modal {
		background: transparent; /* Transparent container */
		width: 100%;
		max-width: 500px;
		position: relative;
		color: var(--text-primary);
		display: flex;
		flex-direction: column;
		max-height: 85vh;
		animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.modal-header {
		text-align: center;
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--text-primary);
	}

	.icon {
		color: var(--accent);
	}

	.subtitle {
		margin: 0.5rem 0 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.modal-body {
		overflow-y: auto;
		padding: 0 4px; /* Slight padding for focus rings/shadows */
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.settings-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1rem;
	}

	.setting-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		background: var(--bg-primary); /* Card background */
		border: 2px solid var(--border);
		border-radius: 16px;
		transition:
			transform 0.2s,
			border-color 0.2s;
	}

	.setting-item:hover {
		transform: translateY(-2px);
		border-color: var(--text-secondary);
	}

	.setting-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.setting-label {
		font-weight: 600;
		color: var(--text-primary);
		font-size: 1rem;
	}

	.setting-desc {
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	.modal-footer {
		display: flex;
		justify-content: center;
		margin-top: 1rem;
	}

	.save-btn {
		background: var(--accent);
		border: none;
		color: white;
		padding: 0.8rem 2.5rem;
		border-radius: 12px;
		font-weight: 600;
		font-size: 1.1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.save-btn:hover:not(:disabled) {
		background: var(--accent-hover);
		transform: translateY(-2px);
	}

	.save-btn:active {
		transform: scale(0.98);
	}

	.save-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes scaleUp {
		from {
			transform: scale(0.95);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.loading {
		display: flex;
		justify-content: center;
		padding: 2rem;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.spinner.small {
		width: 20px;
		height: 20px;
		border-width: 2px;
		border-top-color: white;
		border-right-color: rgba(255, 255, 255, 0.3);
		border-bottom-color: rgba(255, 255, 255, 0.3);
		border-left-color: rgba(255, 255, 255, 0.3);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
