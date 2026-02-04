<script lang="ts">
	import { _ } from "svelte-i18n";
	import {
		FriendsService,
		type FollowRecord,
	} from "$lib/firebase/FriendsService";
	import {
		Users,
		UserPlus,
		UserCheck,
		Loader2,
		User as UserIcon,
		UserMinus,
	} from "lucide-svelte";
	import { logService } from "$lib/services/logService";
	import {
		Cat,
		Dog,
		Rabbit,
		Bird,
		Fish,
		Snail,
		Turtle,
		Bug,
		Smile,
		Star,
		Heart,
		Zap,
		Target,
	} from "lucide-svelte";
	import ErrorBoundary from "../ui/ErrorBoundary.svelte";

	interface Props {
		activeTab: "following" | "followers";
		shouldRefresh: boolean; // Trigger refresh from parent
	}
	let { activeTab = "following", shouldRefresh }: Props = $props();

	let list = $state<FollowRecord[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let followingMap = $state<Record<string, boolean>>({});

	// Watch for tab change or refresh trigger
	$effect(() => {
		const controller = new AbortController();
		if (activeTab || shouldRefresh) {
			loadList();
		}
		return () => {
			controller.abort();
		};
	});

	async function loadList() {
		isLoading = true;
		error = null;
		try {
			if (activeTab === "following") {
				list = await FriendsService.getFollowing();
			} else {
				list = await FriendsService.getFollowers();
				// Check mutual status for followers
				await checkFollowStatus(list);
			}
		} catch (e) {
			logService.error("sync", "Failed to load friends list", e);
			error = $_("friends.loadError");
		} finally {
			isLoading = false;
		}
	}

	async function checkFollowStatus(users: FollowRecord[]) {
		await Promise.all(
			users.map(async (user) => {
				const isFollowing = await FriendsService.isFollowing(user.uid);
				followingMap[user.uid] = isFollowing;
			}),
		);
	}

	const AVATAR_ICONS: Record<string, any> = {
		user: UserIcon,
		cat: Cat,
		dog: Dog,
		rabbit: Rabbit,
		bird: Bird,
		fish: Fish,
		snail: Snail,
		turtle: Turtle,
		bug: Bug,
		smile: Smile,
		star: Star,
		heart: Heart,
		zap: Zap,
		target: Target,
	};

	function getIconComponent(photoURL: string | null) {
		if (photoURL?.startsWith("internal:")) {
			const iconId = photoURL.split(":")[1];
			return AVATAR_ICONS[iconId] || UserIcon;
		}
		return UserIcon;
	}

	function getAvatarColor(photoURL: string | null) {
		if (photoURL?.startsWith("internal:")) {
			return photoURL.split(":")[2] || "var(--accent)";
		}
		return "var(--accent)";
	}

	async function handleUnfollow(uid: string) {
		if (!confirm($_("friends.confirmUnfollow"))) return;

		try {
			const success = await FriendsService.unfollow(uid);
			if (success) {
				// Optimistic update
				if (activeTab === "following") {
					list = list.filter((u) => u.uid !== uid);
				} else {
					followingMap[uid] = false;
				}
			}
		} catch (e) {
			logService.error("sync", "Unfollow failed", e);
		}
	}

	async function handleFollowBack(uid: string) {
		try {
			const success = await FriendsService.follow(uid);
			if (success) {
				followingMap[uid] = true;
			}
		} catch (e) {
			logService.error("sync", "Follow back failed", e);
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
					{@const Icon = getIconComponent(user.photoURL)}
					{@const avatarColor = getAvatarColor(user.photoURL)}
					<div class="friend-card" data-testid="friend-card-{user.uid}">
						<div class="friend-avatar">
							<div
								class="avatar-circle"
								style="background-color: {avatarColor}"
							>
								<Icon size={24} color="white" />
							</div>
						</div>

						<div class="friend-info">
							<span class="display-name">{user.displayName || "User"}</span>
						</div>

						<div class="friend-actions">
							{#if activeTab === "following"}
								<button
									class="action-btn unfollow"
									onclick={() => handleUnfollow(user.uid)}
									title={$_("friends.unfollow")}
									data-testid="friend-list-unfollow-btn-{user.uid}"
								>
									<UserCheck size={18} />
								</button>
							{:else}
								<!-- Followers tab actions -->
								{#if followingMap[user.uid]}
									<div class="mutual-badge">
										<UserCheck size={14} />
										<span>{$_("friends.mutual")}</span>
									</div>
								{:else}
									<button
										class="action-btn follow-back"
										onclick={() => handleFollowBack(user.uid)}
										title={$_("friends.followBack")}
										data-testid="friend-list-follow-back-btn-{user.uid}"
									>
										<UserPlus size={18} />
									</button>
								{/if}
							{/if}
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

	.avatar-circle {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
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
	}

	.action-btn.unfollow {
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}

	.action-btn.unfollow:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444; /* Turn red on hover to indicate destructive action */
	}

	.action-btn.follow-back {
		background: var(--bg-secondary);
		color: var(--text-secondary);
	}

	.action-btn.follow-back:hover {
		background: var(--accent);
		color: white;
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
