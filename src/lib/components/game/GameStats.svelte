<script lang="ts">
	/**
	 * GameStats.svelte - Відображення статистики (стрік, швидкість)
	 */
	import { _ } from "svelte-i18n";
	import { gameState } from "$lib/stores/gameState.svelte";
	import { getGameController } from "$lib/context/gameContext";
	import {
		Flame,
		Snowflake,
		Percent,
		Lightbulb,
		GraduationCap,
		Menu,
	} from "lucide-svelte";
	import MenuModal from "../navigation/MenuModal.svelte";
	import { fade } from "svelte/transition";
	import { untrack } from "svelte";
	import BaseTooltip from "../ui/BaseTooltip.svelte";
	import { navigationState } from "../../services/navigationState.svelte";
	import { page } from "$app/stores";

	const gameController = getGameController();

	let showMenu = $state(false);

	// Retrieve active modal from URL
	const activeModal = $derived($page.url.searchParams.get("modal"));
	const initialProfileTab = $derived($page.url.searchParams.get("tab") as any);

	function openProfile(
		mode: "stats" | "profile" | "full",
		tab?: "stats" | "account" | "friends" | "leaderboard",
	) {
		navigationState.openModal("profile", tab);
	}

	// Local UI State for handling Frozen Streak
	let displayedStreak = $state(gameState.streak);
	let isFrozen = $state(false);

	$effect(() => {
		const currentStreak = gameState.streak;
		const currentAttempts = gameState.totalAttempts;

		if (currentStreak > 0) {
			untrack(() => {
				// Правильна відповідь
				isFrozen = false;
				displayedStreak = currentStreak;
			});
		} else if (currentStreak === 0 && currentAttempts > 0) {
			untrack(() => {
				// Відбулась помилка. Перевіряємо, чи в нас уже є заморожена серія
				if (!isFrozen && displayedStreak > 0) {
					// Це перша помилка: Заморожуємо
					isFrozen = true;
				} else if (isFrozen) {
					// Це ДРУГА підряд помилка (або третя і т.д.): Знімаємо заморозку і показуємо 0
					isFrozen = false;
					displayedStreak = 0;
				}
			});
		}
	});

	// Streak color interpolation (1 to 30)
	const streakProgress = $derived(
		Math.min(1, Math.max(0, (displayedStreak - 1) / 29)),
	);
	const streakColor = $derived.by(() => {
		if (isFrozen) return "rgb(0, 191, 255)"; // Крижаний (Deep Sky Blue)
		if (displayedStreak === 0) return "rgba(128, 128, 128, 0.5)"; // Сірий
		const r = Math.round(128 + (255 - 128) * streakProgress);
		const g = Math.round(128 + (165 - 128) * streakProgress);
		const b = Math.round(128 + (0 - 128) * streakProgress);
		return `rgb(${r}, ${g}, ${b})`;
	});

	// Streak animation intensity
	const streakAnimationSpeed = $derived(
		displayedStreak > 0 && !isFrozen
			? `${Math.max(0.5, 2 - streakProgress * 1.5)}s`
			: "0s",
	);
	const streakScale = $derived(1 + streakProgress * 0.15);

	// Accuracy display logic
	const accuracyDisplay = $derived(
		gameState.totalAttempts > 0 ? gameState.accuracy : "",
	);

	// Accuracy background color interpolation (1% to 100%)
	const accProgress = $derived(
		gameState.totalAttempts > 0 ? gameState.accuracy / 100 : 0,
	);
	const accBgColor = $derived.by(() => {
		if (gameState.totalAttempts === 0) return "rgba(255, 255, 255, 0.05)";
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
	<BaseTooltip text={$_("common.tooltips.streak")}>
		<div
			class="stat-item streak"
			class:frozen={isFrozen}
			style="color: {streakColor}; border-color: {displayedStreak > 0
				? streakColor
				: ''}; transform: scale({streakScale});"
			data-testid="stat-streak"
			title=""
		>
			<div
				class="icon-wrapper"
				style="animation-duration: {streakAnimationSpeed}; animation-name: {displayedStreak >
					5 && !isFrozen
					? 'pulse-fire'
					: 'none'}"
			>
				{#if isFrozen}
					<Snowflake size={20} />
				{:else}
					<Flame size={20} fill={displayedStreak > 10 ? streakColor : "none"} />
				{/if}
			</div>
			<span class="value">{displayedStreak}</span>
		</div>
	</BaseTooltip>

	<BaseTooltip text={$_("common.tooltips.accuracy")}>
		<div
			class="stat-item accuracy"
			style="background: {accBgColor}; border-color: {accBorderColor}; color: {accProgress >
			0.7
				? '#2ecc71'
				: ''}"
			data-testid="stat-accuracy"
			title=""
		>
			{#if accuracyDisplay !== ""}
				<span class="value">{accuracyDisplay}</span>
			{/if}
			<div class="icon-wrapper">
				<Percent size={20} />
			</div>
		</div>
	</BaseTooltip>

	<div class="buttons-group">
		<BaseTooltip text={$_("settings.learningMode")}>
			<button
				class="stat-item hint-btn"
				class:active-mode={gameState.isLearningMode}
				onclick={() => gameController.toggleLearningMode()}
				disabled={gameState.isProcessing && !gameState.isLearningMode}
				aria-label={$_("settings.learningMode")}
				data-testid="learning-mode-btn"
				title=""
			>
				<div class="icon-wrapper">
					<GraduationCap size={20} />
				</div>
			</button>
		</BaseTooltip>

		<BaseTooltip text={$_("settings.hint")}>
			<button
				class="stat-item hint-btn"
				onclick={() => gameController.useHint()}
				disabled={gameState.isProcessing || gameState.isLearningMode}
				aria-label={$_("settings.hint")}
				data-testid="hint-btn"
				title=""
			>
				<div class="icon-wrapper">
					<Lightbulb size={20} />
				</div>
			</button>
		</BaseTooltip>

		<div class="menu-container" class:menu-active={showMenu}>
			{#if showMenu}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="menu-backdrop"
					transition:fade={{ duration: 200 }}
					onclick={() => (showMenu = false)}
				></div>
			{/if}

			<BaseTooltip text={$_("common.menu") || "Menu"}>
				<button
					class="stat-item menu-btn"
					onclick={() => (showMenu = !showMenu)}
					aria-label={$_("common.menu") || "Menu"}
					data-testid="main-menu-btn"
					title=""
				>
					<div class="icon-wrapper">
						<Menu size={20} />
					</div>
				</button>
			</BaseTooltip>

			{#if showMenu}
				<MenuModal
					onclose={() => (showMenu = false)}
					onopenProfile={openProfile}
					onopenLanguages={() => {
						showMenu = false;
						navigationState.openModal("languages");
					}}
					onopenThemes={() => {
						showMenu = false;
						navigationState.openModal("themes");
					}}
					onopenAbout={() => {
						showMenu = false;
						navigationState.openModal("about");
					}}
				/>
			{/if}
		</div>
	</div>
</div>

<style>
	.menu-container {
		position: relative;
		display: flex;
		z-index: 6;
	}

	.menu-container.menu-active {
		z-index: 1001;
	}

	.menu-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(16px);
		z-index: 1;
		cursor: default;
	}

	.menu-btn {
		position: relative;
		z-index: 2;
	}

	:global(.dropdown-menu) {
		z-index: 2;
	}

	.stats-bar {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 5px;
		width: 100%;
		max-width: 500px;
		padding: 0 1rem;
		z-index: 5;
	}

	@media (max-width: 400px) {
		.stats-bar {
			gap: 0.5rem;
		}
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
		white-space: nowrap;
	}

	.stat-item.frozen {
		background: rgba(0, 191, 255, 0.15);
		box-shadow:
			0 0 10px rgba(0, 191, 255, 0.3),
			inset 0 0 10px rgba(255, 255, 255, 0.2);
		text-shadow: 0 0 5px rgba(0, 191, 255, 0.8);
		border-color: rgba(0, 191, 255, 0.5) !important;
		/* Візуальний ефект замерзання / кристалізації */
		backdrop-filter: blur(12px) contrast(1.1);
	}

	.hint-btn,
	.menu-btn {
		cursor: pointer;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		padding: 0.5rem;
		width: 42px;
		justify-content: center;
	}

	.hint-btn:hover:not(:disabled),
	.menu-btn:hover {
		background: rgba(58, 143, 214, 0.15);
		color: #3a8fd6;
		border-color: rgba(58, 143, 214, 0.4);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(58, 143, 214, 0.2);
	}

	.menu-btn {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.2);
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
