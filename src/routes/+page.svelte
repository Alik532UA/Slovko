<script lang="ts">
    /**
     * Головна сторінка — Режим з'єднування пар
     */
    import { _ } from "svelte-i18n";
    import GameBoard from "$lib/components/game/GameBoard.svelte";
    import GameStats from "$lib/components/game/GameStats.svelte";
    import TopBar from "$lib/components/navigation/TopBar.svelte";
    import BottomBar from "$lib/components/navigation/BottomBar.svelte";
</script>

<svelte:head>
    <title>{$_("app.title")}</title>
    <meta name="description" content={$_("about.description")} />
</svelte:head>

<div class="app-container">
    <TopBar />

    <main>
        <GameStats />
        <GameBoard />
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
