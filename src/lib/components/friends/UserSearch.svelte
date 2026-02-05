<script lang="ts">
	import { _ } from "svelte-i18n";
	import {
		Search,
		Loader2,
		Clipboard,
		Radio,
		UserPlus
	} from "lucide-svelte";
	import {
		FriendsService,
		type UserProfile,
	} from "$lib/firebase/FriendsService";
	import { PresenceService, type DiscoveryUser } from "$lib/firebase/PresenceService.svelte";
	import { authStore } from "$lib/firebase/authStore.svelte";
	import { logService } from "$lib/services/logService";
	import UserAvatar from "./UserAvatar.svelte";
	import FollowButton from "./FollowButton.svelte";
	import { onDestroy } from "svelte";
	import { flip } from "svelte/animate";

	// State
	let searchQuery = $state("");
	let searchResults = $state<UserProfile[]>([]);
	let isSearching = $state(false);
	
	// Discovery State
	let isDiscoveryMode = $state(false);
	let discoveryUsers = $state<DiscoveryUser[]>([]);
	let discoveryUnsub: (() => void) | null = null;

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
	
	async function pasteFromClipboard() {
		try {
			const text = await navigator.clipboard.readText();
			if (text) {
				searchQuery = text.trim();
				handleSearchInput();
			}
		} catch (err) {
			logService.error("ui", "Failed to read clipboard:", err);
		}
	}

	async function performSearch() {
		if (!searchQuery.trim()) return;

		isSearching = true;
		try {
			searchResults = await FriendsService.searchUsers(searchQuery);
		} catch (error) {
			logService.error("sync", "Search failed", error);
		} finally {
			isSearching = false;
		}
	}

	async function toggleDiscoveryMode() {
		isDiscoveryMode = !isDiscoveryMode;
		
		if (isDiscoveryMode) {
			// Включаємо
			if (authStore.user && authStore.user.displayName) {
				await PresenceService.enterDiscoveryMode({
					displayName: authStore.user.displayName,
					photoURL: authStore.user.photoURL
				});
				
				// Підписуємося на оновлення списку
				discoveryUnsub = PresenceService.subscribeToDiscovery((users) => {
					discoveryUsers = users;
				});
			}
		} else {
			// Вимикаємо
			await PresenceService.leaveDiscoveryMode();
			if (discoveryUnsub) {
				discoveryUnsub();
				discoveryUnsub = null;
			}
			discoveryUsers = [];
		}
	}

	onDestroy(() => {
		if (isDiscoveryMode) {
			PresenceService.leaveDiscoveryMode();
		}
		if (discoveryUnsub) {
			discoveryUnsub();
		}
	});
</script>

<div class="search-container" data-testid="user-search-root">
	<!-- Search Box -->
	<div class="search-box">
		<div class="search-icon-wrapper">
			<Search size={20} />
		</div>
		<input
			type="text"
			bind:value={searchQuery}
			oninput={handleSearchInput}
			placeholder={$_("friends.searchPlaceholderEmail")}
			class="search-input"
			data-testid="search-users-input"
		/>
		
		<div class="input-actions">
			{#if isSearching}
				<div class="spinner-wrapper">
					<Loader2 size={16} />
				</div>
			{:else}
				<button 
					class="icon-btn" 
					onclick={pasteFromClipboard} 
					title={$_("discovery.paste")}
					aria-label={$_("discovery.paste")}
				>
					<Clipboard size={18} />
				</button>
			{/if}
		</div>
	</div>

	<!-- Results List -->
	{#if searchResults.length > 0}
		<div class="results-list" data-testid="user-search-results">
			{#each searchResults as user (user.uid)}
				<div class="user-card">
					<UserAvatar uid={user.uid} photoURL={user.photoURL} displayName={user.displayName} size={36} />

					<div class="user-info">
						<span class="display-name">{user.displayName || "User"}</span>
						{#if user.searchableEmail}
							<span class="email-hint">{user.searchableEmail}</span>
						{/if}
					</div>

					<FollowButton
						uid={user.uid}
						displayName={user.displayName}
						photoURL={user.photoURL}
						variant="compact"
					/>
				</div>
			{/each}
		</div>
	{:else if searchQuery.length >= 2 && !isSearching}
		<div class="empty-state" data-testid="user-search-empty">
			<p>
				{$_("friends.noResults")}
			</p>
		</div>
	{/if}
	
	<!-- Active Search / Discovery Mode -->
	<div class="discovery-section">
		<div class="discovery-header">
			<div class="discovery-title">
				<Radio size={20} class={isDiscoveryMode ? "pulse-icon" : ""} />
				<span>{$_("discovery.title")}</span>
			</div>
			
			<button 
				class="toggle-btn" 
				class:active={isDiscoveryMode} 
				onclick={toggleDiscoveryMode}
				data-testid="discovery-toggle"
			>
				{isDiscoveryMode ? $_("discovery.disable") : $_("discovery.enable")}
			</button>
		</div>
		
		<p class="discovery-hint">
			{$_("discovery.hint")}
		</p>

		{#if isDiscoveryMode && discoveryUsers.length > 0}
			<div class="discovery-list" data-testid="discovery-list">
				{#each discoveryUsers as user (user.uid)}
					<div class="user-card discovery-card" animate:flip={{ duration: 300 }}>
						<UserAvatar uid={user.uid} photoURL={user.photoURL} displayName={user.displayName} size={32} />
						
						<div class="user-info">
							<span class="display-name">{user.displayName}</span>
							<span class="status-indicator">{$_("discovery.active")}</span>
						</div>
						
						<FollowButton
							uid={user.uid}
							displayName={user.displayName}
							photoURL={user.photoURL}
							variant="compact"
						/>
					</div>
				{/each}
			</div>
		{:else if isDiscoveryMode}
			<div class="discovery-waiting">
				<Loader2 size={24} class="spin-slow" />
				<span>{$_("discovery.waiting")}</span>
			</div>
		{/if}
	</div>
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

	.input-actions {
		position: absolute;
		right: 0.5rem;
		display: flex;
		align-items: center;
		height: 100%;
	}

	.icon-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.spinner-wrapper {
		color: var(--text-secondary);
		animation: spin 1s linear infinite;
		padding: 0.5rem;
		display: flex;
		align-items: center;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.search-input {
		width: 100%;
		padding: 0.8rem 2.8rem 0.8rem 2.8rem;
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

	.results-list, .discovery-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
		padding-right: 0.25rem;
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
	
	.discovery-card {
		border: 1px solid rgba(58, 143, 214, 0.2);
		background: rgba(58, 143, 214, 0.05);
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

	.empty-state {
		text-align: center;
		padding: 1rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
	
	/* Discovery Section Styles */
	.discovery-section {
		margin-top: 1rem;
		border-top: 1px solid var(--border);
		padding-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.discovery-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	
	.discovery-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		color: var(--text-primary);
	}
	
	.pulse-icon {
		color: #2ecc71;
		animation: pulse 2s infinite;
	}
	
	@keyframes pulse {
		0% { transform: scale(1); opacity: 1; }
		50% { transform: scale(1.2); opacity: 0.8; }
		100% { transform: scale(1); opacity: 1; }
	}
	
	.discovery-hint {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0;
	}
	
	.toggle-btn {
		background: rgba(255, 255, 255, 0.1);
		border: none;
		color: var(--text-primary);
		padding: 0.4rem 0.8rem;
		border-radius: 20px;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.toggle-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}
	
	.toggle-btn.active {
		background: rgba(46, 204, 113, 0.2);
		color: #2ecc71;
		border: 1px solid rgba(46, 204, 113, 0.3);
	}
	
	.status-indicator {
		font-size: 0.7rem;
		color: #2ecc71;
	}
	
	.discovery-waiting {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
	
	.spin-slow {
		animation: spin 3s linear infinite;
	}
</style>
