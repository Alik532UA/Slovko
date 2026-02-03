<script lang="ts">
    /**
     * AboutModal — Про проєкт
     */
    import { _ } from "svelte-i18n";
    import { versionStore } from "$lib/stores/versionStore.svelte";
    import { fade } from "svelte/transition";
    import { hardReset } from "$lib/services/resetService";
    import FeedbackModal from "./FeedbackModal.svelte";
    import BaseModal from "../ui/BaseModal.svelte";

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

    let showDevMenu = $state(false);
    let showFeedback = $state(false);

    async function handleHardReset() {
        await hardReset(true);
    }
</script>

<BaseModal {onclose} testid="about-modal">
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

            <button
                class="link-btn feedback"
                data-testid="about-feedback-link"
                onclick={() => (showFeedback = true)}
            >
                {$_("about.feedback.title")}
            </button>

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
                {$_("about.version")}: {versionStore.currentVersion || "0.1"}
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

        <button
            class="confirm-btn primary-action-btn"
            onclick={onclose}
            data-testid="close-about-btn"
        >
            {$_("common.backToLearning")}
        </button>
    </div>
</BaseModal>

{#if showFeedback}
    <FeedbackModal onclose={() => (showFeedback = false)} />
{/if}

<style>
    .content {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 0.5rem;
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
        cursor: pointer;
        font-size: 1rem;
        font-family: inherit;
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

    .cv,
    .feedback {
        background: transparent;
        color: var(--text-primary);
        border-color: var(--border);
    }

    .cv:hover,
    .feedback:hover {
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

    .confirm-btn {
        width: 100%;
        max-width: 320px;
        align-self: center;
    }
</style>
