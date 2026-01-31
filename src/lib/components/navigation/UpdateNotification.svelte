<script lang="ts">
    import { _ } from "svelte-i18n";
    import { RefreshCw } from "lucide-svelte";
    import { applyUpdate } from "$lib/services/versionService";
    import { fly } from "svelte/transition";

    interface Props {
        version: string;
    }
    let { version }: Props = $props();
</script>

<div class="update-notification" transition:fly={{ y: 50, duration: 400 }}>
    <div class="message">
        <span class="text">{$_("updateNotification.message")}</span>
        <span class="version">v{version}</span>
    </div>
    <button
        class="update-btn"
        onclick={applyUpdate}
        data-testid="apply-update-btn"
    >
        <RefreshCw size={18} />
        {$_("updateNotification.button")}
    </button>
</div>

<style>
    .update-notification {
        position: fixed;
        bottom: 80px; /* Над BottomBar */
        left: 50%;
        transform: translateX(-50%);
        z-index: 10001;
        background: var(--bg-secondary);
        border: 2px solid var(--selected-border);
        border-radius: 12px;
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        width: calc(100% - 2rem);
        max-width: 400px;
    }

    .message {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .text {
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--text-primary);
    }

    .version {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .update-btn {
        background: var(--selected-border);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;
        white-space: nowrap;
    }

    .update-btn:hover {
        transform: translateY(-1px);
        filter: brightness(1.1);
    }

    .update-btn:active {
        transform: translateY(0);
    }

    @media (max-width: 480px) {
        .update-notification {
            flex-direction: column;
            gap: 0.75rem;
            text-align: center;
            bottom: 90px;
        }

        .update-btn {
            width: 100%;
            justify-content: center;
        }
    }
</style>
