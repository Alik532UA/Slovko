<script lang="ts">
    /**
     * AboutModal — Про проєкт
     */
    import { _ } from "svelte-i18n";
    import { X } from "lucide-svelte";
    import { versionStore } from "$lib/stores/versionStore.svelte";

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

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
        id="about-modal"
    >
        <button
            class="close-btn"
            onclick={onclose}
            aria-label="Close"
            data-testid="close-about-modal-btn"
        >
            <X size={28} />
        </button>

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

            <p class="version">
                {$_("about.version")}: {versionStore.currentVersion || "0.1"}
            </p>
        </div>
    </div>
</div>

<style>
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

    .close-btn {
        position: absolute;
        top: -60px;
        right: 0;
        background: transparent;
        border: none;
        color: var(--text-primary); /* Use primary text color */
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        display: flex;
        transition: all 0.2s;
    }

    .close-btn:hover {
        color: var(--accent);
        transform: scale(1.1);
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

    .version {
        color: var(--text-secondary);
        font-size: 0.85rem;
        margin: 0;
        opacity: 0.8;
    }

    @media (max-width: 480px) {
        .description {
            font-size: 1rem;
        }

        .close-btn {
            top: -50px;
        }
    }
</style>
