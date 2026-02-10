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

	let isSyncing = false;

	// Синхронізація стану (URL -> Store)
	$effect(() => {
		if (data.gameSettings) {
			const current = settingsStore.value;
			const incoming = data.gameSettings;

			// Перевіряємо чи є реальна різниця, щоб не тригерити зайві оновлення
			const hasChanged =
				current.mode !== incoming.mode ||
				current.currentLevel !== incoming.currentLevel ||
				current.currentTopic !== incoming.currentTopic ||
				current.currentPlaylist !== incoming.currentPlaylist ||
				current.sourceLanguage !== incoming.sourceLanguage ||
				current.targetLanguage !== incoming.targetLanguage;

			if (hasChanged) {
				isSyncing = true;
				untrack(() => {
					UrlSyncService.syncStoreWithUrl(incoming);
					// Скидаємо прапорець після тіку мікрозавдання
					setTimeout(() => (isSyncing = false), 0);
				});
			}
		}
	});

	// Синхронізація стану (Store -> URL)
	$effect(() => {
		const s = settingsStore.value;
		if (isSyncing) return; // Не оновлюємо URL, якщо ми щойно взяли дані з нього

		const url = untrack(() => $page.url);

		untrack(() => {
			const newUrl = UrlSyncService.getUpdatedUrl(url, s);
			if (newUrl && newUrl.toString() !== url.toString()) {
				goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
			}
		});
	});
</script>

<svelte:head>
	<title>{$_("app.title")}</title>
	<meta name="description" content={$_("about.description")} />
</svelte:head>

<div class="app-container" data-testid="app-root-container">
	<ErrorBoundary compact>
		<TopBar />
	</ErrorBoundary>

	<main data-testid="main-content">
		<ErrorBoundary>
			<GameStats />
		</ErrorBoundary>

		<ErrorBoundary>
			{#if data.error}
				<ErrorFallback
					error={data.error}
					reset={() => window.location.reload()}
				/>
			{:else if data.gameSettings}
				<GameBoard gameData={data.gameData || undefined} />
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
		padding: 32px 1rem 0px;
		gap: 1rem;
		overflow-y: auto; /* Allow scrolling within main if content overflows */
		width: 100%;
	}
</style>
