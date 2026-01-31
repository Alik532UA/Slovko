<script lang="ts">
    /**
     * WordCard.svelte — Картка слова
     * SoC: тільки відображення та передача подій
     * Підтримка транскрипції та озвучування
     */
    import type { ActiveCard } from "$lib/types";
    import { speakEnglish } from "$lib/services/speechService";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";

    interface Props {
        card: ActiveCard;
        onclick: () => void;
    }

    let { card, onclick }: Props = $props();

    function handleClick() {
        // Озвучуємо англійські слова
        if (card.language === "en") {
            speakEnglish(card.text);
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
    onclick={handleClick}
    disabled={card.status === "correct"}
    data-testid="word-card-{card.id}"
>
    <span class="word-text">{card.text}</span>
    {#if card.transcription && settingsStore.value.showTranscription}
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

    .word-card:hover:not(:disabled) {
        transform: translateY(-2px);
        border-color: var(--card-hover-border);
    }

    .word-card:active:not(:disabled) {
        transform: translateY(0);
    }

    /* Вибрана картка */
    .word-card.selected {
        background: var(--selected-bg);
        border-color: var(--selected-border);
    }

    /* Правильна відповідь — зелений спалах + 25% прозорість */
    .word-card.correct {
        background: var(--correct-bg);
        border-color: var(--correct-border);
        animation: correctFade 0.8s ease-out forwards;
        cursor: default;
    }

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
        background: rgba(255, 255, 0, 0.15); /* Light yellow tint */
        border-color: rgba(255, 255, 0, 0.5);
    }

    @keyframes hintPulse {
        0%,
        100% {
            transform: scale(1);
            filter: brightness(1);
        }
        50% {
            transform: scale(1.05);
            filter: brightness(1.3);
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
