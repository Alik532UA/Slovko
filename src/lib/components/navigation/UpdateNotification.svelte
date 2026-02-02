<script lang="ts">
    import { _ } from "svelte-i18n";
    import { RefreshCw, ShieldCheck, AlertTriangle } from "lucide-svelte";
    import { applyUpdate, skipUpdate } from "$lib/services/versionService";
    import { fade, scale } from "svelte/transition";
    import { onMount } from "svelte";

    interface Props {
        version: string; // Server version
    }
    let { version }: Props = $props();
    let isUpdating = $state(false);
    let localVersion = $state<string | null>(null);

    onMount(() => {
        localVersion = localStorage.getItem("app_cache_version");
    });

    async function handleUpdate() {
        if (isUpdating) return;
        isUpdating = true;
        await applyUpdate();
    }

    function handleSkip() {
        skipUpdate();
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            handleSkip();
        }
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    class="modal-backdrop"
    transition:fade={{ duration: 200 }}
    onclick={handleSkip}
    onkeydown={handleKeydown}
    role="presentation"
>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="modal"
        transition:scale={{ duration: 300, start: 0.9 }}
        onclick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
    >
        <div class="content">
            <div class="header">
                <AlertTriangle size={48} class="warning-icon" />
                <div class="message">
                    <span class="text">{$_("updateNotification.message")}</span>
                    <div class="version-info">
                        <span class="version-tag">
                            {$_("updateNotification.yourVersion")}: <b>{localVersion || "???"}</b>
                        </span>
                        <span class="version-tag">
                            {$_("updateNotification.availableVersion")}: <b>{version}</b>
                        </span>
                    </div>
                </div>
            </div>

            <p class="warning-text">{$_("updateNotification.warning")}</p>

            <div class="actions">
                <button
                    class="update-btn full"
                    onclick={handleUpdate}
                    disabled={isUpdating}
                    data-testid="apply-update-btn"
                >
                    {#if isUpdating}
                        <div class="spinner"></div>
                    {:else}
                        <RefreshCw size={20} />
                    {/if}
                    {$_("updateNotification.button")}
                </button>

                <button
                    class="update-btn outline"
                    onclick={handleSkip}
                    disabled={isUpdating}
                    data-testid="skip-update-btn"
                >
                    <ShieldCheck size={20} />
                    {$_("updateNotification.buttonSkip")}
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10002;
        background: rgba(0, 0, 0, 0.82);
        backdrop-filter: blur(12px);
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 2rem 1rem;
        overflow-y: auto;
    }

    .modal {
        background: transparent;
        max-width: 480px;
        width: 100%;
        position: relative;
        color: var(--text-primary);
        margin: auto 0;
    }

    .content {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 1rem;
    }

    .header {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;
    }

    .message {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .text {
        font-weight: 800;
        font-size: 1.8rem;
        color: var(--text-primary);
        line-height: 1.1;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .version-info {
        display: flex;
        gap: 1.5rem;
        justify-content: center;
    }

    .version-tag {
        font-size: 0.9rem;
        color: var(--text-secondary);
    }

    .version-tag b {
        color: var(--text-primary);
        font-family: monospace;
    }

    :global(.warning-icon) {
        color: #ff9800;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }

    .warning-text {
        font-size: 1.1rem;
        line-height: 1.5;
        color: var(--text-primary);
        margin: 0;
        opacity: 0.9;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;
        width: 100%;
    }

    .update-btn {
        padding: 1rem 2rem;
        border-radius: 16px;
        font-weight: 700;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.8rem;
        transition: all 0.2s;
        cursor: pointer;
        width: 100%;
        max-width: 360px;
        border: 2px solid transparent;
    }

    .update-btn.full {
        background: var(--accent);
        color: white;
        box-shadow: 0 4px 15px rgba(58, 143, 214, 0.3);
    }

    .update-btn.outline {
        background: transparent;
        border-color: var(--border);
        color: var(--text-primary);
    }

    .update-btn:hover:not(:disabled) {
        transform: translateY(-2px);
    }

    .update-btn.full:hover:not(:disabled) {
        background: var(--accent-hover);
        box-shadow: 0 6px 20px rgba(58, 143, 214, 0.4);
    }

    .update-btn.outline:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.05);
        border-color: var(--text-secondary);
    }

    .update-btn:active:not(:disabled) {
        transform: scale(0.98);
    }

    .update-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    @media (max-width: 480px) {
        .text {
            font-size: 1.5rem;
        }
        .version-info {
            flex-direction: column;
            gap: 4px;
        }
    }
</style>