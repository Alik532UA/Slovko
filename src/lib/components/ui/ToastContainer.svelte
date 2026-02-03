<script lang="ts">
    import { notificationStore } from "$lib/stores/notificationStore.svelte";
    import { X } from "lucide-svelte";
    import { fade, fly } from "svelte/transition";
</script>

<div class="toast-container">
    {#each notificationStore.value as note (note.id)}
        <div
            class="toast {note.type}"
            in:fly={{ y: 20, duration: 300 }}
            out:fade={{ duration: 200 }}
            role="alert"
        >
            <span>{note.message}</span>
            <button
                class="close-btn"
                onclick={() => notificationStore.remove(note.id)}
            >
                <X size={16} />
            </button>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 9999;
        pointer-events: none;
    }

    .toast {
        pointer-events: auto;
        background: var(--bg-secondary);
        color: var(--text-primary);
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 250px;
        max-width: 400px;
        border-left: 4px solid transparent;
        font-size: 0.9rem;
    }

    .toast.info {
        border-left-color: var(--toast-info, #3b82f6);
    }
    .toast.success {
        border-left-color: var(--toast-success, #22c55e);
    }
    .toast.warning {
        border-left-color: var(--toast-warning, #f59e0b);
    }
    .toast.error {
        border-left-color: var(--toast-error, #ef4444);
    }

    .close-btn {
        margin-left: auto;
        opacity: 0.6;
        transition: opacity 0.2s;
        display: flex;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        color: inherit;
    }
    .close-btn:hover {
        opacity: 1;
    }
</style>
