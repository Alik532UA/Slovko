<script lang="ts">
    /**
     * Головна сторінка — Режим з'єднування пар
     */
    import { _ } from "svelte-i18n";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import { ALL_LEVELS, ALL_TOPICS, type CEFRLevel, type GameMode, type PlaylistId } from "$lib/types";
    import type { PageData } from './$types';
    
    import GameBoard from "$lib/components/game/GameBoard.svelte";
    import GameStats from "$lib/components/game/GameStats.svelte";
    import TopBar from "$lib/components/navigation/TopBar.svelte";
    import BottomBar from "$lib/components/navigation/BottomBar.svelte";
    import ErrorFallback from "$lib/components/ui/ErrorFallback.svelte";

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
             
             if (s.mode !== ds.mode || 
                 s.currentLevel !== ds.currentLevel || 
                 s.currentTopic !== ds.currentTopic ||
                 s.currentPlaylist !== ds.currentPlaylist) {
                 
                 // Update store to match URL/Data source of truth
                 if (ds.mode === 'levels') settingsStore.setLevel(ds.currentLevel);
                 else if (ds.mode === 'phrases') settingsStore.setPhrasesLevel(ds.currentLevel);
                 else if (ds.mode === 'topics') settingsStore.setTopic(ds.currentTopic);
                 else if (ds.mode === 'playlists' && ds.currentPlaylist) settingsStore.setPlaylist(ds.currentPlaylist);
             }
        }
    });

    // --- URL SYNC LOGIC (Зворотна сумісність / Клієнтська навігація) ---

    // 1. Sync URL -> Store
    $effect(() => {
        const url = $page.url;
        const modeParam = url.searchParams.get('mode') as GameMode | null;
        const levelParam = url.searchParams.get('level') as CEFRLevel | null;
        const topicParam = url.searchParams.get('topic');
        const playlistParam = url.searchParams.get('playlist') as PlaylistId | null;

        // Only sync if mode is present, otherwise use default/store (e.g. first load without params)
        if (!modeParam) return;

        // Prevent redundant updates to avoid loops or unnecessary processing
        const s = settingsStore.value;
        const isSameMode = s.mode === modeParam;
        const isSameLevel = !levelParam || s.currentLevel === levelParam;
        const isSameTopic = !topicParam || s.currentTopic === topicParam;
        const isSamePlaylist = !playlistParam || s.currentPlaylist === playlistParam;

        if (isSameMode && isSameLevel && isSameTopic && isSamePlaylist) {
            return;
        }

        // Apply updates
        if (modeParam === 'levels' && levelParam && ALL_LEVELS.includes(levelParam)) {
            settingsStore.setLevel(levelParam);
        } else if (modeParam === 'phrases' && levelParam && ALL_LEVELS.includes(levelParam)) {
            settingsStore.setPhrasesLevel(levelParam);
        } else if (modeParam === 'topics' && topicParam && ALL_TOPICS.some(t => t.id === topicParam)) {
            settingsStore.setTopic(topicParam);
        } else if (modeParam === 'playlists' && playlistParam) {
            settingsStore.setPlaylist(playlistParam);
        }
    });

    // 2. Sync Store -> URL
    $effect(() => {
        const s = settingsStore.value;
        const url = new URL($page.url);
        
        // Construct expected params
        const params = new URLSearchParams(url.searchParams);
        params.set('mode', s.mode);

        if (s.mode === 'levels' || s.mode === 'phrases') {
            params.set('level', s.currentLevel);
            params.delete('topic');
            params.delete('playlist');
        } else if (s.mode === 'topics') {
            params.set('topic', s.currentTopic);
            params.delete('level');
            params.delete('playlist');
        }

        const newSearch = params.toString();
        
        // Only navigate if actually changed
        if (url.search !== '?' + newSearch) {
             goto(`?${newSearch}`, { replaceState: true, keepFocus: true, noScroll: true });
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
        <svelte:boundary>
            <GameStats />
            {#snippet failed(error, reset)}
                <ErrorFallback {error} {reset} />
            {/snippet}
        </svelte:boundary>

        <svelte:boundary>
            <GameBoard gameData={data.gameData} />
            {#snippet failed(error, reset)}
                <ErrorFallback {error} {reset} />
            {/snippet}
        </svelte:boundary>
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
