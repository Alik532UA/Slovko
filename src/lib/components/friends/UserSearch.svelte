<script lang="ts">
	import { _ } from "svelte-i18n";
	import {
		Search,
		UserPlus,
		UserMinus,
		UserCheck,
		Loader2,
		User as UserIcon,
	} from "lucide-svelte";
	import {
		FriendsService,
		type UserProfile,
		type FollowRecord,
	} from "$lib/firebase/FriendsService";
	import { logService } from "$lib/services/logService";

	// Props
	interface Props {
		onFollowChange: () => void; // Callback to refresh friends list
	}
	let { onFollowChange }: Props = $props();

	// State
	let searchQuery = $state("");
	let searchResults = $state<UserProfile[]>([]);
	let isSearching = $state(false);
	let followingMap = $state<Record<string, boolean>>({}); // Cache follow status
	let processingUid = $state<string | null>(null); // Uid being processed (follow/unfollow)

	// Debounce search
	let searchTimeout: ReturnType<typeof setTimeout>;

	function handleSearchInput() {
		clearTimeout(searchTimeout);
		if (searchQuery.length < 2) {
			searchResults = [];
			return;
		}

		searchTimeout = setTimeout(() => {
			performSearch();
		}, 500);
	}

	async function performSearch() {
		if (!searchQuery.trim()) return;

		isSearching = true;
		try {
			searchResults = await FriendsService.searchUsers(searchQuery);
			// Check follow status for results
			await checkFollowStatus(searchResults);
		} catch (error) {
			logService.error("sync", "Search failed", error);
		} finally {
			isSearching = false;
		}
	}

	async function checkFollowStatus(users: UserProfile[]) {
		// Parallel check for each user
		await Promise.all(
			users.map(async (user) => {
				const isFollowing = await FriendsService.isFollowing(user.uid);
				followingMap[user.uid] = isFollowing;
			}),
		);
	}

	async function handleFollowToggle(user: UserProfile) {
		if (processingUid) return;

		processingUid = user.uid;
		const isFollowing = followingMap[user.uid];

		try {
			let success = false;
			if (isFollowing) {
				success = await FriendsService.unfollow(user.uid);
			} else {
				success = await FriendsService.follow(user.uid);
			}

			if (success) {
				followingMap[user.uid] = !isFollowing;
				onFollowChange(); // Notify parent
			}
		} catch (error) {
			logService.error("sync", "Follow toggle failed", error);
		} finally {
			processingUid = null;
		}
	}

	// Components for avatar
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
</script>

<div class="search-container" data-testid="user-search-root">
	<div class="search-box">
		<div class="search-icon-wrapper">
			<Search size={20} />
		</div>
		<input
			type="text"
			bind:value={searchQuery}
			oninput={handleSearchInput}
			placeholder={$_("friends.searchPlaceholder", {
				default: "Пошук користувачів...",
			})}
			class="search-input"
			data-testid="search-users-input"
		/>
		{#if isSearching}
			<div class="spinner-wrapper">
				<Loader2 size={16} />
			</div>
		{/if}
	</div>

	{#if searchResults.length > 0}
		<div class="results-list" data-testid="user-search-results">
			{#each searchResults as user (user.uid)}
				{@const Icon = getIconComponent(user.photoURL)}
				{@const avatarColor = getAvatarColor(user.photoURL)}
				<div class="user-card">
					<div class="user-avatar">
						<div class="avatar-circle" style="background-color: {avatarColor}">
							<Icon size={24} color="white" />
						</div>
					</div>

					<div class="user-info">
						<span class="display-name">{user.displayName || "User"}</span>
						{#if user.searchableEmail}
							<span class="email-hint">{user.searchableEmail}</span>
						{/if}
					</div>

					<button
						class="action-btn"
						class:following={followingMap[user.uid]}
						disabled={processingUid === user.uid}
						onclick={() => handleFollowToggle(user)}
						data-testid="user-search-follow-btn-{user.uid}"
					>
						{#if processingUid === user.uid}
							<Loader2 size={18} class="spinner" />
						{:else if followingMap[user.uid]}
							<UserCheck size={18} />
						{:else}
							<UserPlus size={18} />
						{/if}
					</button>
				</div>
			{/each}
		</div>
	{:else if searchQuery.length >= 2 && !isSearching}
		<div class="empty-state" data-testid="user-search-empty">
			<p>
				{$_("friends.noResults", {
					default: "Користувачів не знайдено",
				})}
			</p>
		</div>
	{/if}
</div>

<style>
	.search-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.search-box {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon-wrapper {
		position: absolute;
		left: 1rem;
		color: var(--text-secondary);
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spinner-wrapper {
		position: absolute;
		right: 1rem;
		color: var(--text-secondary);
		animation: spin 1s linear infinite;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.search-input {
		width: 100%;
		padding: 0.8rem 1rem 0.8rem 2.8rem;
		border-radius: 12px;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		color: var(--text-primary);
		font-size: 0.95rem;
		transition: border-color 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.results-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
		padding-right: 0.25rem;

		/* Thin scrollbar */
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.user-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.03);
		transition: background 0.2s;
	}

	.user-card:hover {
		background: rgba(255, 255, 255, 0.06);
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

	.user-info {
		flex: 1;
		display: flex;
		flex-direction: column;
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

	.email-hint {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.action-btn {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		border: none;
		background: var(--bg-secondary);
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover:not(:disabled) {
		background: var(--accent);
		color: white;
	}

	.action-btn.following {
		background: rgba(34, 197, 94, 0.15); /* Green tint */
		color: #22c55e;
	}

	.action-btn.following:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.15); /* Red tint on hover for unfollow */
		color: #ef4444;
	}

	.action-btn.following:hover:not(:disabled) :global(svg) {
		/* Swap icon on hover visually could be tricky without swapping component logic, 
           so we rely on color change mainly. 
           But ideally we could show minus icon on hover. 
           For simplicity now, just color change. */
		color: #ef4444;
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.empty-state {
		text-align: center;
		padding: 1rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
