<script lang="ts">
    /**
     * WordCard.svelte — Картка слова
     * SoC: тільки відображення та передача подій
     * Підтримка транскрипції та озвучування
     */
    import type { ActiveCard } from "$lib/types";
    import { speakEnglish } from "$lib/services/speechService";

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
    onclick={handleClick}
    disabled={card.status === "correct"}
>
    <span class="word-text">{card.text}</span>
    {#if card.transcription}
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
        gap: 0.15rem;
    }

    .word-text {
        text-align: center;
        word-break: break-word;
        line-height: 1.2;
    }

    .transcription {
        font-size: clamp(0.6rem, 1.5vh, 0.8rem);
        color: var(--text-secondary);
        font-weight: 400;
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

    /* Правильна відповідь — зелений + зникнення */
    .word-card.correct {
        background: var(--correct-bg);
        border-color: var(--correct-border);
        animation: fadeOut 0.5s ease-out forwards;
    }

    /* Неправильна відповідь — червоне блимання */
    .word-card.wrong {
        animation: shake 0.4s ease-in-out;
        background: var(--wrong-bg);
        border-color: var(--wrong-border);
    }

    @keyframes fadeOut {
        0% {
            opacity: 1;
            scale: 1;
        }
        100% {
            opacity: 0;
            scale: 0.8;
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

    @media (max-width: 480px) {
        .word-card {
            border-radius: 10px;
            padding: 0.25rem;
        }
    }
</style>
