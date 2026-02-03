<script lang="ts">
    /**
     * LanguageSettings — Налаштування мов
     * Красиве вікно з прапорами
     */
    import { _ } from "svelte-i18n";
    import { X, Speech, Captions } from "lucide-svelte";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import VoiceSelectionModal from "./VoiceSelectionModal.svelte";
    import { setInterfaceLanguage, LANGUAGES } from "$lib/i18n/init";
    import { LANGUAGE_NAMES, type Language } from "$lib/types";
    import { base } from "$app/paths";

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let isLongPress = false;
    let showVoiceSelection = $state(false);

    function handleInterfaceLanguage(lang: Language) {
        settingsStore.setInterfaceLanguage(lang);
        setInterfaceLanguage(lang);
    }

    let currentSide = $state<"source" | "target" | null>(null);

    function handlePointerDown(e: PointerEvent, side: "source" | "target") {
        isLongPress = false;
        currentSide = side;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            showVoiceSelection = true;
        }, 800); // 0.8s long press for better UX
    }

    function handleContextMenu(e: MouseEvent, side: "source" | "target") {
        e.preventDefault();
        currentSide = side;
        showVoiceSelection = true;
    }

    function handlePointerUp() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }

        // Toggle only if it wasn't a long press and modal didn't open
        if (!isLongPress && !showVoiceSelection && currentSide) {
            if (currentSide === "source") {
                settingsStore.togglePronunciationSource();
            } else {
                settingsStore.togglePronunciationTarget();
            }
        }

        // Reset state
        if (!showVoiceSelection) {
            currentSide = null;
        }
        isLongPress = false;
    }

    function handlePointerLeave() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
        if (!showVoiceSelection) {
            currentSide = null;
        }
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

{#if showVoiceSelection}
    <VoiceSelectionModal
        onclose={() => (showVoiceSelection = false)}
        language={currentSide === "source"
            ? settingsStore.value.sourceLanguage
            : settingsStore.value.targetLanguage}
    />
{/if}

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
        data-testid="language-settings-modal"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
    >
        <div class="content">
            <!-- Мова інтерфейсу -->
            <section>
                <h3>{$_("settings.interfaceLanguage")}</h3>
                <div class="flags-row">
                    {#each LANGUAGES as lang}
                        <button
                            class="flag-btn"
                            class:selected={settingsStore.value
                                .interfaceLanguage === lang}
                            onclick={() => handleInterfaceLanguage(lang)}
                            title={LANGUAGE_NAMES[lang]}
                            data-testid="interface-lang-{lang}"
                        >
                            <img
                                src="{base}/flags/{lang}.svg"
                                alt={LANGUAGE_NAMES[lang]}
                                class="flag-img"
                            />
                        </button>
                    {/each}
                </div>
            </section>

            <div class="separator"></div>

            <!-- Мови карток -->
            <section>
                <div class="card-langs">
                    <!-- З мови (Ліва колонка) -->
                    <div class="lang-column">
                        <div class="column-header">
                            <h4 class="column-title">
                                {$_("settings.sourceLanguage")}
                            </h4>
                        </div>
                        <div class="flags-column">
                            {#each LANGUAGES as lang}
                                <button
                                    class="flag-btn small"
                                    class:selected={settingsStore.value
                                        .sourceLanguage === lang}
                                    onclick={() => {
                                        if (
                                            lang ===
                                            settingsStore.value.targetLanguage
                                        ) {
                                            settingsStore.setCardLanguages(
                                                lang,
                                                settingsStore.value
                                                    .sourceLanguage,
                                            );
                                        } else {
                                            settingsStore.setCardLanguages(
                                                lang,
                                                settingsStore.value
                                                    .targetLanguage,
                                            );
                                        }
                                    }}
                                    title={LANGUAGE_NAMES[lang]}
                                    data-testid="source-lang-{lang}"
                                >
                                    <img
                                        src="{base}/flags/{lang}.svg"
                                        alt={LANGUAGE_NAMES[lang]}
                                        class="flag-img"
                                    />
                                </button>
                            {/each}
                        </div>

                        <div class="controls-wrapper">
                            <!-- Transcription Toggle -->
                            <button
                                class="icon-btn small"
                                class:active={settingsStore.value
                                    .showTranscriptionSource}
                                onclick={() =>
                                    settingsStore.toggleTranscriptionSource()}
                                title={$_("settings.transcription")}
                                data-testid="transcription-left-btn"
                            >
                                <Captions size={16} />
                            </button>

                            <!-- Pronunciation Toggle -->
                            <button
                                class="icon-btn small"
                                class:active={settingsStore.value
                                    .enablePronunciationSource}
                                onpointerdown={(e) =>
                                    handlePointerDown(e, "source")}
                                onpointerup={handlePointerUp}
                                onpointerleave={handlePointerLeave}
                                oncontextmenu={(e) =>
                                    handleContextMenu(e, "source")}
                                title={$_("settings.pronunciation")}
                                data-testid="pronunciation-left-btn"
                            >
                                <Speech size={16} />
                            </button>
                        </div>
                    </div>

                    <!-- На мову (Права колонка) -->
                    <div class="lang-column">
                        <div class="column-header">
                            <h4 class="column-title">
                                {$_("settings.targetLanguage")}
                            </h4>
                        </div>

                        <div class="flags-column">
                            {#each LANGUAGES as lang}
                                <button
                                    class="flag-btn small"
                                    class:selected={settingsStore.value
                                        .targetLanguage === lang}
                                    onclick={() => {
                                        if (
                                            lang ===
                                            settingsStore.value.sourceLanguage
                                        ) {
                                            settingsStore.setCardLanguages(
                                                settingsStore.value
                                                    .targetLanguage,
                                                lang,
                                            );
                                        } else {
                                            settingsStore.setCardLanguages(
                                                settingsStore.value
                                                    .sourceLanguage,
                                                lang,
                                            );
                                        }
                                    }}
                                    title={LANGUAGE_NAMES[lang]}
                                    data-testid="target-lang-{lang}"
                                >
                                    <img
                                        src="{base}/flags/{lang}.svg"
                                        alt={LANGUAGE_NAMES[lang]}
                                        class="flag-img"
                                    />
                                </button>
                            {/each}
                        </div>

                        <div class="controls-wrapper">
                            <!-- Transcription Toggle -->
                            <button
                                class="icon-btn small"
                                class:active={settingsStore.value
                                    .showTranscriptionTarget}
                                onclick={() =>
                                    settingsStore.toggleTranscriptionTarget()}
                                title={$_("settings.transcription")}
                                data-testid="transcription-right-btn"
                            >
                                <Captions size={16} />
                            </button>

                            <!-- Pronunciation Toggle -->
                            <button
                                class="icon-btn small"
                                class:active={settingsStore.value
                                    .enablePronunciationTarget}
                                onpointerdown={(e) =>
                                    handlePointerDown(e, "target")}
                                onpointerup={handlePointerUp}
                                onpointerleave={handlePointerLeave}
                                oncontextmenu={(e) =>
                                    handleContextMenu(e, "target")}
                                title={$_("settings.pronunciation")}
                                data-testid="pronunciation-right-btn"
                            >
                                <Speech size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <button
                class="confirm-btn"
                onclick={onclose}
                data-testid="confirm-language-settings-btn"
            >
                {$_("common.confirm")}
            </button>
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
        flex-direction: column;
        /* justify-content: center; - Removed to fix scroll clipping */
        align-items: center;
        padding: 1.5rem 0;
        overflow-y: auto;
        /* Smooth transition for theme switch */
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
        /* Ensure text color inherits correctly from body/theme */
        color: var(--text-primary);
        margin: auto;
        padding: 0 1.5rem;
    }

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
        transition:
            transform 0.2s,
            background 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .confirm-btn:hover {
        background: var(--accent-hover);
        transform: translateY(-2px);
    }

    .confirm-btn:active {
        transform: scale(0.98);
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        align-items: center;
    }

    section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        align-items: center;
        width: 100%;
    }

    h3 {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(
            --text-primary
        ); /* Changed to primary for better contrast on backdrop */
        text-align: center;
    }

    .flags-row {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap; /* Дозволити перенос прапорів */
        padding: 0.5rem;
    }

    .flags-column {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        align-items: center;
        padding: 0.5rem;
    }

    .flag-btn {
        width: 64px;
        height: 42px;
        padding: 0;
        background: transparent;
        border: 3px solid transparent;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        overflow: hidden;
        opacity: 0.6;
    }

    .flag-btn:hover:not(:disabled) {
        opacity: 1;
        transform: scale(1.08);
    }

    .flag-btn.selected {
        border-color: var(--selected-border);
        opacity: 1;
        box-shadow: 0 0 16px rgba(58, 143, 214, 0.5);
        transform: scale(1.3);
        z-index: 2;
    }

    .flag-btn.small {
        width: 56px;
        height: 36px;
        border-radius: 8px;
        border-width: 2px;
    }

    .flag-btn:disabled {
        opacity: 0.25;
        cursor: not-allowed;
    }

    .flag-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 7px;
    }

    .flag-btn.small .flag-img {
        border-radius: 6px;
    }

    .card-langs {
        display: flex;
        justify-content: center;
        gap: 2rem;
    }

    .lang-column {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .icon-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: var(--text-secondary);
        padding: 0.5rem;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .icon-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
    }

    .icon-btn:active {
        transform: scale(0.95);
    }

    .icon-btn.active {
        background: var(--selected-border);
        color: white;
        border-color: var(--selected-border);
        box-shadow: 0 0 12px rgba(58, 143, 214, 0.4);
    }

    .column-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .column-title {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--text-secondary);
        text-align: center;
        white-space: nowrap;
        line-height: 1.2;
    }

    .controls-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .icon-btn.small {
        padding: 0.35rem;
        border-radius: 8px;
    }

    .separator {
        width: 100%;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
    }
</style>
