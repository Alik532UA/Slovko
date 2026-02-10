<script lang="ts">
	/**
	 * MenuModal — Випадаюче меню додатка (Dropdown)
	 */
	import { onMount } from "svelte";
	import { _ } from "svelte-i18n";
	import { fly } from "svelte/transition";
	import { 
		User, 
		Languages, 
		Palette, 
		Info, 
		Coins, 
		RefreshCcw, 
		CloudOff, 
		AlertCircle, 
		BarChart3
	} from "lucide-svelte";
	import { SyncService } from "$lib/firebase/SyncService.svelte";
	import { authStore } from "$lib/firebase/authStore.svelte";

	interface Props {
		onclose: () => void;
		onopenProfile: (mode: "stats" | "profile", tab?: any) => void;
		onopenLanguages: () => void;
		onopenThemes: () => void;
		onopenAbout: () => void;
	}
	let { onclose, onopenProfile, onopenLanguages, onopenThemes, onopenAbout }: Props = $props();

	const donateUrl = "https://send.monobank.ua/jar/7sCsydhJnR";
	let syncStatus = $derived(SyncService.status);

	// Закриття при кліку ззовні
	let menuRef = $state<HTMLElement | null>(null);

	const handleClickOutside = (event: MouseEvent) => {
		if (menuRef && !menuRef.contains(event.target as Node)) {
			onclose();
		}
	};

	onMount(() => {
		const timer = setTimeout(() => {
			window.addEventListener("click", handleClickOutside);
		}, 10);
		
		return () => {
			window.removeEventListener("click", handleClickOutside);
			clearTimeout(timer);
		};
	});
</script>

<div 
	class="dropdown-menu" 
	bind:this={menuRef} 
	transition:fly={{ y: -10, duration: 200 }}
	data-testid="menu-modal"
>
	<div class="menu-list">
		<!-- 1. Мови -->
		<button class="menu-item" onclick={() => { onopenLanguages(); onclose(); }} data-testid="menu-languages-btn">
			<div class="item-icon"><Languages size={18} /></div>
			<span class="label">{$_("settings.languages") || "Languages"}</span>
		</button>

		<!-- 2. Статистика -->
		<button class="menu-item" onclick={() => { onopenProfile("stats", "stats"); onclose(); }} data-testid="menu-stats-btn">
			<div class="item-icon"><BarChart3 size={18} /></div>
			<span class="label">{$_("profile.tabs.stats") || "Statistics"}</span>
		</button>

		<!-- 3. Теми -->
		<button class="menu-item" onclick={() => { onopenThemes(); onclose(); }} data-testid="menu-theme-btn">
			<div class="item-icon"><Palette size={18} /></div>
			<span class="label">{$_("settings.theme") || "Theme"}</span>
		</button>

		<hr class="divider" />

		<!-- 4. Підтримати проект -->
		<a href={donateUrl} target="_blank" rel="noopener noreferrer" class="menu-item donate-item" data-testid="menu-donate-link" onclick={onclose}>
			<div class="item-icon"><Coins size={18} /></div>
			<span class="label">{$_("about.support") || "Support Project"}</span>
		</a>

		<!-- 5. Про Slovko -->
		<button class="menu-item" onclick={() => { onopenAbout(); onclose(); }} data-testid="menu-about-btn">
			<div class="item-icon"><Info size={18} /></div>
			<span class="label">{$_("about.title") || "About"}</span>
		</button>

		<hr class="divider" />

		<!-- 6. Профіль -->
		<button class="menu-item profile-item" onclick={() => { onopenProfile("profile", "account"); onclose(); }} data-testid="menu-profile-btn">
			<div class="item-icon">
				<User size={18} />
				{#if !authStore.isGuest && syncStatus !== "up-to-date" && syncStatus !== "idle"}
					<div class="status-dot {syncStatus}">
						{#if syncStatus === "syncing"}<RefreshCcw size={8} />{/if}
						{#if syncStatus === "error"}<AlertCircle size={8} />{/if}
						{#if syncStatus === "offline"}<CloudOff size={8} />{/if}
					</div>
				{/if}
			</div>
			<div class="item-text">
				<span class="label">{$_("common.profile") || "Profile"}</span>
				<span class="sub-label">
					{#if authStore.isGuest}
						{$_("sync.status.notLoggedIn") || "⚠️ not signed in"}
					{:else if syncStatus === "syncing"}
						{$_("sync.status.syncing") || "Syncing..."}
					{:else if syncStatus === "error"}
						{$_("sync.status.error") || "Sync Error"}
					{:else}
						{authStore.displayName || authStore.email || $_("sync.status.synced")}
					{/if}
				</span>
			</div>
		</button>
	</div>
</div>

<style>
	.dropdown-menu {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 260px;
		background: transparent; /* Видалено фон */
		border: none; /* Видалено обводку */
		box-shadow: none; /* Видалено тінь */
		z-index: 1000;
		overflow: visible;
		padding: 0.5rem;
	}

	.menu-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 1rem;
		background: color-mix(in srgb, var(--bg-secondary) 90%, transparent);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		text-decoration: none;
		width: 100%;
		backdrop-filter: blur(8px);
	}

	.menu-item:hover {
		background: color-mix(in srgb, var(--bg-secondary) 100%, transparent);
		color: var(--accent);
		border-color: var(--accent);
		transform: translateX(-4px);
	}

	.item-icon {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		color: var(--accent);
		flex-shrink: 0;
	}

	.item-text {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		min-width: 0;
	}

	.label {
		font-weight: 500;
		font-size: 0.95rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sub-label {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.divider {
		border: none;
		border-top: 1px solid var(--border);
		margin: 4px 8px;
		opacity: 0.2;
	}

	.status-dot {
		position: absolute;
		bottom: -2px;
		right: -2px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border);
	}

	.status-dot.syncing { color: var(--accent); animation: spin 2s linear infinite; }
	.status-dot.error { color: #ef4444; }
	.status-dot.offline { color: var(--text-secondary); }

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
