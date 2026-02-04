<script lang="ts">
	/**
	 * Головна сторінка — Режим з'єднування пар
	 */
	import { _ } from "svelte-i18n";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import {
		ALL_LEVELS,
		ALL_TOPICS,
		type CEFRLevel,
		type GameMode,
		type PlaylistId,
	} from "$lib/types";
	import type { PageData } from "./$types";
	import GameBoard from "$lib/components/game/GameBoard.svelte";
	import GameStats from "$lib/components/game/GameStats.svelte";
	import TopBar from "$lib/components/navigation/TopBar.svelte";
	import BottomBar from "$lib/components/navigation/BottomBar.svelte";
	import ErrorFallback from "$lib/components/ui/ErrorFallback.svelte";
	import ErrorBoundary from "$lib/components/ui/ErrorBoundary.svelte";

	let { data }: { data: PageData } = $props();

	// Синхронізація налаштувань при зміні даних (навігація)
	$effect(() => {
		if (data.gameSettings) {
			// Використовуємо internalUpdate або просто оновлюємо store,
			// але обережно, щоб не викликати нову навігацію
			// В ідеалі, store повинен просто прийняти нові значення.

			// Оскільки settingsStore зберігає в localStorage, це нормально.
			const s = settingsStore.value;
			const ds = data.gameSettings;

			if (
				s.mode !== ds.mode ||
				s.currentLevel !== ds.currentLevel ||
				s.currentTopic !== ds.currentTopic ||
				s.currentPlaylist !== ds.currentPlaylist
			) {
				// Update store to match URL/Data source of truth
				if (ds.mode === "levels") settingsStore.setLevel(ds.currentLevel);
				else if (ds.mode === "phrases")
					settingsStore.setPhrasesLevel(ds.currentLevel);
				else if (ds.mode === "topics") settingsStore.setTopic(ds.currentTopic);
				else if (ds.mode === "playlists" && ds.currentPlaylist)
					settingsStore.setPlaylist(ds.currentPlaylist);
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
			{:else if data.gameData}
				{#key settingsStore.value.mode + settingsStore.value.currentLevel + settingsStore.value.currentTopic + settingsStore.value.currentPlaylist + settingsStore.value.sourceLanguage + settingsStore.value.targetLanguage}
					<GameBoard gameData={data.gameData} />
				{/key}
			{:else}
				<!-- Loading state handled by SvelteKit usually, but strictly speaking we shouldn't get here without error or data -->
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
