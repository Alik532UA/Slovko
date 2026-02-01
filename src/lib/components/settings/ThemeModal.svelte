<script lang="ts">
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import type { AppTheme } from "$lib/types";
    import { X, Check } from "lucide-svelte";
    import { _ } from "svelte-i18n";

    let { onclose }: { onclose: () => void } = $props();

    const themes: { id: AppTheme; color: string }[] = [
        { id: "dark-gray", color: "#23272f" },
        { id: "light-gray", color: "#f5f6fa" },
        {
            id: "purple",
            color: "linear-gradient(135deg, #77216f, #e95420)",
        },
        { id: "green", color: "#b2f7b8" },
    ];

    function selectTheme(theme: AppTheme) {
        settingsStore.setTheme(theme);
    }
</script>

<div class="modal-backdrop" onclick={onclose} role="presentation">
    <div
        class="modal-content"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
    >
        <div class="modal-header">
            <h2>{$_("settings.theme") || "Theme"}</h2>
            <button class="close-btn" onclick={onclose}>
                <X size={24} />
            </button>
        </div>

        <div class="themes-grid">
            {#each themes as theme}
                <button
                    class="theme-card"
                    class:selected={settingsStore.value.theme === theme.id}
                    onclick={() => selectTheme(theme.id)}
                    style="--theme-preview-bg: {theme.color}"
                >
                    <div class="theme-preview">
                        {#if settingsStore.value.theme === theme.id}
                            <div class="check-icon">
                                <Check
                                    size={24}
                                    color={theme.id === "light-gray" ||
                                    theme.id === "green"
                                        ? "#000"
                                        : "#fff"}
                                />
                            </div>
                        {/if}
                    </div>
                    <span class="theme-name">{$_(`theme.${theme.id}`)}</span>
                </button>
            {/each}
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
        transition: background 0.3s;
    }

    /* Light theme override for backdrop */
    :global([data-theme="light-gray"]) .modal-backdrop,
    :global([data-theme="green"]) .modal-backdrop {
        background: rgba(255, 255, 255, 0.9);
    }

    .modal-content {
        background: transparent;
        width: 90%;
        max-width: 500px;
        position: relative;
        color: var(--text-primary);
    }

    .modal-header {
        display: flex;
        justify-content: center; /* Center the title */
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--text-primary);
    }

    .close-btn {
        position: absolute;
        top: -60px;
        right: 0;
        background: transparent;
        border: none;
        color: var(--text-primary);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover {
        color: var(--accent);
        background: transparent; /* Remove background hover */
        transform: scale(1.1);
    }

    .themes-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }

    .theme-card {
        background: var(--bg-primary);
        border: 2px solid var(--border);
        border-radius: 12px;
        padding: 1rem;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        transition:
            transform 0.2s,
            border-color 0.2s;
    }

    .theme-card:hover {
        transform: scale(1.02);
        border-color: var(--text-secondary);
    }

    .theme-card.selected {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent);
    }

    .theme-preview {
        width: 100%;
        height: 60px;
        border-radius: 8px;
        background: var(--theme-preview-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .theme-name {
        color: var(--text-primary);
        font-weight: 500;
        font-size: 0.9rem;
    }

    .check-icon {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 50%;
        padding: 4px;
        display: flex;
    }
</style>
