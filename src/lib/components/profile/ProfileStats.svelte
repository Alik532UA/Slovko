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
	import type { LevelStats } from "$lib/stores/progressStore.svelte";
	import { ALL_LEVELS } from "$lib/types";

	interface Props {
		totalCorrect: number;
		streak: number;
		daysInApp: number;
		accuracy: number;
		bestStreak: number;
		bestCorrectStreak: number;
		correctToday: number;
		dailyAverage: number;
		levelStats: Record<string, LevelStats>;
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
		levelStats,
	}: Props = $props();

	let showMore = $state(false);
	let selectedLevel = $state("all");

	const currentLevelStats = $derived.by(() => {
		if (selectedLevel === "all") {
			return {
				totalCorrect,
				totalAttempts: 0, // Не використовується для 'all' прямо тут
				bestCorrectStreak,
				currentCorrectStreak: 0,
			};
		}
		return (
			levelStats[selectedLevel] || {
				totalCorrect: 0,
				totalAttempts: 0,
				bestCorrectStreak: 0,
				currentCorrectStreak: 0,
			}
		);
	});

	const levelAccuracy = $derived.by(() => {
		if (selectedLevel === "all") return accuracy;
		return currentLevelStats.totalAttempts > 0
			? Math.round(
					(currentLevelStats.totalCorrect / currentLevelStats.totalAttempts) *
						100,
				)
			: 0;
	});

	function playLabel(key: string) {
		const text = $_(`profile.stats.${key}`);
		speakText(text, settingsStore.value.interfaceLanguage);
	}
</script>

<div class="stats-container" data-testid="profile-stats-container">
	<!-- Level Stats Section (Main) -->
	<div class="level-stats-section" data-testid="level-stats-section">
		<h3 class="section-title">
			{$_("profile.stats.byLevel", { default: "По рівнях" })}
		</h3>

		<div class="level-tabs" data-testid="stats-level-tabs">
			<button
				class="level-tab"
				class:active={selectedLevel === "all"}
				onclick={() => (selectedLevel = "all")}
				data-testid="level-stats-tab-all"
			>
				{$_("common.all", { default: "Всі" })}
			</button>
			{#each ALL_LEVELS as level (level)}
				<button
					class="level-tab"
					class:active={selectedLevel === level}
					onclick={() => (selectedLevel = level)}
					data-testid="level-stats-tab-{level}"
				>
					{level}
				</button>
			{/each}
		</div>

		<div class="stats-grid" data-testid="level-stats-grid">
			<div class="stat-card level-stat" data-testid="level-stat-correct">
				<div class="stat-icon-box"><Target size={20} /></div>
				<div class="stat-content">
					<span class="value">{currentLevelStats.totalCorrect}</span>
					<span class="label">{$_("profile.stats.correct")}</span>
				</div>
			</div>
			<div class="stat-card level-stat" data-testid="level-stat-streak">
				<div class="stat-icon-box"><Medal size={20} /></div>
				<div class="stat-content">
					<span class="value">{currentLevelStats.bestCorrectStreak}</span>
					<span class="label">{$_("profile.stats.bestCorrectStreak")}</span>
				</div>
			</div>
			<div class="stat-card level-stat" data-testid="level-stat-accuracy">
				<div class="stat-icon-box"><Percent size={20} /></div>
				<div class="stat-content">
					<span class="value">{levelAccuracy}%</span>
					<span class="label">{$_("profile.stats.accuracy")}</span>
				</div>
			</div>
		</div>
	</div>

	{#if showMore}
		<div class="extra-stats-container">
			<h3 class="section-title">
				{$_("profile.stats.general", { default: "Загальна активність" })}
			</h3>
			<div
				class="stats-grid extra-stats"
				class:expanded={showMore}
				data-testid="profile-stats-grid"
			>
				<button
					class="stat-card"
					data-testid="stat-card-days-streak"
					onclick={() => playLabel("streak")}
				>
					<div class="stat-icon-box"><Flame size={22} /></div>
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
					<div class="stat-icon-box"><Trophy size={22} /></div>
					<div class="stat-content">
						<span class="value">{bestStreak}</span>
						<span class="label">{$_("profile.stats.bestStreak")}</span>
					</div>
				</button>
				<button
					class="stat-card"
					data-testid="stat-card-correct-today"
					onclick={() => playLabel("correctToday")}
				>
					<div class="stat-icon-box"><CheckCircle size={20} /></div>
					<div class="stat-content">
						<span class="value">{correctToday}</span>
						<span class="label">{$_("profile.stats.correctToday")}</span>
					</div>
				</button>
				<button
					class="stat-card"
					data-testid="stat-card-correct-daily-avg"
					onclick={() => playLabel("dailyAverage")}
				>
					<div class="stat-icon-box"><TrendingUp size={20} /></div>
					<div class="stat-content">
						<span class="value">{dailyAverage}</span>
						<span class="label">{$_("profile.stats.dailyAverage")}</span>
					</div>
				</button>
				<button
					class="stat-card"
					data-testid="stat-card-days-total"
					onclick={() => playLabel("days")}
				>
					<div class="stat-icon-box"><Calendar size={20} /></div>
					<div class="stat-content">
						<span class="value">{daysInApp}</span>
						<span class="label">{$_("profile.stats.days")}</span>
					</div>
				</button>
			</div>
		</div>
	{/if}

	<button
		class="toggle-stats-btn primary-action-btn"
		onclick={() => (showMore = !showMore)}
		data-testid="toggle-stats-btn"
	>
		<span
			>{$_(
				showMore ? "profile.stats.showLess" : "profile.stats.showMore",
			)}</span
		>
		<div class="btn-shine"></div>
	</button>
</div>

<style>
	.stats-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
		transition: all 0.3s ease;
	}

	.extra-stats-container {
		margin-top: 1.5rem;
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.03);
		padding: 0.8rem 1.25rem;
		border-radius: 16px;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		gap: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		width: 100%;
	}

	.stat-card.level-stat {
		padding: 0.6rem 1rem;
	}

	.stat-icon-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 42px;
		height: 42px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
		color: var(--accent);
		transition: all 0.3s;
		flex-shrink: 0;
	}

	.stat-card:hover .stat-icon-box {
		background: var(--accent);
		color: white;
		transform: scale(1.1);
	}

	.stat-content {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		gap: 0.5rem;
		flex: 1;
		flex-wrap: wrap;
	}

	.stat-card:hover {
		background: rgba(255, 255, 255, 0.06);
		transform: translateY(-2px);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.stat-card:active {
		transform: translateY(0);
	}

	.stat-card .value {
		font-size: 1.3rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
	}

	.stat-card .label {
		font-size: 0.9rem;
		color: var(--text-secondary);
		text-align: left;
		white-space: normal;
		line-height: 1.2;
		transition: all 0.3s ease;
		letter-spacing: 0.01em;
		font-weight: 500;
	}

	@media (max-width: 480px) {
		.stat-card {
			padding: 0.75rem 1rem;
			gap: 1rem;
		}

		.stat-icon-box {
			width: 36px;
			height: 36px;
			border-radius: 10px;
		}

		.stat-card .value {
			font-size: 1.2rem;
		}

		.stat-card .label {
			font-size: 0.85rem;
		}

		.stat-card.level-stat {
			padding: 0.5rem 0.75rem;
		}
	}

	.level-stats-section {
		margin-top: 1.5rem;
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}

	.section-title {
		font-size: 1rem;
		color: var(--text-secondary);
		margin-bottom: 0.75rem;
		text-align: center;
	}

	.level-tabs {
		display: flex;
		flex-wrap: wrap; /* Allow items to wrap to next line */
		gap: 0.5rem;
		padding-bottom: 0.5rem;
		margin-bottom: 0.75rem;
		justify-content: center;
	}

	.level-tab {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-secondary);
		padding: 0.4rem 0.8rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s;
	}

	.level-tab.active {
		background: var(--accent);
		color: white;
		border-color: var(--accent);
	}

	.toggle-stats-btn {
		width: 100%;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
		padding: 0.85rem;
		border-radius: 14px;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		margin-top: 1rem;
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.toggle-stats-btn:hover {
		background: var(--accent);
		color: white;
		border-color: var(--accent);
		transform: translateY(-2px);
		box-shadow: 0 6px 15px rgba(58, 143, 214, 0.3);
	}

	.toggle-stats-btn:active {
		transform: translateY(0);
	}

	.btn-shine {
		position: absolute;
		top: 0;
		left: -100%;
		width: 50%;
		height: 100%;
		background: linear-gradient(
			to right,
			transparent,
			rgba(255, 255, 255, 0.1),
			transparent
		);
		transform: skewX(-25deg);
		transition: none;
	}

	.toggle-stats-btn:hover .btn-shine {
		left: 150%;
		transition: all 0.6s ease;
	}
</style>
