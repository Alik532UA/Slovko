<script lang="ts">
    /**
     * AboutModal — Про проєкт
     */
    import { _ } from "svelte-i18n";
    import { X } from "lucide-svelte";

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
    <div class="modal">
        <button class="close-btn" onclick={onclose} aria-label="Close">
            <X size={28} />
        </button>

        <div class="content">
            <p class="description">{$_("about.description")}</p>

            <div class="links">
                <a
                    href="https://send.monobank.ua/jar/7sCsydhJnR/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-btn donate"
                >
                    {$_("about.support")}
                </a>

                <a
                    href="https://alik532ua.github.io/CV/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-btn cv"
                >
                    {$_("about.developer")}
                </a>
            </div>

            <p class="version">{$_("about.version")}: 0.1</p>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10002;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1.5rem;
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
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        display: flex;
        transition: all 0.2s;
    }

    .close-btn:hover {
        color: var(--text-primary);
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
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
        border-color: rgba(255, 255, 255, 0.1);
    }

    .cv:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
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
