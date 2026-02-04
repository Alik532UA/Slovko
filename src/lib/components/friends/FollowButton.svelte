<script lang="ts">
	import { _ } from "svelte-i18n";
	import { UserPlus, UserCheck, Loader2 } from "lucide-svelte";
	import { FriendsService } from "$lib/firebase/FriendsService";
	import { logService } from "$lib/services/logService";

	interface Props {
		uid: string;
		isFollowing: boolean;
		isMutual?: boolean;
		displayName?: string;
		photoURL?: string | null;
		onStatusChange?: (newStatus: boolean) => void;
		variant?: "standard" | "compact";
	}

	let { 
		uid, 
		isFollowing, 
		isMutual = false, 
		displayName = "User", 
		photoURL = null,
		onStatusChange,
		variant = "standard"
	}: Props = $props();

	let isProcessing = $state(false);

	async function handleToggle() {
		if (isProcessing) return;
		
		// If it's a "following" tab (isFollowing is true), we usually want to unfollow.
		// If it's a "followers" tab and isFollowing is false, we want to follow back.
		
		if (isFollowing) {
			if (!confirm($_("friends.confirmUnfollow"))) return;
		}

		isProcessing = true;
		try {
			let success = false;
			if (isFollowing) {
				success = await FriendsService.unfollow(uid);
			} else {
				// Use known profile data as fallback for Follow Back
				success = await FriendsService.follow(uid, {
					displayName,
					photoURL
				});
			}

			if (success) {
				onStatusChange?.(!isFollowing);
			}
		} catch (e) {
			logService.error("sync", "Follow toggle failed", e);
		} finally {
			isProcessing = false;
		}
	}
</script>

<div class="button-wrapper" class:compact={variant === "compact"}>
	{#if !isFollowing && isMutual}
		<div class="mutual-badge" title={$_("friends.mutual")}>
			<UserCheck size={14} />
			<span>{$_("friends.mutual")}</span>
		</div>
	{:else}
		<button
			class="action-btn"
			class:following={isFollowing}
			class:unfollow={isFollowing && variant === "standard"}
			disabled={isProcessing}
			onclick={handleToggle}
			title={isFollowing ? $_("friends.unfollow") : $_("friends.followBack")}
			data-testid="follow-btn-{uid}"
		>
			{#if isProcessing}
				<Loader2 size={18} class="spinner" />
			{:else if isFollowing}
				<UserCheck size={18} />
			{:else}
				<UserPlus size={18} />
			{/if}
		</button>
	{/if}
</div>

<style>
	.button-wrapper {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.action-btn {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		background: var(--bg-secondary);
		color: var(--text-secondary);
	}

	.action-btn:hover:not(:disabled) {
		background: var(--accent);
		color: white;
	}

	.action-btn.following {
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}

	/* Specific style for "unfollow" intent in following list */
	.action-btn.unfollow:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.mutual-badge {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: #22c55e;
		background: rgba(34, 197, 94, 0.1);
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
	}

	:global(.spinner) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
