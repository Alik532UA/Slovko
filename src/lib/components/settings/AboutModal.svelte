<script lang="ts">
    /**
     * AboutModal — Про проєкт
     */
    import { _ } from "svelte-i18n";
    import { X } from "lucide-svelte";
    import { versionStore } from "$lib/stores/versionStore.svelte";

    import { fade } from "svelte/transition";
    import { hardReset } from "$lib/services/resetService";

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

    let showDevMenu = $state(false);

    async function handleHardReset() {
        await hardReset(true);
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            onclose();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            onclose();
        }
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
>
    <div
        class="modal"
        data-testid="about-modal"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
    >
        <div class="content">
            <p class="description">{$_("about.description")}</p>

            <div class="links">
                <a
                    href="https://send.monobank.ua/jar/7sCsydhJnR"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-btn donate"
                    data-testid="about-donate-link"
                >
                    {$_("about.support")}
                </a>

                <a
                    href="https://alik532ua.github.io/CV/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-btn cv"
                    data-testid="about-cv-link"
                >
                    {$_("about.developer")}
                </a>
            </div>

            <div class="version-wrapper">
                <button
                    class="version-btn"
                    onclick={() => (showDevMenu = !showDevMenu)}
                    data-testid="about-version-btn"
                >
                    {$_("about.version")}: {versionStore.currentVersion ||
                        "0.1"}
                </button>

                {#if showDevMenu}
                    <div class="dev-menu" transition:fade>
                        <button
                            class="dev-item danger"
                            onclick={handleHardReset}
                            data-testid="about-hard-reset-btn"
                        >
                            Clear Cache & Reset
                        </button>
                        <button
                            class="dev-item"
                            onclick={() => (showDevMenu = false)}
                            data-testid="about-cancel-reset-btn"
                        >
                            Cancel
                        </button>
                    </div>
                {/if}
            </div>

            <button class="confirm-btn" onclick={onclose} data-testid="close-about-btn">
                {$_("common.backToLearning")}
            </button>
        </div>
    </div>
</div>

<style>
    .confirm-btn {
        margin-top: 1rem;
        padding: 0.8rem 2.5rem;
        font-size: 1.1rem;
        font-weight: 600;
        background: var(--accent);
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s, background 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 320px;
        align-self: center;
    }

    .confirm-btn:hover {
        background: var(--accent-hover);
        transform: translateY(-2px);
    }

    .confirm-btn:active {
        transform: scale(0.98);
    }

    .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10002;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1.5rem;
        transition: background 0.3s;
    }

    /* Light theme override for backdrop */
    :global([data-theme="light-gray"]) .modal-backdrop,
    :global([data-theme="green"]) .modal-backdrop {
        background: rgba(255, 255, 255, 0.9);
    }

    .modal {
        background: transparent;
        max-width: 480px;
        width: 100%;
        position: relative;
        color: var(--text-primary);
    }

    .content {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 1rem;
    }

    .description {
        font-size: 1.15rem;
        line-height: 1.6;
        margin: 0;
        font-weight: 400;
        color: var(--text-primary);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .links {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;
    }

    .link-btn {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s;
        width: 100%;
        max-width: 280px;
        border: 2px solid transparent;
    }

    .donate {
        background: var(--accent);
        color: white;
        box-shadow: 0 4px 12px rgba(58, 143, 214, 0.3);
    }

    .donate:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(58, 143, 214, 0.4);
    }

    .cv {
        background: transparent;
        color: var(--text-primary);
        border-color: var(--border);
    }

    .cv:hover {
        background: var(--bg-secondary);
        border-color: var(--text-secondary);
    }

    .version-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .version-btn {
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-secondary);
        font-size: 0.85rem;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        transition: all 0.2s;
        opacity: 0.8;
    }

    .version-btn:hover {
        background: var(--bg-secondary);
        opacity: 1;
    }

    .dev-menu {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        white-space: nowrap;
        margin-bottom: 0.5rem;
        z-index: 10;
    }

    .dev-item {
        background: transparent;
        border: none;
        padding: 0.5rem 1rem;
        cursor: pointer;
        color: var(--text-primary);
        font-size: 0.9rem;
        border-radius: 8px;
        transition: background 0.2s;
        text-align: center;
    }

    .dev-item:hover {
        background: rgba(128, 128, 128, 0.1);
    }

    .dev-item.danger {
        color: #ef4444;
        font-weight: 500;
        background: rgba(239, 68, 68, 0.1);
    }

    .dev-item.danger:hover {
        background: rgba(239, 68, 68, 0.2);
    }

    @media (max-width: 480px) {
        .modal {
            max-height: 100vh;
            border-radius: 0;
        }
    }
</style>
