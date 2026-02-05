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
	import ErrorBoundary from "../ui/ErrorBoundary.svelte";
	import UserAvatar from "./UserAvatar.svelte";
	import FollowButton from "./FollowButton.svelte";

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
		if (activeTab || shouldRefresh) {
			loadList();
		}
	});

	async function loadList() {
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
		{#if isLoading}
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
			<div class="friends-list" data-testid="friends-list-items">
				{#each list as user (user.uid)}
														<div class="friend-card" data-testid="friend-card-{user.uid}">
																	<UserAvatar uid={user.uid} photoURL={user.photoURL} displayName={user.displayName} size={24} />
					
																	<div class="friend-info">
					
							<span class="display-name">{user.displayName || "User"}</span>
						</div>

						<div class="friend-actions">
							<FollowButton
								uid={user.uid}
								displayName={user.displayName}
								photoURL={user.photoURL}
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
