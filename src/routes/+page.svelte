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

	import { replaceState } from "$app/navigation";
	import { page } from "$app/stores";

	import { logService } from "$lib/services/logService";

	let { data }: { data: PageData } = $props();

	// 1. Синхронізуємо стор з даними, що прийшли з URL (через load)
	$effect(() => {
		if (data.gameSettings) {
			const s = settingsStore.value;
			const ds = data.gameSettings;

			// Перевіряємо чи є реальна різниця, щоб не зациклити
			if (
				s.mode !== ds.mode ||
				s.currentLevel !== ds.currentLevel ||
				s.currentTopic !== ds.currentTopic ||
				s.currentPlaylist !== ds.currentPlaylist ||
				s.sourceLanguage !== ds.sourceLanguage ||
				s.targetLanguage !== ds.targetLanguage
			) {
				logService.log("settings", "Syncing store with new page data:", ds);
				// Оновлюємо ТІЛЬКИ ігрові параметри, щоб не затерти системні (interfaceLanguage, theme тощо)
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

	// 2. Відображаємо стан стору в URL, якщо параметрів немає (Initial Entry)
	$effect(() => {
		const url = $page.url;
		if (url.searchParams.toString() === "" && data.gameSettings) {
			logService.log(
				"settings",
				"No URL params, reflecting store state to URL...",
			);
			const s = data.gameSettings;
			const newUrl = new URL(url);
			newUrl.searchParams.set("mode", s.mode);
			if (s.mode === "levels" || s.mode === "phrases")
				newUrl.searchParams.set("level", s.currentLevel);
			if (s.mode === "topics") newUrl.searchParams.set("topic", s.currentTopic);
			if (s.mode === "playlists" && s.currentPlaylist)
				newUrl.searchParams.set("playlist", s.currentPlaylist);
			newUrl.searchParams.set("source", s.sourceLanguage);
			newUrl.searchParams.set("target", s.targetLanguage);

			logService.log("settings", "New URL reflecting state:", newUrl.toString());
			replaceState(newUrl, {});
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
