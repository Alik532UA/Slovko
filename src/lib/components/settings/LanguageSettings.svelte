<script lang="ts">
    /**
     * LanguageSettings — Налаштування мов
     * Красиве вікно з прапорами
     */
    import { _ } from "svelte-i18n";
    import { X } from "lucide-svelte";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import { setInterfaceLanguage } from "$lib/i18n/init";
    import { LANGUAGE_NAMES, type Language } from "$lib/types";
    import { base } from "$app/paths";

    interface Props {
        onclose: () => void;
    }
    let { onclose }: Props = $props();

    const LANGUAGES: Language[] = ["uk", "en", "crh", "nl", "de"];

    // Чи показувати опцію транскрипції (тільки якщо одна з мов карток — англійська)
    const showTranscriptionOption = $derived(
        settingsStore.value.sourceLanguage === "en" ||
            settingsStore.value.targetLanguage === "en",
    );

    function handleInterfaceLanguage(lang: Language) {
        settingsStore.setInterfaceLanguage(lang);
        setInterfaceLanguage(lang);
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
    <div class="modal">
        <!-- Тільки кнопка закриття -->
        <button
            class="close-btn"
            onclick={onclose}
            aria-label="Close"
            data-testid="close-language-modal-btn"
        >
            <X size={28} />
        </button>

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

            <!-- Мови карток -->
            <section>
                <h3>{$_("settings.cardLanguages")}</h3>
                <div class="card-langs">
                    <!-- З мови -->
                    <div class="lang-column">
                        <div class="flags-column">
                            {#each LANGUAGES as lang}
                                <button
                                    class="flag-btn small"
                                    class:selected={settingsStore.value
                                        .sourceLanguage === lang}
                                    class:disabled={settingsStore.value
                                        .targetLanguage === lang}
                                    onclick={() => {
                                        if (
                                            lang !==
                                            settingsStore.value.targetLanguage
                                        ) {
                                            settingsStore.setCardLanguages(
                                                lang,
                                                settingsStore.value
                                                    .targetLanguage,
                                            );
                                        }
                                    }}
                                    title={LANGUAGE_NAMES[lang]}
                                    disabled={lang ===
                                        settingsStore.value.targetLanguage}
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
                    </div>

                    <!-- На мову -->
                    <div class="lang-column">
                        <div class="flags-column">
                            {#each LANGUAGES as lang}
                                <button
                                    class="flag-btn small"
                                    class:selected={settingsStore.value
                                        .targetLanguage === lang}
                                    class:disabled={settingsStore.value
                                        .sourceLanguage === lang}
                                    onclick={() => {
                                        if (
                                            lang !==
                                            settingsStore.value.sourceLanguage
                                        ) {
                                            settingsStore.setCardLanguages(
                                                settingsStore.value
                                                    .sourceLanguage,
                                                lang,
                                            );
                                        }
                                    }}
                                    title={LANGUAGE_NAMES[lang]}
                                    disabled={lang ===
                                        settingsStore.value.sourceLanguage}
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
                    </div>
                </div>
            </section>

            <!-- Транскрипція toggle — тільки якщо є англійська -->
            {#if showTranscriptionOption}
                <section class="toggle-section">
                    <label class="toggle">
                        <input
                            type="checkbox"
                            checked={settingsStore.value.showTranscription}
                            onchange={() => settingsStore.toggleTranscription()}
                            data-testid="transcription-toggle"
                        />
                        <span class="slider"></span>
                        <span class="toggle-label">
                            {$_("settings.transcription")}
                            <img
                                src="{base}/flags/en.svg"
                                alt="English"
                                class="flag-mini"
                            />
                        </span>
                    </label>

                    <label class="toggle">
                        <input
                            type="checkbox"
                            checked={settingsStore.value.enablePronunciation}
                            onchange={() => settingsStore.togglePronunciation()}
                            data-testid="pronunciation-toggle"
                        />
                        <span class="slider"></span>
                        <span class="toggle-label">
                            {$_("settings.pronunciation")}
                            <img
                                src="{base}/flags/en.svg"
                                alt="English"
                                class="flag-mini"
                            />
                        </span>
                    </label>
                </section>
            {/if}
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10002;
        /* Default dark backdrop, overridden by light theme */
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
        /* Smooth transition for theme switch */
        transition: background 0.3s;
    }

    /* Light theme override for backdrop */
    :global([data-theme="light-gray"]) .modal-backdrop,
    :global([data-theme="green"]) .modal-backdrop {
        background: rgba(255, 255, 255, 0.85);
    }

    .modal {
        background: transparent;
        max-width: 320px;
        width: 100%;
        position: relative;
        /* Ensure text color inherits correctly from body/theme */
        color: var(--text-primary);
    }

    .close-btn {
        position: absolute;
        top: -40px;
        right: 0;
        background: transparent;
        border: none;
        color: var(
            --text-primary
        ); /* Use primary text color for better visibility */
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        display: flex;
        transition: all 0.2s;
    }

    .close-btn:hover {
        color: var(--text-primary);
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
        gap: 0.75rem;
        justify-content: center;
        flex-wrap: wrap; /* Дозволити перенос прапорів */
    }

    .flags-column {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
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
    }

    .flag-btn.small {
        width: 56px;
        height: 36px;
        border-radius: 8px;
        border-width: 2px;
    }

    .flag-btn.disabled,
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

    .toggle-section {
        padding-top: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .toggle {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
    }

    .toggle input {
        display: none;
    }

    .slider {
        position: relative;
        width: 48px;
        height: 26px;
        background: rgba(
            128,
            128,
            128,
            0.3
        ); /* Neutral gray transparency works on both dark and light */
        border-radius: 13px;
        transition: background 0.2s;
    }

    .slider::before {
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s;
    }

    .toggle input:checked + .slider {
        background: var(--selected-border);
    }

    .toggle input:checked + .slider::before {
        transform: translateX(22px);
    }

    .toggle-label {
        color: var(--text-primary);
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .flag-mini {
        width: 24px;
        height: 16px;
        border-radius: 5px;
        object-fit: cover;
    }
</style>
