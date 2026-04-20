<script lang="ts">
	import { _ } from "svelte-i18n";
	import { fade } from "svelte/transition";
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
	import type { LevelStats } from "$lib/data/schemas";
	import { ALL_LEVELS } from "$lib/types/index";
	import SegmentedControl from "../ui/SegmentedControl.svelte";

	interface Props {
		totalCorrect: number;
		streak: number;
		daysInApp: number;
		activeDaysCount?: number;
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
		activeDaysCount = 0,
		accuracy,
		bestStreak,
		bestCorrectStreak,
		correctToday,
		dailyAverage,
		levelStats,
	}: Props = $props();

	const displayDays = $derived(activeDaysCount || daysInApp);

		let showMore = $state(false);
		let selectedLevel = $state("all");
		const activeLevelIndex = $derived(
			selectedLevel === "all" ? 0 : ALL_LEVELS.indexOf(selectedLevel as any) + 1,
		);
		const totalLevels = $derived(ALL_LEVELS.length + 1);
	
		const currentLevelStats = $derived.by(() => {
			if (selectedLevel === "all") {
				return {
					totalCorrect,
					totalAttempts: 0, // Not used for 'all' directly here
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
			{$_("profile.stats.byLevel")}
		</h3>

		<SegmentedControl 
			options={[
				{ id: 'all', label: 'common.all', testId: 'level-stats-tab-all' },
				...ALL_LEVELS.map(level => ({ id: level, label: level, testId: `level-stats-tab-${level}` }))
			]}
			value={selectedLevel}
			onchange={(id) => (selectedLevel = id)}
			testid="stats-level-tabs"
			class="mb-4"
		/>

		<div class="stats-grid-wrapper">
			{#key selectedLevel}
				<div in:fade={{ duration: 250, delay: 50 }} out:fade={{ duration: 150 }} class="stats-grid safe-scale-container" data-testid="level-stats-grid">
					<button 
						type="button"
						class="stat-card level-stat" 
						data-testid="level-stat-correct" 
						onclick={() => playLabel("correct")}
						aria-label={$_("profile.stats.correct")}
					>
						<div class="stat-icon-box" aria-hidden="true"><Target size={20} /></div>
																	<div class="stat-content">
																		<span class="value">
																			{currentLevelStats.totalCorrect}
																		</span>
																		<span class="label">{$_("profile.stats.correct")}</span>
																	</div>					</button>
					<button 
						type="button"
						class="stat-card level-stat" 
						data-testid="level-stat-streak" 
						onclick={() => playLabel("bestCorrectStreak")}
						aria-label={$_("profile.stats.bestCorrectStreak")}
					>
						<div class="stat-icon-box" aria-hidden="true"><Medal size={20} /></div>
						<div class="stat-content">
							<span class="value">{currentLevelStats.bestCorrectStreak}</span>
							<span class="label">{$_("profile.stats.bestCorrectStreak")}</span>
						</div>
					</button>
					<button 
						type="button"
						class="stat-card level-stat" 
						data-testid="level-stat-accuracy" 
						onclick={() => playLabel("accuracy")}
						aria-label={$_("profile.stats.accuracy")}
					>
						<div class="stat-icon-box" aria-hidden="true"><Percent size={20} /></div>
						<div class="stat-content">
							<span class="value">{levelAccuracy}%</span>
							<span class="label">{$_("profile.stats.accuracy")}</span>
						</div>
					</button>
				</div>
			{/key}
		</div>
	</div>

	{#if showMore}
		<div class="extra-stats-container">
			<h3 class="section-title">
				{$_("profile.stats.general")}
			</h3>
			<div
				class="stats-grid extra-stats safe-scale-container"
				class:expanded={showMore}
				data-testid="profile-stats-grid"
			>
				<button
					type="button"
					class="stat-card"
					data-testid="stat-card-days-streak"
					onclick={() => playLabel("streak")}
					aria-label={$_("profile.stats.streak")}
				>
					<div class="stat-icon-box" aria-hidden="true"><Flame size={22} /></div>
					<div class="stat-content">
						<span class="value">{streak}</span>
						<span class="label">{$_("profile.stats.streak")}</span>
					</div>
				</button>
				<button
					type="button"
					class="stat-card"
					data-testid="stat-card-days-streak-best"
					onclick={() => playLabel("bestStreak")}
					aria-label={$_("profile.stats.bestStreak")}
				>
					<div class="stat-icon-box" aria-hidden="true"><Trophy size={22} /></div>
					<div class="stat-content">
						<span class="value">{bestStreak}</span>
						<span class="label">{$_("profile.stats.bestStreak")}</span>
					</div>
				</button>
				<button
					type="button"
					class="stat-card"
					data-testid="stat-card-correct-today"
					onclick={() => playLabel("correctToday")}
					aria-label={$_("profile.stats.correctToday")}
				>
					<div class="stat-icon-box" aria-hidden="true"><CheckCircle size={20} /></div>
					<div class="stat-content">
						<span class="value">{correctToday}</span>
						<span class="label">{$_("profile.stats.correctToday")}</span>
					</div>
				</button>
				<button
					type="button"
					class="stat-card"
					data-testid="stat-card-correct-daily-avg"
					onclick={() => playLabel("dailyAverage")}
					aria-label={$_("profile.stats.dailyAverage")}
				>
					<div class="stat-icon-box" aria-hidden="true"><TrendingUp size={20} /></div>
					<div class="stat-content">
						<span class="value">{dailyAverage}</span>
						<span class="label">{$_("profile.stats.dailyAverage")}</span>
					</div>
				</button>
				<button
					type="button"
					class="stat-card"
					data-testid="stat-card-days-total"
					onclick={() => playLabel("activeDays")}
					aria-label={$_("profile.stats.activeDays")}
				>
					<div class="stat-icon-box" aria-hidden="true"><Calendar size={20} /></div>
					<div class="stat-content">
						<span class="value">{displayDays}</span>
						<span class="label">{$_("profile.stats.activeDays")}</span>
					</div>
				</button>
			</div>
		</div>
	{/if}

	<div class="safe-scale-container" style="padding: 0.5rem 0;">
		<button
			type="button"
			class="toggle-stats-btn primary-action-btn"
			onclick={() => (showMore = !showMore)}
			aria-expanded={showMore}
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
</div>

<style>
	.stats-grid-wrapper {
		display: grid;
		grid-template-columns: 100%;
		grid-template-rows: 1fr;
		width: 100%;
	}

	.stats-grid {
		grid-area: 1 / 1 / 2 / 2;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 1rem;
		transition: all 0.3s ease;
		width: 100%;
	}

	.extra-stats-container {
		margin-top: 1.5rem;
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		padding: 0.8rem 1.25rem;
		border-radius: 16px;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		gap: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: var(--hover-transition);
		width: 100%;
		max-width: 100%; /* Ensure it doesn't exceed grid */
		position: relative; /* For z-index to work */
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
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
		transition: var(--hover-transition);
		flex-shrink: 0;
	}

	.stat-card:hover .stat-icon-box {
		background: var(--accent);
		color: white;
		transform: scale(var(--hover-scale));
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
		transform: scale(var(--hover-scale));
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		z-index: 2; /* Lift above neighbors */
	}

	.stat-card:active {
		transform: scale(var(--active-scale));
	}

	.stat-card .value {
		font-size: 1.3rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.2;
		display: flex;
		align-items: center;
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
		transition: var(--hover-transition);
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
		transform: scale(var(--hover-scale));
		box-shadow: 0 6px 15px rgba(58, 143, 214, 0.3);
	}

	.toggle-stats-btn:active {
		transform: scale(var(--active-scale));
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
