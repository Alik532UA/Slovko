<script lang="ts">
	/**
	 * TopBar — Верхня панель з іконками
	 * Донат, Мови, Про проєкт
	 */
	import { Coins, Languages, Info, Palette, User } from "lucide-svelte";
	import LanguageSettings from "../settings/LanguageSettings.svelte";
	import AboutModal from "../settings/AboutModal.svelte";
	import ThemeModal from "../settings/ThemeModal.svelte";
	import ProfileModal from "../settings/ProfileModal.svelte";

	let showLanguageModal = $state(false);
	let showAboutModal = $state(false);
	let showThemeModal = $state(false);
	let showProfileModal = $state(false);

	const donateUrl = "https://send.monobank.ua/jar/7sCsydhJnR";
	const ICON_SIZE = 24;
</script>

<div class="top-icons-bar">
	<!-- Донат -->
	<a
		href={donateUrl}
		target="_blank"
		rel="noopener noreferrer"
		class="icon-btn"
		title="Donate"
		data-testid="donate-btn"
	>
		<div class="icon-inner">
			<Coins size={ICON_SIZE} />
		</div>
	</a>

	<!-- Теми -->
	<button
		class="icon-btn"
		onclick={() => (showThemeModal = true)}
		title="Theme"
		data-testid="theme-settings-btn"
	>
		<div class="icon-inner">
			<Palette size={ICON_SIZE} />
		</div>
	</button>

	<!-- Мови -->
	<button
		class="icon-btn"
		onclick={() => (showLanguageModal = true)}
		title="Languages"
		data-testid="language-settings-btn"
	>
		<div class="icon-inner">
			<Languages size={ICON_SIZE} />
		</div>
	</button>

	<!-- Про проєкт -->
	<button
		class="icon-btn"
		onclick={() => (showAboutModal = true)}
		title="About"
		data-testid="about-btn"
	>
		<div class="icon-inner">
			<Info size={ICON_SIZE} />
		</div>
	</button>

	<!-- Профіль -->
	<button
		class="icon-btn"
		onclick={() => (showProfileModal = true)}
		title="Profile"
		data-testid="profile-btn"
	>
		<div class="icon-inner">
			<User size={ICON_SIZE} />
		</div>
	</button>
</div>

{#if showLanguageModal}
	<LanguageSettings onclose={() => (showLanguageModal = false)} />
{/if}

{#if showAboutModal}
	<AboutModal onclose={() => (showAboutModal = false)} />
{/if}

{#if showThemeModal}
	<ThemeModal onclose={() => (showThemeModal = false)} />
{/if}

{#if showProfileModal}
	<ProfileModal onclose={() => (showProfileModal = false)} />
{/if}

<style>
	.top-icons-bar {
		position: absolute;
		top: 20px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 16px;
		z-index: 10;
		padding: 0 10px;
	}

	.icon-btn {
		background: transparent;
		border: none;
		border-radius: 50%;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			transform 0.2s,
			background 0.2s;
		padding: 0;
		color: var(--text-primary);
		text-decoration: none;
	}

	.icon-btn:hover {
		transform: scale(1.1);
		background: rgba(255, 255, 255, 0.1);
	}

	.icon-inner {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	@media (min-width: 768px) {
		.top-icons-bar {
			gap: 24px;
		}
	}
</style>
