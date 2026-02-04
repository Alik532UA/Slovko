<script lang="ts">
	/**
	 * Головна сторінка — Режим з'єднування пар
	 */
	import { _ } from "svelte-i18n";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import type { PageData } from "./$types";
	import GameBoard from "$lib/components/game/GameBoard.svelte";
	import GameStats from "$lib/components/game/GameStats.svelte";
	import TopBar from "$lib/components/navigation/TopBar.svelte";
	import BottomBar from "$lib/components/navigation/BottomBar.svelte";
	import ErrorFallback from "$lib/components/ui/ErrorFallback.svelte";
	import ErrorBoundary from "$lib/components/ui/ErrorBoundary.svelte";

	import { goto, replaceState } from "$app/navigation";
	import { page } from "$app/stores";

	import { logService } from "$lib/services/logService";

	import { untrack } from "svelte";

	let { data }: { data: PageData } = $props();

	// 1. Синхронізуємо стор з даними, що прийшли з URL (URL -> Store)
	// Цей ефект спрацьовує тільки коли змінюється data (результат функції load)
	$effect(() => {
		if (data.gameSettings) {
			const ds = data.gameSettings;
			const s = untrack(() => settingsStore.value);

			// Перевіряємо чи є реальна різниця між URL та Store
			if (
				s.mode !== ds.mode ||
				s.currentLevel !== ds.currentLevel ||
				s.currentTopic !== ds.currentTopic ||
				s.currentPlaylist !== ds.currentPlaylist ||
				s.sourceLanguage !== ds.sourceLanguage ||
				s.targetLanguage !== ds.targetLanguage
			) {
				// logService.log("settings", "Syncing store from URL data:", ds);
				settingsStore._internalUpdate({
					mode: ds.mode,
					currentLevel: ds.currentLevel,
					currentTopic: ds.currentTopic,
					currentPlaylist: ds.currentPlaylist,
					sourceLanguage: ds.sourceLanguage,
					targetLanguage: ds.targetLanguage,
				});
			}
		}
	});

	// 2. Синхронізуємо URL зі стором (Store -> URL)
	// Цей ефект спрацьовує тільки коли змінюються налаштування в Store
	$effect(() => {
		const s = settingsStore.value;
		const url = untrack(() => $page.url);

		// Перевіряємо, чи потрібно оновити URL
		const needsUrlUpdate =
			url.searchParams.toString() === "" ||
			url.searchParams.get("source") !== s.sourceLanguage ||
			url.searchParams.get("target") !== s.targetLanguage ||
			url.searchParams.get("mode") !== s.mode ||
			(s.mode === "levels" &&
				url.searchParams.get("level") !== s.currentLevel) ||
			(s.mode === "topics" && url.searchParams.get("topic") !== s.currentTopic);

		if (needsUrlUpdate) {
			const newUrl = new URL(url);
			newUrl.searchParams.set("mode", s.mode);

			if (s.mode === "levels" || s.mode === "phrases")
				newUrl.searchParams.set("level", s.currentLevel);
			if (s.mode === "topics") newUrl.searchParams.set("topic", s.currentTopic);
			if (s.mode === "playlists" && s.currentPlaylist)
				newUrl.searchParams.set("playlist", s.currentPlaylist);

			newUrl.searchParams.set("source", s.sourceLanguage);
			newUrl.searchParams.set("target", s.targetLanguage);

			if (newUrl.toString() !== url.toString()) {
				// logService.log("settings", "Refreshing page data for new settings:", s.sourceLanguage, s.targetLanguage);
				// goto ініціює перезавантаження load функціі і завантаження НОВИХ gameData (перекладів)
				goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
			}
		}
	});
</script>

<svelte:head>
	<title>{$_("app.title")}</title>
	<meta name="description" content={$_("about.description")} />
</svelte:head>

<div class="app-container">
	<TopBar />

	<main>
		<ErrorBoundary>
			<GameStats />
		</ErrorBoundary>

		<ErrorBoundary>
			{#if data.error}
				<ErrorFallback
					error={data.error}
					reset={() => window.location.reload()}
				/>
			{:else if data.gameData && data.gameSettings}
				{#key data.gameSettings.mode + (data.gameSettings.currentLevel || "") + (data.gameSettings.currentTopic || "") + (data.gameSettings.currentPlaylist || "") + data.gameSettings.sourceLanguage + data.gameSettings.targetLanguage}
					<GameBoard gameData={data.gameData} />
				{/key}
			{:else}
				<!-- Loading state handled by SvelteKit usually -->
				<div class="loading">Loading...</div>
			{/if}
		</ErrorBoundary>
	</main>

	<BottomBar />
</div>

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		height: 100dvh; /* Force dynamic viewport height */
		position: relative;
		overflow: hidden;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 70px 1rem 0px;
		gap: 1rem;
		overflow-y: auto; /* Allow scrolling within main if content overflows */
		width: 100%;
	}
</style>
