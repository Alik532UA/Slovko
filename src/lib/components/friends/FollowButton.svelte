<script lang="ts">
	import { _ } from "svelte-i18n";
	import { UserPlus, UserCheck, Loader2, Users } from "lucide-svelte";
	import { FriendsService } from "$lib/firebase/FriendsService";
	import { logService } from "$lib/services/logService.svelte";
	import { friendsStore } from "$lib/stores/friendsStore.svelte";

	interface Props {
		uid: string;
		displayName?: string;
		photoURL?: string | null;
		variant?: "standard" | "compact";
		onchange?: () => void;
	}

	let { 
		uid, 
		displayName = "User", 
		photoURL = null,
		variant = "standard",
		onchange
	}: Props = $props();

	let isProcessing = $state(false);
	
	// Використовуємо реактивні стани зі стору
	let isFollowing = $derived(friendsStore.isFollowing(uid));
	let isFollower = $derived(friendsStore.isFollower(uid));
	let isMutual = $derived(friendsStore.isMutual(uid));

	async function handleToggle() {
		if (isProcessing) return;
		
		if (isFollowing) {
			if (!confirm($_("friends.confirmUnfollow"))) return;
		}

		isProcessing = true;
		try {
			let success = false;
			if (isFollowing) {
				success = await FriendsService.unfollow(uid);
			} else {
				success = await FriendsService.follow(uid, {
					displayName,
					photoURL
				});
			}

			if (success) {
				// Оновлюємо стор після успішної дії
				await friendsStore.refreshAll();
				onchange?.();
			}
		} catch (e) {
			logService.error("sync", "Follow toggle failed", e);
		} finally {
			isProcessing = false;
		}
	}
</script>

<div class="button-wrapper" class:compact={variant === "compact"}>
	{#if isMutual && variant === "standard"}
		<div class="mutual-tag" title={$_("friends.mutual")}>
			<Users size={12} />
			<span>{$_("friends.mutual")}</span>
		</div>
	{/if}

	<button
		class="action-btn"
		class:following={isFollowing}
		class:follow-back={!isFollowing && isFollower}
		class:unfollow={isFollowing && variant === "standard"}
		disabled={isProcessing}
		onclick={handleToggle}
		title={isFollowing ? $_("friends.unfollow") : (isFollower ? $_("friends.followBack") : $_("friends.follow"))}
		data-testid="follow-btn-{uid}"
	>
		{#if isProcessing}
			<Loader2 size={18} class="spinner" />
		{:else if isFollowing}
			<UserCheck size={18} />
		{:else if isFollower}
			<UserPlus size={18} class="pulse" />
		{:else}
			<UserPlus size={18} />
		{/if}
	</button>
</div>

<style>
	.button-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.mutual-tag {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--status-success);
		background: var(--status-success-bg);
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.02em;
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
		background: var(--status-success-bg);
		color: var(--status-success);
	}

	.action-btn.follow-back {
		background: var(--selected-bg);
		color: var(--accent);
		border: 1px solid var(--selected-bg);
	}

	.action-btn.unfollow:hover:not(:disabled) {
		background: var(--status-danger-bg);
		color: var(--status-danger);
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	:global(.spinner) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
