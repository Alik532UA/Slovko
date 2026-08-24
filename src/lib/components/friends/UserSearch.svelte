<script lang="ts">
	import { _ } from "svelte-i18n";
	import {
		Search,
		Loader,
		Clipboard,
		Radio
	} from "lucide-svelte";
	import {
		FriendsService,
		type UserProfile,
	} from "$lib/services/firebase/FriendsService";
	import { PresenceService, type DiscoveryUser } from "$lib/services/firebase/PresenceService.svelte";
	import { authStore } from "$lib/controllers/AuthStore.svelte";
	import { logService } from "$lib/services/logService.svelte";
	import UserAvatar from "./UserAvatar.svelte";
	import FollowButton from "./FollowButton.svelte";
	import { onDestroy } from "svelte";
	import { flip } from "svelte/animate";

	let { onfollow }: { onfollow?: () => void } = $props();

	// Discovery State
	let isDiscoveryMode = $state(false);
	let discoveryUsers = $state<DiscoveryUser[]>([]);
	let discoveryUnsub: (() => void) | null = null;

	// Search State
	let searchQuery = $state("");
	let searchResults = $state<UserProfile[]>([]);
	let isSearching = $state(false);

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

<div class="search-container" data-testid="user-search-container">
	<!--
		Search Box.

		`has-input-tools` — ознака поля з кнопками ВСЕРЕДИНІ (INPUT-TOOLS-v8 § 4.1):
		від цього предка залежить рівень «курсор десь у полі». Драбина чотирьох
		рівнів прозорості спільна з полем пароля й живе в `app.css` — FORM-INPUTS-v8
		§ 1.1 вимагає однакової поведінки кнопок в усіх полях, а дві копії драбини
		розійшлися б на першій же правці.
	-->
	<div class="search-box has-input-tools">
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
		
		<!--
			`input-tools` — область наведення: смуга на всю висоту поля праворуч.
			Вона більша за саму кнопку, тож сходинка «курсор над кнопками» (90%) тут
			справді досяжна, а не збігається з наведенням на кнопку.
		-->
		<div class="input-actions input-tools">
			{#if isSearching}
				<div class="spinner-wrapper">
					<Loader size={16} class="spin-fast" />
				</div>
			{:else}
				<button
					class="icon-btn input-tools__btn"
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
		<div class="results-list" data-testid="user-search-results-list">
			{#each searchResults as user (user.uid)}
				<div class="user-card">
					<UserAvatar uid={user.uid} photoURL={user.photoURL} displayName={user.displayName} size={36} />

					<div class="user-info">
						<span class="display-name">{user.displayName || "User"}</span>
						<!--
							Пошти тут більше немає — і показувати її нема з чого.

							У профілі лежить лише SHA-256 адреси: правил рівня поля у
							Firestore не існує, тож відкрита адреса в колекції, яку читає
							пошук, означала б усю базу пошт за один запит. Підказка нічого й
							не додавала: пошук працює за ТОЧНИМ збігом, тобто людина щойно
							сама ввела цю адресу.
						-->

					</div>

					<FollowButton
						uid={user.uid}
						displayName={user.displayName}
						photoURL={user.photoURL}
						variant="compact"
						onchange={onfollow}
					/>
				</div>
			{/each}
		</div>
	{:else if searchQuery.length >= 2 && !isSearching}
		<div class="empty-state" data-testid="user-search-empty-message">
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
							onchange={onfollow}
						/>
					</div>
				{/each}
			</div>
		{:else if isDiscoveryMode}
			<div class="discovery-waiting">
				<Loader size={24} class="spin-slow" />
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

	/*
	 * БЕЗ власного `transition`, і це не недогляд.
	 *
	 * Тут стояло `transition: all 0.2s`. Через scoping Svelte воно переважує
	 * глобальний перехід драбини прозорості (`app.css`, INPUT-TOOLS-v8 § 7), а
	 * `all` до того ж анімує й `border-radius` із `padding` — тобто все, що колись
	 * тут зміниться. Перехід оголошено в одному місці, разом зі сходинками, які
	 * він і має згладжувати.
	 */
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
	}

	.icon-btn:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.spinner-wrapper {
		color: var(--text-secondary);
		padding: 0.5rem;
		display: flex;
		align-items: center;
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
		background: var(--glass-bg);
		transition: background 0.2s;
	}

	.user-card:hover {
		background: var(--bg-hover);
	}
	
	.discovery-card {
		border: 1px solid var(--status-info-bg);
		background: var(--status-info-bg);
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
	
	.discovery-hint {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0;
	}
	
	.toggle-btn {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: var(--text-primary);
		padding: 0.4rem 0.8rem;
		border-radius: 20px;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.toggle-btn:hover {
		background: var(--bg-hover);
	}
	
	.toggle-btn.active {
		background: var(--status-success-bg);
		color: var(--status-success);
		border: 1px solid var(--status-success-bg);
	}
	
	.status-indicator {
		font-size: 0.7rem;
		color: var(--status-success);
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
</style>
