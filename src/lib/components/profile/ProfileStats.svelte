<script lang="ts">
    import { _ } from "svelte-i18n";
    import { Target, Zap, Calendar, Award } from "lucide-svelte";

    interface Props {
        totalCorrect: number;
        streak: number;
        daysInApp: number;
        accuracy: number;
    }

    let { totalCorrect, streak, daysInApp, accuracy }: Props = $props();
</script>

<div class="stats-grid" data-testid="profile-stats-grid">
    <div class="stat-card" data-testid="stat-card-correct">
        <Target size={20} class="stat-icon" />
        <span class="value">{totalCorrect}</span>
        <span class="label"
            >{$_("profile.stats.correct", { default: "Правильно" })}</span
        >
    </div>
    <div class="stat-card" data-testid="stat-card-streak">
        <Zap size={20} class="stat-icon" />
        <span class="value">{streak}</span>
        <span class="label"
            >{$_("profile.stats.streak", { default: "Ударний режим" })}</span
        >
    </div>
    <div class="stat-card" data-testid="stat-card-days">
        <Calendar size={20} class="stat-icon" />
        <span class="value">{daysInApp}</span>
        <span class="label"
            >{$_("profile.stats.days", { default: "Днів у програмі" })}</span
        >
    </div>
    <div class="stat-card" data-testid="stat-card-accuracy">
        <Award size={20} class="stat-icon" />
        <span class="value">{accuracy}%</span>
        <span class="label"
            >{$_("profile.stats.accuracy", { default: "Точність" })}</span
        >
    </div>
</div>

<style>
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 2rem;
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
    }
</style>
