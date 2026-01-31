<script lang="ts">
    /**
     * GameStats.svelte - Відображення статистики (стрік, швидкість)
     */
    import { gameState } from "$lib/stores/gameState.svelte";
    import { Flame, Target, Lightbulb } from "lucide-svelte";
</script>

<div class="stats-bar">
    <div class="stat-item streak" class:active={gameState.streak > 2}>
        <div class="icon-wrapper">
            <Flame size={20} />
        </div>
        <span class="value">{gameState.streak}</span>
    </div>

    <div class="stat-item accuracy">
        <div class="icon-wrapper">
            <Target size={20} />
        </div>
        <span class="value"
            >{gameState.accuracy}<span class="unit">%</span></span
        >
    </div>

    <button
        class="stat-item hint-btn"
        onclick={() => gameState.useHint()}
        disabled={gameState.isProcessing}
        title="Підказка"
        aria-label="Показати підказку"
    >
        <div class="icon-wrapper">
            <Lightbulb size={20} />
        </div>
    </button>
</div>

<style>
    .stats-bar {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-bottom: 5px;
        width: 100%;
        max-width: 500px;
        padding: 0 1rem;
        z-index: 5;
    }

    .stat-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        color: var(--text-secondary);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 1px solid rgba(255, 255, 255, 0.05);
        white-space: nowrap; /* Забороняємо перенос тексту */
    }

    /* Ховаємо текст "слів/хв" на вузьких екранах */
    @media (max-width: 400px) {
        .stat-item .unit {
            display: none;
        }
    }

    .stat-item.active {
        background: rgba(255, 165, 0, 0.15);
        color: #ffaa00;
        border-color: rgba(255, 165, 0, 0.3);
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(255, 165, 0, 0.2);
    }

    .hint-btn {
        cursor: pointer;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 0.5rem; /* Make it square-ish or just smaller padding */
        width: 42px; /* Fixed width for better icon centering */
        justify-content: center;
    }

    .hint-btn:hover:not(:disabled) {
        background: rgba(255, 255, 0, 0.15);
        color: #ffee00;
        border-color: rgba(255, 255, 0, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 255, 0, 0.2);
    }

    .hint-btn:active:not(:disabled) {
        transform: translateY(0);
    }

    .hint-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .value {
        font-weight: 700;
        font-size: 1.1rem;
        font-variant-numeric: tabular-nums;
    }

    .unit {
        font-size: 0.8rem;
        font-weight: 400;
        opacity: 0.8;
        margin-left: 2px;
    }

    /* Анімація для вогню, коли великий стрік */
    .stat-item.active .icon-wrapper {
        animation: pulse-fire 1.5s infinite;
    }

    @keyframes pulse-fire {
        0% {
            transform: scale(1);
            filter: brightness(1);
        }
        50% {
            transform: scale(1.2);
            filter: brightness(1.3);
        }
        100% {
            transform: scale(1);
            filter: brightness(1);
        }
    }
</style>
