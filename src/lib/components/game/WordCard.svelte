<script lang="ts">
    /**
     * WordCard.svelte — Картка слова
     * SoC: тільки відображення та передача подій
     * Підтримка транскрипції та озвучування
     */
    import type { ActiveCard } from "$lib/types";
    import { speakText } from "$lib/services/speechService";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";

    interface Props {
        card: ActiveCard;
        onclick: () => void;
        onlongpress?: (e: PointerEvent) => void;
    }

    let { card, onclick, onlongpress }: Props = $props();

    let showTranscription = $derived.by(() => {
        if (card.language === settingsStore.value.sourceLanguage) {
            return settingsStore.value.showTranscriptionSource;
        }
        if (card.language === settingsStore.value.targetLanguage) {
            return settingsStore.value.showTranscriptionTarget;
        }
        return false;
    });

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let isLongPress = false;

    function handlePointerDown(e: PointerEvent) {
        // Дозволяємо лонг-прес на будь-якій картці (навіть правильній, щоб наприклад видалити з обраного)
        // Але якщо disabled (статус correct), події миші можуть не спрацьовувати?
        // Button with disabled=true blocks events.
        // We disabled it in markup: disabled={card.status === "correct"}
        // If we want context menu on correct cards, we must NOT disable it, or wrap it.
        // Or remove `disabled` attribute and handle logic in click.
        // Current code has disabled={card.status === "correct"}.
        // This blocks onclick. It also blocks onpointerdown usually.
        // I will remove `disabled` attribute and check status in handlers.

        longPressTimer = setTimeout(() => {
            isLongPress = true;
            if (onlongpress) onlongpress(e);
        }, 500);
    }

    // ... existing handlers ... same as before ...

    function handlePointerUp() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    function handlePointerLeave() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    function handleClick(e: MouseEvent) {
        // Запобігаємо спливанню події
        e.stopPropagation();

        if (isLongPress) {
            isLongPress = false;
            return;
        }

        // Якщо картка вже "правильна", ігноруємо клік (емулюємо disabled)
        if (card.status === "correct") return;

        // Check which side this card belongs to and if pronunciation is enabled for it
        const isSource = card.language === settingsStore.value.sourceLanguage;
        const isTarget = card.language === settingsStore.value.targetLanguage;

        let shouldSpeak = false;

        if (isSource && settingsStore.value.enablePronunciationSource) {
            shouldSpeak = true;
        } else if (isTarget && settingsStore.value.enablePronunciationTarget) {
            shouldSpeak = true;
        }

        // Speak only if selecting (not deselecting)
        if (shouldSpeak && card.status !== "selected") {
            speakText(card.text, card.language);
        }

        onclick();
    }
</script>

<button
    class="word-card"
    class:selected={card.status === "selected"}
    class:correct={card.status === "correct"}
    class:wrong={card.status === "wrong"}
    class:hint={card.status === "hint"}
    class:hint-slow={card.status === "hint-slow"}
    onpointerdown={handlePointerDown}
    onpointerup={handlePointerUp}
    onpointerleave={handlePointerLeave}
    onclick={handleClick}
    data-testid="word-card-{card.id}"
>
    <span class="word-text">{card.text}</span>
    {#if card.transcription && showTranscription}
        <span class="transcription">{card.transcription}</span>
    {/if}
</button>

<style>
    .word-card {
        width: 100%;
        height: 100%;
        min-height: 0;
        padding: 0.5rem;
        font-size: clamp(0.9rem, 2.2vh, 1.15rem);
        font-weight: 500;
        color: var(--text-primary);
        background: var(--card-bg);
        border: 2px solid var(--card-border);
        border-radius: 12px;
        cursor: pointer;
        transition:
            transform 0.15s ease,
            background-color 0.2s ease,
            border-color 0.2s ease,
            opacity 0.3s ease,
            scale 0.3s ease;
        user-select: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.2rem;
        overflow: hidden; /* Запобігаємо виходу за межі */
        touch-action: none; /* Prevent browser zoom/scroll on long press? Maybe manipulation. */
    }

    .word-text {
        text-align: center;
        word-break: break-word;
        line-height: 1.15;
        max-width: 100%;
    }

    .transcription {
        font-size: clamp(0.6rem, 1.5vh, 0.8rem);
        color: var(--text-secondary);
        font-weight: 400;
        line-height: 1;
    }

    .word-card:hover {
        transform: translateY(-2px);
        border-color: var(--card-hover-border);
    }

    .word-card:active {
        transform: translateY(0);
    }

    /* Remove specific disabled styling or keep it if needed for visual indication that it's matched */
    .word-card.correct {
        background: var(--correct-bg);
        border-color: var(--correct-border);
        animation: correctFade 0.8s ease-out forwards;
        cursor: default; /* Show it's not clickable */
    }

    /* Ensure hover doesn't trigger on correct cards */
    .word-card.correct:hover {
        transform: none; /* override hover lift */
        border-color: var(--correct-border);
    }

    /* Вибрана картка */
    .word-card.selected {
        background: var(--selected-bg);
        border-color: var(--selected-border);
    }

    /* Правильна відповідь — зелений спалах + 25% прозорість */
    /* ... rest of animations same ... */
    @keyframes correctFade {
        0% {
            opacity: 1;
            transform: scale(1);
        }
        20% {
            opacity: 1;
            transform: scale(1.08);
        }
        100% {
            opacity: 0.25;
            transform: scale(0.95);
        }
    }

    /* Неправильна відповідь — червоне блимання */
    .word-card.wrong {
        animation: shake 0.4s ease-in-out;
        background: var(--wrong-bg);
        border-color: var(--wrong-border);
    }

    /* Підказка — плавне блимання */
    .word-card.hint {
        animation: hintPulse 1s ease-in-out;
    }

    .word-card.hint-slow {
        animation: hintPulse 5s ease-in-out;
    }

    @keyframes hintPulse {
        0% {
            transform: scale(1);
            background-color: var(--card-bg);
            border-color: var(--card-border);
            box-shadow: 0 0 0 rgba(58, 143, 214, 0);
        }
        20%,
        80% {
            transform: scale(1.05);
            background-color: rgba(58, 143, 214, 0.15); /* Blue tint */
            border-color: var(--selected-border);
            box-shadow: 0 0 20px rgba(58, 143, 214, 0.4);
        }
        100% {
            transform: scale(1);
            background-color: var(--card-bg);
            border-color: var(--card-border);
            box-shadow: 0 0 0 rgba(58, 143, 214, 0);
        }
    }

    @keyframes shake {
        0%,
        100% {
            transform: translateX(0);
        }
        20% {
            transform: translateX(-8px);
        }
        40% {
            transform: translateX(8px);
        }
        60% {
            transform: translateX(-6px);
        }
        80% {
            transform: translateX(6px);
        }
    }

    /* Адаптивність для малих екранів */
    @media (max-width: 480px) {
        .word-card {
            border-radius: 8px;
            padding: 0.2rem; /* Мінімальні відступи */
            gap: 0.1rem;
        }

        .word-text {
            font-size: clamp(0.8rem, 4vw, 1rem); /* Трохи менший шрифт */
        }
    }

    /* Адаптивність для екранів з малою висотою (ландшафт на мобільному) */
    @media (max-height: 600px) {
        .word-card {
            padding: 0.15rem; /* Ще менші відступи */
            gap: 0; /* Прибираємо gap, якщо місця мало */
            min-height: auto;
        }

        .word-text {
            line-height: 1.1;
            font-size: clamp(0.75rem, 3.5vh, 1rem);
        }

        .transcription {
            font-size: 0.7em;
            margin-top: 1px;
        }
    }
</style>
