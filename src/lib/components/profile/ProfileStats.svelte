<script lang="ts">
    import { _ } from "svelte-i18n";
    import {
        Target,
        Flame,
        Calendar,
        Trophy,
        Medal,
        CheckCircle,
        TrendingUp,
        Percent,
    } from "lucide-svelte";
    import { speakText } from "$lib/services/speechService";
    import { settingsStore } from "$lib/stores/settingsStore.svelte";

    interface Props {
        totalCorrect: number;
        streak: number;
        daysInApp: number;
        accuracy: number;
        bestStreak: number;
        bestCorrectStreak: number;
        correctToday: number;
        dailyAverage: number;
    }

    let {
        totalCorrect,
        streak,
        daysInApp,
        accuracy,
        bestStreak,
        bestCorrectStreak,
        correctToday,
        dailyAverage,
    }: Props = $props();

    let showMore = $state(false);

    function playLabel(key: string) {
        const text = $_(`profile.stats.${key}`);
        speakText(text, settingsStore.value.interfaceLanguage);
    }
</script>

<div class="stats-container" data-testid="profile-stats-container">
    <div
        class="stats-grid"
        class:expanded={showMore}
        data-testid="profile-stats-grid"
    >
        <button
            class="stat-card"
            data-testid="stat-card-days-streak"
            onclick={() => playLabel("streak")}
        >
            <Flame size={20} class="stat-icon" />
            <div class="stat-content">
                <span class="value">{streak}</span>
                <span class="label">{$_("profile.stats.streak")}</span>
            </div>
        </button>
        <button
            class="stat-card"
            data-testid="stat-card-days-streak-best"
            onclick={() => playLabel("bestStreak")}
        >
            <Trophy size={20} class="stat-icon" />
            <div class="stat-content">
                <span class="value">{bestStreak}</span>
                <span class="label">{$_("profile.stats.bestStreak")}</span>
            </div>
        </button>

        {#if showMore}
            <button
                class="stat-card"
                data-testid="stat-card-correct-streak"
                onclick={() => playLabel("bestCorrectStreak")}
            >
                <Medal size={20} class="stat-icon" />
                <div class="stat-content">
                    <span class="value">{bestCorrectStreak}</span>
                    <span class="label"
                        >{$_("profile.stats.bestCorrectStreak")}</span
                    >
                </div>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-correct-today"
                onclick={() => playLabel("correctToday")}
            >
                <CheckCircle size={20} class="stat-icon" />
                <div class="stat-content">
                    <span class="value">{correctToday}</span>
                    <span class="label">{$_("profile.stats.correctToday")}</span
                    >
                </div>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-correct-general"
                onclick={() => playLabel("correct")}
            >
                <Target size={20} class="stat-icon" />
                <div class="stat-content">
                    <span class="value">{totalCorrect}</span>
                    <span class="label">{$_("profile.stats.correct")}</span>
                </div>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-correct-daily-avg"
                onclick={() => playLabel("dailyAverage")}
            >
                <TrendingUp size={20} class="stat-icon" />
                <div class="stat-content">
                    <span class="value">{Math.round(dailyAverage)}</span>
                    <span class="label">{$_("profile.stats.dailyAverage")}</span
                    >
                </div>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-days-total"
                onclick={() => playLabel("days")}
            >
                <Calendar size={20} class="stat-icon" />
                <div class="stat-content">
                    <span class="value">{daysInApp}</span>
                    <span class="label">{$_("profile.stats.days")}</span>
                </div>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-accuracy-general"
                onclick={() => playLabel("accuracy")}
            >
                <Percent size={20} class="stat-icon" />
                <div class="stat-content">
                    <span class="value">{accuracy}%</span>
                    <span class="label">{$_("profile.stats.accuracy")}</span>
                </div>
            </button>
        {/if}
    </div>

    <button
        class="toggle-stats-btn"
        onclick={() => (showMore = !showMore)}
        data-testid="toggle-stats-btn"
    >
        {$_(showMore ? "profile.stats.showLess" : "profile.stats.showMore")}
    </button>
</div>

<style>
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        margin-bottom: 1rem;
        transition: all 0.3s ease;
    }

    .stat-card {
        background: var(--bg-primary);
        padding: 1rem;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        border: 1px solid var(--border);
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
    }

    /* Expanded View Styles */
    .stats-grid.expanded {
        grid-template-columns: 1fr; /* Switch to 1 column list */
        gap: 0.5rem;
    }

    .stats-grid.expanded .stat-card {
        flex-direction: row; /* Horizontal layout */
        justify-content: flex-start;
        padding: 1rem 1.25rem;
        gap: 1.25rem;
    }

    .stat-content {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .stats-grid.expanded .stat-content {
        flex-direction: row;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
        flex-wrap: wrap;
    }

    @media (max-width: 420px) {
        .stats-grid.expanded .stat-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.1rem;
        }

        .stats-grid.expanded .stat-card {
            padding: 0.75rem 1rem;
            gap: 1rem;
        }
    }

    .stat-card:hover {
        background: var(--bg-secondary);
        transform: translateY(-2px);
    }

    .stat-card:active {
        transform: translateY(0);
    }

    .toggle-stats-btn {
        width: 100%;
        background: transparent;
        border: 1px dashed var(--border);
        color: var(--text-secondary);
        padding: 0.75rem;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 0.5rem;
    }

    .toggle-stats-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: var(--accent);
        color: var(--text-primary);
    }

    .stat-card :global(.stat-icon) {
        color: var(--accent);
        transition: all 0.3s ease;
        flex-shrink: 0;
    }

    /* Remove margin in horizontal mode */
    .stats-grid.expanded .stat-card :global(.stat-icon) {
        margin-bottom: 0;
    }

    .stat-card .value {
        font-size: 1.75rem;
        font-weight: bold;
        color: var(--text-primary);
        line-height: 1;
    }

    .stats-grid.expanded .stat-card .value {
        font-size: 1.25rem; /* Smaller font in list view */
    }

    .stat-card .label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-align: center;
        white-space: pre-line;
        line-height: 1.2;
        transition: all 0.3s ease;
    }

    .stats-grid.expanded .stat-card .label {
        text-align: left;
        white-space: normal;
        font-size: 0.95rem;
        color: var(--text-primary);
        opacity: 0.9;
    }

    @media (max-width: 420px) {
        .stats-grid.expanded .stat-card .label {
            font-size: 0.85rem;
            line-height: 1.1;
        }

        .stats-grid.expanded .stat-card .value {
            font-size: 1.15rem;
        }
    }
</style>
