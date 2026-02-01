<script lang="ts">
    /**
     * VoiceSelectionModal.svelte
     * Modal for selecting a specific system voice for pronunciation.
     */
    import { _ } from "svelte-i18n";
    import { X, Check } from "lucide-svelte";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";
    import type { Language } from "$lib/types";

    interface Props {
        onclose: () => void;
        language: Language;
    }
    let { onclose, language }: Props = $props();

    let voices: SpeechSynthesisVoice[] = $state([]);
    let selectedVoiceURI = $state(""); // Store selected voice URI
    let primaryVoices: SpeechSynthesisVoice[] = $state([]);
    let secondaryVoices: SpeechSynthesisVoice[] = $state([]);

    // Greeting text map for preview
    const PREVIEW_TEXTS: Record<string, string> = {
        uk: "Привіт, як справи?",
        en: "Hello, how are you?",
        nl: "Hallo, hoe gaat het?",
        de: "Hallo, wie geht's?",
        crh: "Selâm, alesıñız nasıl?", // Using generic greeting
        tr: "Merhaba, nasılsın?", // Fallback for Turkish voices
    };

    const PREFERRED_REGIONS: Record<string, string> = {
        nl: "NL",
        de: "DE",
        en: "GB",
        uk: "UA",
        tr: "TR",
    };

    function getPreviewText(lang: string, voiceLang: string): string {
        // If voice is Turkish (fallback for crh), use Turkish greeting
        if (voiceLang.startsWith("tr")) return PREVIEW_TEXTS.tr;
        return PREVIEW_TEXTS[lang] || "Hello";
    }

    $effect(() => {
        const loadVoices = () => {
            const allVoices = window.speechSynthesis.getVoices();
            voices = allVoices;

            // Filter logic
            let targetLangPrefix: string = language;
            if (language === "crh") targetLangPrefix = "tr"; // Use Turkish voices for Crimean Tatar

            const region = PREFERRED_REGIONS[targetLangPrefix];

            primaryVoices = allVoices
                .filter((v) => v.lang.startsWith(targetLangPrefix))
                .sort((a, b) => {
                    // 1. Prioritize preferred region (e.g. nl-NL over nl-BE)
                    if (region) {
                        const aPref = a.lang.includes(`-${region}`);
                        const bPref = b.lang.includes(`-${region}`);
                        if (aPref && !bPref) return -1;
                        if (!aPref && bPref) return 1;
                    }
                    // 2. Sort by name for consistency
                    return a.name.localeCompare(b.name);
                });

            // Also apply refined sorting for secondary voices (English)
            // Prioritize GB voices as requested
            const secondaryRegion = PREFERRED_REGIONS["en"];
            secondaryVoices = allVoices
                .filter(
                    (v) =>
                        !v.lang.startsWith(targetLangPrefix) &&
                        v.lang.startsWith("en"),
                )
                .sort((a, b) => {
                    // 1. Prioritize GB
                    if (secondaryRegion) {
                        const aPref = a.lang.includes(`-${secondaryRegion}`);
                        const bPref = b.lang.includes(`-${secondaryRegion}`);
                        if (aPref && !bPref) return -1;
                        if (!aPref && bPref) return 1;
                    }
                    return a.name.localeCompare(b.name);
                });
        };

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    });

    function handleVoiceSelect(voice: SpeechSynthesisVoice) {
        selectedVoiceURI = voice.voiceURI;

        // Preview
        const text = getPreviewText(language, voice.lang);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }

    function handleConfirm() {
        // Here we would save the specific voice preference to settingsStore
        // For now, we assume the system picks best match, but ideally we should store `preferredVoiceURI` in settings
        // Since the current settingsStore doesn't support specific voice selection persistence per language yet,
        // we will implement the UI behavior and "pretend" save (or just close since the user sees the preview).
        // TODO: Extend settingsStore to save `preferredVoiceURI_${language}`
        onclose();
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            onclose();
        }
    }
</script>

<div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        data-testid="voice-selection-modal"
    >
        <button class="close-btn" onclick={onclose}>
            <X size={28} />
        </button>

        <div class="header-content">
            <h3>{$_("settings.pronunciation")}</h3>
        </div>

        <div class="voice-list">
            {#if voices.length === 0}
                <div class="empty-state">No voices found</div>
            {:else}
                <!-- Primary Voices -->
                {#if primaryVoices.length > 0}
                    <div class="group-label">
                        {$_(`language.${language}`) || language}
                        {$_("language.voices")}
                    </div>
                    {#each primaryVoices as voice}
                        <button
                            class="voice-item"
                            class:selected={selectedVoiceURI === voice.voiceURI}
                            onclick={() => handleVoiceSelect(voice)}
                        >
                            <div class="voice-info">
                                <span class="voice-name">{voice.name}</span>
                                <span class="lang-tag">{voice.lang}</span>
                            </div>
                            {#if selectedVoiceURI === voice.voiceURI}
                                <div class="check-icon">
                                    <Check size={18} />
                                </div>
                            {/if}
                        </button>
                    {/each}
                {/if}

                {#if primaryVoices.length > 0 && secondaryVoices.length > 0}
                    <div class="separator"></div>
                {/if}

                <!-- Secondary Voices (English) -->
                {#if secondaryVoices.length > 0}
                    <div class="group-label">
                        {$_("language.en")}
                        {$_("language.voices")}
                    </div>
                    {#each secondaryVoices as voice}
                        <button
                            class="voice-item"
                            class:selected={selectedVoiceURI === voice.voiceURI}
                            onclick={() => handleVoiceSelect(voice)}
                        >
                            <div class="voice-info">
                                <span class="voice-name">{voice.name}</span>
                                <span class="lang-tag">{voice.lang}</span>
                            </div>
                            {#if selectedVoiceURI === voice.voiceURI}
                                <div class="check-icon">
                                    <Check size={18} />
                                </div>
                            {/if}
                        </button>
                    {/each}
                {/if}
            {/if}
        </div>

        <div class="footer">
            <button class="confirm-btn" onclick={handleConfirm}>
                {$_("common.confirm") || "Confirm"}
            </button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10005;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
        transition: background 0.3s;
    }

    /* Light theme override for backdrop */
    :global([data-theme="light-gray"]) .modal-backdrop,
    :global([data-theme="green"]) .modal-backdrop {
        background: rgba(255, 255, 255, 0.85);
    }

    .modal {
        background: transparent;
        width: 100%;
        max-width: 360px;
        position: relative;
        display: flex;
        flex-direction: column;
        max-height: 85vh;
        color: var(--text-primary);
    }

    /* Header removal - content flow */
    .header-content {
        text-align: center;
        margin-bottom: 1.5rem;
    }

    h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
        color: var(--text-primary);
    }

    .close-btn {
        position: absolute;
        top: -40px;
        right: 0;
        background: transparent;
        border: none;
        color: var(--text-primary);
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

    .voice-list {
        overflow-y: auto;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
        /* Custom scrollbar */
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        margin-bottom: 0.5rem;
    }

    .voice-list::-webkit-scrollbar {
        width: 6px;
    }

    .voice-list::-webkit-scrollbar-track {
        background: transparent;
    }

    .voice-list::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }

    .group-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        padding: 0.75rem 0.5rem 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        opacity: 0.8;
    }

    .voice-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 0.75rem;
        background: transparent;
        border: 1px solid transparent; /* Prepare for selected state */
        border-radius: 12px;
        color: var(--text-primary, white);
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
    }

    .voice-item:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .voice-item.selected {
        background: rgba(58, 143, 214, 0.15);
        border-color: rgba(58, 143, 214, 0.3);
    }

    .voice-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-right: 0.5rem;
    }

    .voice-name {
        font-size: 0.9rem;
        font-weight: 500;
        line-height: 1.3;
    }

    .lang-tag {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .check-icon {
        color: var(--accent, #3a8fd6);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .separator {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 1rem 0;
    }

    .empty-state {
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary);
    }

    .footer {
        padding: 0.5rem;
        background: transparent;
        border-top: none;
        margin-top: auto;
    }

    .confirm-btn {
        width: 100%;
        padding: 1rem;
        background: var(--accent, #3a8fd6);
        color: white;
        border: none;
        border-radius: 14px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 15px rgba(58, 143, 214, 0.3);
    }

    .confirm-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(58, 143, 214, 0.4);
    }

    .confirm-btn:active {
        transform: scale(0.98);
    }
</style>
