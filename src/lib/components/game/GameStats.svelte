<script lang="ts">
	/**
	 * GameStats.svelte - Відображення статистики (стрік, швидкість)
	 */
	import { _ } from "svelte-i18n";
	import { gameState } from "$lib/stores/gameState.svelte";
	import { getGameController } from "$lib/context/gameContext";
	import { Flame, Target, Lightbulb, GraduationCap } from "lucide-svelte";

	const gameController = getGameController();

	// Streak color interpolation (1 to 30)
	// Gray: rgb(128, 128, 128) -> Orange: rgb(255, 165, 0)
	const streakProgress = $derived(
		Math.min(1, Math.max(0, (gameState.streak - 1) / 29)),
	);
	const streakColor = $derived.by(() => {
		if (gameState.streak === 0) return "rgba(128, 128, 128, 0.5)";
		const r = Math.round(128 + (255 - 128) * streakProgress);
		const g = Math.round(128 + (165 - 128) * streakProgress);
		const b = Math.round(128 + (0 - 128) * streakProgress);
		return `rgb(${r}, ${g}, ${b})`;
	});

	// Streak animation intensity
	const streakAnimationSpeed = $derived(
		gameState.streak > 0 ? `${Math.max(0.5, 2 - streakProgress * 1.5)}s` : "0s",
	);
	const streakScale = $derived(1 + streakProgress * 0.15);

	// Accuracy display logic
	const accuracyDisplay = $derived(
		gameState.totalAttempts > 0 ? gameState.accuracy : "%",
	);

	// Accuracy background color interpolation (1% to 100%)
	// Gray: rgba(255, 255, 255, 0.05) -> Green: rgba(34, 197, 94, 0.2)
	const accProgress = $derived(
		gameState.totalAttempts > 0 ? gameState.accuracy / 100 : 0,
	);
	const accBgColor = $derived.by(() => {
		if (gameState.totalAttempts === 0) return "rgba(255, 255, 255, 0.05)";
		// Simplified interpolation for performance, using green channel primarily
		const alpha = 0.05 + 0.15 * accProgress;
		return `rgba(34, 197, 94, ${alpha})`;
	});
	const accBorderColor = $derived(
		accProgress > 0.5
			? `rgba(34, 197, 94, ${accProgress * 0.4})`
			: "rgba(255, 255, 255, 0.05)",
	);
</script>

<div class="stats-bar">
	<div
		class="stat-item streak"
		style="color: {streakColor}; border-color: {gameState.streak > 0
			? streakColor
			: ''}; transform: scale({streakScale});"
		data-testid="stat-streak"
	>
		<div
			class="icon-wrapper"
			style="animation-duration: {streakAnimationSpeed}; animation-name: {gameState.streak >
			5
				? 'pulse-fire'
				: 'none'}"
		>
			<Flame size={20} fill={gameState.streak > 10 ? streakColor : "none"} />
		</div>
		<span class="value">{gameState.streak}</span>
	</div>

	<div
		class="stat-item accuracy"
		style="background: {accBgColor}; border-color: {accBorderColor}; color: {accProgress >
		0.7
			? '#2ecc71'
			: ''}"
		data-testid="stat-accuracy"
	>
		<div class="icon-wrapper">
			<Target size={20} />
		</div>
		<span class="value"
			>{accuracyDisplay}{#if gameState.totalAttempts > 0}<span class="unit"
					>%</span
				>{/if}</span
		>
	</div>

	<div class="buttons-group">
		<button
			class="stat-item hint-btn"
			class:active-mode={gameState.isLearningMode}
			onclick={() => gameController.toggleLearningMode()}
			disabled={gameState.isProcessing && !gameState.isLearningMode}
			title={$_("settings.learningMode")}
			aria-label={$_("settings.learningMode")}
			data-testid="learning-mode-btn"
		>
			<div class="icon-wrapper">
				<GraduationCap size={20} />
			</div>
		</button>

		<button
			class="stat-item hint-btn"
			onclick={() => gameController.useHint()}
			disabled={gameState.isProcessing || gameState.isLearningMode}
			title={$_("settings.hint")}
			aria-label={$_("settings.hint")}
			data-testid="hint-btn"
		>
			<div class="icon-wrapper">
				<Lightbulb size={20} />
			</div>
		</button>
	</div>
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
		transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
		border: 1px solid rgba(255, 255, 255, 0.05);
		white-space: nowrap; /* Забороняємо перенос тексту */
	}

	/* Ховаємо текст "слів/хв" на вузьких екранах */
	@media (max-width: 400px) {
		.stat-item .unit {
			display: none;
		}
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
		background: rgba(58, 143, 214, 0.15);
		color: #3a8fd6;
		border-color: rgba(58, 143, 214, 0.4);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(58, 143, 214, 0.2);
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
	.buttons-group {
		display: flex;
		gap: 0.5rem;
	}

	.active-mode {
		background: rgba(0, 255, 128, 0.15) !important;
		color: #00ff80 !important;
		border-color: rgba(0, 255, 128, 0.4) !important;
		box-shadow: 0 0 15px rgba(0, 255, 128, 0.2);
		animation: pulse-learning 2s infinite;
	}

	@keyframes pulse-learning {
		0% {
			box-shadow: 0 0 0 0 rgba(0, 255, 128, 0.4);
		}
		70% {
			box-shadow: 0 0 0 10px rgba(0, 255, 128, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(0, 255, 128, 0);
		}
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
