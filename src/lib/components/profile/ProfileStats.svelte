<script lang="ts">
    import { _ } from "svelte-i18n";
    import { Target, Zap, Calendar, Award } from "lucide-svelte";
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
    <div class="stats-grid" data-testid="profile-stats-grid">
        <button
            class="stat-card"
            data-testid="stat-card-days-streak"
            onclick={() => playLabel("streak")}
        >
            <Zap size={20} class="stat-icon" />
            <span class="value">{streak}</span>
            <span class="label">{$_("profile.stats.streak")}</span>
        </button>
        <button
            class="stat-card"
            data-testid="stat-card-days-streak-best"
            onclick={() => playLabel("bestStreak")}
        >
            <Zap size={20} class="stat-icon" />
            <span class="value">{bestStreak}</span>
            <span class="label">{$_("profile.stats.bestStreak")}</span>
        </button>

        {#if showMore}
            <button
                class="stat-card"
                data-testid="stat-card-correct-streak"
                onclick={() => playLabel("bestCorrectStreak")}
            >
                <Award size={20} class="stat-icon" />
                <span class="value">{bestCorrectStreak}</span>
                <span class="label">{$_("profile.stats.bestCorrectStreak")}</span>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-correct-today"
                onclick={() => playLabel("correctToday")}
            >
                <Target size={20} class="stat-icon" />
                <span class="value">{correctToday}</span>
                <span class="label">{$_("profile.stats.correctToday")}</span>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-correct-general"
                onclick={() => playLabel("correct")}
            >
                <Target size={20} class="stat-icon" />
                <span class="value">{totalCorrect}</span>
                <span class="label">{$_("profile.stats.correct")}</span>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-correct-daily-avg"
                onclick={() => playLabel("dailyAverage")}
            >
                <Zap size={20} class="stat-icon" />
                <span class="value">{dailyAverage / 10}</span>
                <span class="label">{$_("profile.stats.dailyAverage")}</span>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-days-total"
                onclick={() => playLabel("days")}
            >
                <Calendar size={20} class="stat-icon" />
                <span class="value">{daysInApp}</span>
                <span class="label">{$_("profile.stats.days")}</span>
            </button>
            <button
                class="stat-card"
                data-testid="stat-card-accuracy-general"
                onclick={() => playLabel("accuracy")}
            >
                <Award size={20} class="stat-icon" />
                <span class="value">{accuracy}%</span>
                <span class="label">{$_("profile.stats.accuracy")}</span>
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
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .stat-card {
        background: var(--bg-primary);
        padding: 1rem;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        border: 1px solid var(--border);
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
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
        margin-bottom: 0.25rem;
    }

    .stat-card .value {
        font-size: 1.75rem;
        font-weight: bold;
        color: var(--text-primary);
    }

    .stat-card .label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-align: center;
        white-space: pre-line;
    }
</style>