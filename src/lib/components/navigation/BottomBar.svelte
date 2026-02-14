<script lang="ts">
	/**
	 * BottomBar — Нижня панель навігації
	 * ← (рівень/тема) →
	 */
	import { ChevronLeft, ChevronRight } from "lucide-svelte";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { goto } from "$app/navigation";
	import { _ } from "svelte-i18n";
	import { ALL_LEVELS, ALL_TOPICS, ALL_TENSES } from "$lib/types";
	import LevelTopicModal from "./LevelTopicModal.svelte";
	import { playlistStore } from "$lib/stores/playlistStore.svelte";
	import BaseTooltip from "../ui/BaseTooltip.svelte";

	let showModal = $state(false);

	// Отримати поточний лейбл
	const currentLabel = $derived.by(() => {
		const { mode, currentLevel, currentTopic, currentTenses, currentPlaylist } =
			settingsStore.value;

		const formatLabel = (ids: string[], i18nPrefix: string) => {
			if (ids.length === 0) return "";
			
			// Пріоритет для 'ALL' (якщо він є в списку, він має бути першим у лейблі)
			const displayId = ids.includes("ALL") ? "ALL" : ids[0];
			const first = $_(`${i18nPrefix}.${displayId}`);
			
			return ids.length > 1 ? `${first} + ${ids.length - 1}` : first;
		};

		if (mode === "levels") {
			return formatLabel(currentLevel, "levels");
		} else if (mode === "topics") {
			return formatLabel(currentTopic, "topics");
		} else if (mode === "phrases") {
			return formatLabel(currentLevel, "levels");
		} else if (mode === "tenses") {
			return formatLabel(currentTenses, "tenses");
		} else if (mode === "playlists" && currentPlaylist) {
			const p = playlistStore.getPlaylist(currentPlaylist);
			if (p) {
				return p.isSystem ? $_(p.name) : p.name;
			}
			return $_(`playlists.${currentPlaylist}`);
		}
		return "";
	});

	// Перевірка чи можна перемикати (тільки якщо вибрано 1 елемент)
	const canGoPrev = $derived.by(() => {
		const { mode, currentLevel, currentTopic, currentTenses } = settingsStore.value;

		if (mode === "levels" || mode === "phrases") {
			return currentLevel.length === 1 && currentLevel[0] !== ALL_LEVELS[0];
		} else if (mode === "topics") {
			return currentTopic.length === 1 && currentTopic[0] !== ALL_TOPICS[0].id;
		} else if (mode === "tenses") {
			return currentTenses.length === 1 && currentTenses[0] !== ALL_TENSES[0].id;
		}
		return false;
	});

	const canGoNext = $derived.by(() => {
		const { mode, currentLevel, currentTopic, currentTenses } = settingsStore.value;

		if (mode === "levels" || mode === "phrases") {
			return currentLevel.length === 1 && currentLevel[0] !== ALL_LEVELS[ALL_LEVELS.length - 1];
		} else if (mode === "topics") {
			return currentTopic.length === 1 && currentTopic[0] !== ALL_TOPICS[ALL_TOPICS.length - 1].id;
		} else if (mode === "tenses") {
			return currentTenses.length === 1 && currentTenses[0] !== ALL_TENSES[ALL_TENSES.length - 1].id;
		}
		return false;
	});

	function goNext() {
		const { mode, currentLevel, currentTopic, currentTenses } = settingsStore.value;

		if ((mode === "levels" || mode === "phrases") && currentLevel.length === 1) {
			const idx = ALL_LEVELS.indexOf(currentLevel[0] as any);
			if (idx < ALL_LEVELS.length - 1) {
				const next = ALL_LEVELS[idx + 1];
				goto(`?mode=${mode}&level=${next}`);
			}
		} else if (mode === "topics" && currentTopic.length === 1) {
			const idx = ALL_TOPICS.findIndex((t) => t.id === currentTopic[0]);
			if (idx !== -1 && idx < ALL_TOPICS.length - 1) {
				const next = ALL_TOPICS[idx + 1].id;
				goto(`?mode=${mode}&topic=${next}`);
			}
		} else if (mode === "tenses" && currentTenses.length === 1) {
			const idx = ALL_TENSES.findIndex((t) => t.id === currentTenses[0]);
			if (idx !== -1 && idx < ALL_TENSES.length - 1) {
				const next = ALL_TENSES[idx + 1].id;
				goto(`?mode=${mode}&tense=${next}`);
			}
		}
	}

	function goPrev() {
		const { mode, currentLevel, currentTopic, currentTenses } = settingsStore.value;

		if ((mode === "levels" || mode === "phrases") && currentLevel.length === 1) {
			const idx = ALL_LEVELS.indexOf(currentLevel[0] as any);
			if (idx > 0) {
				const prev = ALL_LEVELS[idx - 1];
				goto(`?mode=${mode}&level=${prev}`);
			}
		} else if (mode === "topics" && currentTopic.length === 1) {
			const idx = ALL_TOPICS.findIndex((t) => t.id === currentTopic[0]);
			if (idx > 0) {
				const prev = ALL_TOPICS[idx - 1].id;
				goto(`?mode=${mode}&topic=${prev}`);
			}
		} else if (mode === "tenses" && currentTenses.length === 1) {
			const idx = ALL_TENSES.findIndex((t) => t.id === currentTenses[0]);
			if (idx > 0) {
				const prev = ALL_TENSES[idx - 1].id;
				goto(`?mode=${mode}&tense=${prev}`);
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		// Prevent navigation if user is typing in an input
		const target = event.target as HTMLElement;
		if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
			return;
		}

		if (event.key === "ArrowLeft" && canGoPrev) {
			goPrev();
		} else if (event.key === "ArrowRight" && canGoNext) {
			goNext();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="bottom-bar">
	<BaseTooltip text={$_("common.tooltips.prev")}>
		<button
			class="nav-btn"
			onclick={() => goPrev()}
			disabled={!canGoPrev}
			data-testid="prev-level-btn"
			title=""
		>
			<ChevronLeft size={32} />
		</button>
	</BaseTooltip>

	<BaseTooltip text={$_("common.tooltips.selectLevel")}>
		<button
			class="level-btn"
			onclick={() => (showModal = true)}
			data-testid="level-topic-selector-btn"
			title=""
		>
			{currentLabel}
		</button>
	</BaseTooltip>

	<BaseTooltip text={$_("common.tooltips.next")}>
		<button
			class="nav-btn"
			onclick={() => goNext()}
			disabled={!canGoNext}
			data-testid="next-level-btn"
			title=""
		>
			<ChevronRight size={32} />
		</button>
	</BaseTooltip>
</div>

{#if showModal}
	<LevelTopicModal onclose={() => (showModal = false)} />
{/if}

<style>
	.bottom-bar {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
		background: transparent;
		width: 100%;
	}

	.nav-btn {
		background: transparent;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		color: var(--text-primary);
		transition: opacity 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		-webkit-tap-highlight-color: transparent; /* Remove mobile highlight */
	}

	/* Fix visual issue: keep color same on click/focus */
	.nav-btn:active {
		color: var(--text-primary);
		transform: scale(0.95);
	}

	.nav-btn:focus {
		outline: none; /* Remove default browser outline */
		color: var(--text-primary); /* Explicitly keep color active */
	}

	.nav-btn:focus-visible {
		color: var(--text-primary);
		outline: 2px solid var(--accent);
		border-radius: 8px;
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	/* Only apply hover effect on devices that support hover (mouse) to avoid sticky hover on mobile */
	@media (hover: hover) {
		.nav-btn:not(:disabled):hover {
			color: var(--accent);
		}
	}

	.level-btn {
		min-width: 100px;
		padding: 0.75rem 1.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.level-btn:hover {
		transform: scale(1.05);
	}
</style>
