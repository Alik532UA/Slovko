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

	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	import { untrack } from "svelte";
	import { UrlSyncService } from "$lib/services/urlSyncService";

	let { data }: { data: PageData } = $props();

	// 1. Синхронізуємо стор з даними, що прийшли з URL (URL -> Store)
	$effect(() => {
		if (data.gameSettings) {
			UrlSyncService.syncStoreWithUrl(data.gameSettings);
		}
	});

	// 2. Синхронізуємо URL зі стором (Store -> URL)
	$effect(() => {
		const s = settingsStore.value;
		const url = untrack(() => $page.url);
		const newUrl = UrlSyncService.getUpdatedUrl(url, s);

		if (newUrl) {
			goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
		}
	});
</script>

<svelte:head>
	<title>{$_("app.title")}</title>
	<meta name="description" content={$_("about.description")} />
</svelte:head>

<div class="app-container">
	<ErrorBoundary compact>
		<TopBar />
	</ErrorBoundary>

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

	<ErrorBoundary compact>
		<BottomBar />
	</ErrorBoundary>
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
