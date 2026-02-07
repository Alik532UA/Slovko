<script lang="ts">
	import { Save, Shield } from "lucide-svelte";
	import { _ } from "svelte-i18n";
	import { FriendsService } from "$lib/firebase/FriendsService";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import { onMount } from "svelte";
	import type { UserPrivacySettings } from "$lib/types";
	import Toggle from "$lib/components/ui/Toggle.svelte";
	import BaseModal from "$lib/components/ui/BaseModal.svelte";

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
</script>

<BaseModal {onclose} testid="friends-settings-modal" maxWidth="500px">
	<div class="modal-inner">
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
				class="save-btn primary-action-btn"
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
</BaseModal>

<style>
	.modal-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
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
		font-weight: 600;
	}

	.modal-header h2 :global(.icon) {
		color: var(--accent);
	}

	.subtitle {
		margin: 0.5rem 0 0;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.modal-body {
		overflow-y: auto;
		padding: 0.25rem;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.settings-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-bottom: 1rem;
	}

	.setting-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 16px;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.setting-item:hover {
		transform: translateY(-2px);
		border-color: var(--text-secondary);
		background: var(--border);
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
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.save-btn {
		width: 100%;
		max-width: 300px;
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