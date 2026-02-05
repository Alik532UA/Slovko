<script lang="ts">
	import { _ } from "svelte-i18n";
	import {
		FriendsService,
		type FollowRecord,
	} from "$lib/firebase/FriendsService";
	import {
		Users,
		Loader2,
	} from "lucide-svelte";
	import { logService } from "$lib/services/logService";
	import { friendsStore } from "$lib/stores/friendsStore.svelte";
	import ErrorBoundary from "../ui/ErrorBoundary.svelte";
	import UserAvatar from "./UserAvatar.svelte";
	import FollowButton from "./FollowButton.svelte";

	import { untrack } from "svelte";

	interface Props {
		activeTab: "following" | "followers";
		shouldRefresh: boolean; // Trigger refresh from parent
	}
	let { activeTab = "following", shouldRefresh }: Props = $props();

	let list = $state<FollowRecord[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Watch for tab change or refresh trigger
	$effect(() => {
		// We want to react to tab change OR refresh trigger
		const tab = activeTab;
		const refresh = shouldRefresh;
		
		untrack(() => {
			loadList();
		});
	});

	async function loadList() {
		if (isLoading) return; // Prevent concurrent loads
		isLoading = true;
		error = null;
		try {
			if (activeTab === "following") {
				list = await FriendsService.getFollowing();
			} else {
				list = await FriendsService.getFollowers();
			}
		} catch (e) {
			logService.error("sync", "Failed to load friends list", e);
			error = $_("friends.loadError");
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="list-container" data-testid="friends-list-root">
	<ErrorBoundary compact>
		{#if isLoading && list.length === 0}
			<div class="loading-state" data-testid="friends-loading">
				<div class="spinner">
					<Loader2 size={32} />
				</div>
			</div>
		{:else if error}
			<div class="error-state" data-testid="friends-error">
				<p>{error}</p>
				<button
					onclick={loadList}
					class="retry-btn"
					data-testid="friends-retry-btn"
				>
					{$_("common.retry")}
				</button>
			</div>
		{:else if list.length === 0}
			<div class="empty-state" data-testid="friends-empty">
				<div class="empty-icon-wrapper">
					<Users size={48} />
				</div>
				<p>
					{activeTab === "following"
						? $_("friends.noFollowing")
						: $_("friends.noFollowers")}
				</p>
			</div>
		{:else}
			{#if isLoading}
				<div class="loading-overlay">
					<div class="spinner small">
						<Loader2 size={24} />
					</div>
				</div>
			{/if}
			<div class="friends-list" class:faded={isLoading} data-testid="friends-list-items">
				{#each list as user (user.uid)}
					{@const actualName = friendsStore.resolveName(user.uid, user.displayName)}
					{@const actualPhoto = friendsStore.resolvePhoto(user.uid, user.photoURL)}

					<div class="friend-card" data-testid="friend-card-{user.uid}">
						<UserAvatar
							uid={user.uid}
							photoURL={actualPhoto}
							displayName={actualName}
							size={24}
						/>

						<div class="friend-info">
							<span class="display-name">{actualName}</span>
						</div>

						<div class="friend-actions">
							<FollowButton
								uid={user.uid}
								displayName={actualName}
								photoURL={actualPhoto}
							/>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</ErrorBoundary>
</div>

<style>
	.list-container {
		position: relative;
		min-height: 200px;
	}

	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 40px;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 10;
		pointer-events: none;
	}

	.friends-list.faded {
		opacity: 0.6;
		pointer-events: none;
	}

	.spinner.small {
		color: var(--accent);
		animation: spin 1s linear infinite;
	}

	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		gap: 1rem;
		text-align: center;
		color: var(--text-secondary);
	}

	.spinner {
		animation: spin 1s linear infinite;
		color: var(--accent);
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.empty-icon-wrapper {
		opacity: 0.3;
		margin-bottom: 0.5rem;
		display: flex;
		justify-content: center;
	}

	.friends-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.friend-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
		transition: background 0.2s;
	}

	.friend-card:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.friend-info {
		flex: 1;
		overflow: hidden;
	}

	.display-name {
		font-weight: 600;
		font-size: 0.95rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-primary);
	}

	.friend-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		min-width: 40px;
	}

	.retry-btn {
		padding: 0.5rem 1rem;
		background: var(--bg-secondary);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		color: var(--text-primary);
	}

	.retry-btn:hover {
		background: var(--border);
	}
</style>
