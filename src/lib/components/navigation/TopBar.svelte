<script lang="ts">
    /**
     * TopBar — Верхня панель з іконками
     * Донат, Мови, Про проєкт
     */
    import { Coins, Languages, Info } from "lucide-svelte";
    import LanguageSettings from "../settings/LanguageSettings.svelte";
    import AboutModal from "../settings/AboutModal.svelte";

    let showLanguageModal = $state(false);
    let showAboutModal = $state(false);

    function openDonate() {
        window.open("https://send.monobank.ua/jar/7sCsydhJnR/", "_blank");
    }
</script>

<div class="top-icons-bar">
    <!-- Донат -->
    <button class="icon-btn" onclick={openDonate} title="Donate">
        <div class="icon-inner">
            <Coins size={24} />
        </div>
    </button>

    <!-- Мови -->
    <button
        class="icon-btn"
        onclick={() => (showLanguageModal = true)}
        title="Languages"
    >
        <div class="icon-inner">
            <Languages size={24} />
        </div>
    </button>

    <!-- Про проєкт -->
    <button
        class="icon-btn"
        onclick={() => (showAboutModal = true)}
        title="About"
    >
        <div class="icon-inner">
            <Info size={24} />
        </div>
    </button>
</div>

{#if showLanguageModal}
    <LanguageSettings onclose={() => (showLanguageModal = false)} />
{/if}

{#if showAboutModal}
    <AboutModal onclose={() => (showAboutModal = false)} />
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
