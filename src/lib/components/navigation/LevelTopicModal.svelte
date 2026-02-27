<script lang="ts">
	/**
	 * LevelTopicModal — Вибір рівня або теми
	 * Використовує BaseModal для сучасного дизайну
	 */
	import { _ } from "svelte-i18n";
	import { fade } from "svelte/transition";
	import { goto } from "$app/navigation";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import type { CEFRLevel, GameMode, PlaylistId } from "$lib/types";
	import BaseModal from "../ui/BaseModal.svelte";
	import { smoothHeight } from "$lib/actions/smoothHeight";
	import { page } from "$app/stores";
	import { navigationState } from "$lib/services/navigationState.svelte";
	import { Gamepad2, Layers } from "lucide-svelte";

	// Mode Components
	import LevelGrid from "./modes/LevelGrid.svelte";
	import TopicGrid from "./modes/TopicGrid.svelte";
	import TenseGrid from "./modes/TenseGrid.svelte";
	import TenseFilters from "./modes/TenseFilters.svelte";
	import PlaylistGrid from "./modes/PlaylistGrid.svelte";

	interface Props {
		onclose: () => void;
	}
	let { onclose }: Props = $props();

	// Configuration for Tabs
	const TABS: { id: GameMode; label: string; testId: string }[] = [
		{ id: "levels", label: "tabs.levels", testId: "tab-levels" },
		{ id: "topics", label: "tabs.topics", testId: "tab-topics" },
		{ id: "phrases", label: "tabs.phrases", testId: "tab-phrases" },
		{ id: "tenses", label: "tabs.tenses", testId: "tab-tenses" },
		{ id: "playlists", label: "tabs.playlists", testId: "tab-playlists" },
	];

	// Derive active tab from URL 'tab' param, fallback to current settings mode
	const activeTabParam = $derived(
		$page.url.searchParams.get("tab") as GameMode | null,
	);
	const activeTab = $derived(activeTabParam || settingsStore.value.mode);

	// Local state for multi-selection
	let selectedIds = $state<string[]>([]);
	let selectedForms = $state(settingsStore.value.currentForms);
	let tenseQuantity = $state(settingsStore.value.tenseQuantity);

	// Sync local selection when tab changes or modal opens
	$effect(() => {
		if (activeTab === settingsStore.value.mode) {
			if (activeTab === "topics")
				selectedIds = [...settingsStore.value.currentTopic];
			else if (activeTab === "tenses") {
				selectedIds = [...settingsStore.value.currentTenses];
				selectedForms = [...settingsStore.value.currentForms];
				tenseQuantity = settingsStore.value.tenseQuantity;
			} else if (activeTab === "levels" || activeTab === "phrases")
				selectedIds = [...settingsStore.value.currentLevel];
		} else if (activeTab === "tenses") {
			// Якщо ми перейшли на вкладку "Часи", але це не поточний режим гри,
			// завантажуємо останні збережені налаштування для цієї вкладки
			selectedIds = [...settingsStore.value.currentTenses];
			selectedForms = [...settingsStore.value.currentForms];
			tenseQuantity = settingsStore.value.tenseQuantity;
		} else {
			selectedIds = [];
		}
	});

	function toggleId(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}

		// Відразу зберігаємо вибір у стор, щоб він не зникав
		if (activeTab === "tenses") {
			settingsStore.setTenses(selectedIds);
		}
	}

	function toggleForm(form: any) {
		if (selectedForms.includes(form)) {
			if (selectedForms.length > 1) {
				selectedForms = selectedForms.filter((f) => f !== form);
			}
		} else {
			selectedForms = [...selectedForms, form];
		}
		settingsStore.setTenseForms(selectedForms);
	}

	function updateQuantity(qty: "1" | "3" | "many") {
		tenseQuantity = qty;
		settingsStore.setTenseQuantity(qty);
	}

	function resetSelection() {
		selectedIds = [];
	}

	function setInteractionMode(mode: "match" | "swipe") {
		settingsStore.setInteractionMode(mode);
		if (
			mode === "swipe" &&
			["phrases", "tenses", "playlists"].includes(activeTab)
		) {
			navigationState.setTab("levels");
		}
	}

	function startLearning() {
		if (selectedIds.length === 0) return;

		const idsStr = selectedIds.join(",");
		const url = new URL($page.url);
		url.searchParams.delete("modal");
		url.searchParams.delete("tab");
		url.searchParams.delete("subtab");

		// Clear previous mode arguments
		url.searchParams.delete("level");
		url.searchParams.delete("topic");
		url.searchParams.delete("playlist");
		url.searchParams.delete("tense");
		url.searchParams.delete("forms");
		url.searchParams.delete("qty");
		url.searchParams.delete("interaction");

		url.searchParams.set("mode", activeTab);
		url.searchParams.set("interaction", settingsStore.value.interactionMode);

		if (activeTab === "levels") {
			url.searchParams.set("level", idsStr);
		} else if (activeTab === "phrases") {
			url.searchParams.set("level", idsStr);
		} else if (activeTab === "topics") {
			url.searchParams.set("topic", idsStr);
		} else if (activeTab === "tenses") {
			const formsStr = selectedForms.join(",");
			url.searchParams.set("tense", idsStr);
			url.searchParams.set("forms", formsStr);
			url.searchParams.set("qty", tenseQuantity);
		}
		goto(url, { keepFocus: true, noScroll: true });
	}

	function selectPlaylist(playlistId: PlaylistId) {
		const url = new URL($page.url);
		url.searchParams.delete("modal");
		url.searchParams.delete("tab");
		url.searchParams.delete("subtab");

		url.searchParams.delete("level");
		url.searchParams.delete("topic");
		url.searchParams.delete("tense");
		url.searchParams.delete("forms");
		url.searchParams.delete("qty");
		url.searchParams.delete("interaction");

		url.searchParams.set("mode", "playlists");
		url.searchParams.set("interaction", settingsStore.value.interactionMode);
		url.searchParams.set("playlist", playlistId);
		goto(url, { keepFocus: true, noScroll: true });
	}
</script>

<BaseModal {onclose} testid="level-topic-modal" maxWidth="640px">
	<div class="modal-internal-wrapper" use:smoothHeight={{ duration: 300 }}>
		<div class="modal-content-measure">
			<div class="modal-inner">
				<!-- Режим взаємодії (Стовпці vs Свайп) -->
				<div class="interaction-toggle" data-testid="interaction-toggle">
					<button
						class="interaction-btn"
						class:active={settingsStore.value.interactionMode === "match"}
						onclick={() => setInteractionMode("match")}
						data-testid="btn-match"
					>
						<Layers size={18} />
						<span>Стовпці</span>
					</button>
					<button
						class="interaction-btn"
						class:active={settingsStore.value.interactionMode === "swipe"}
						onclick={() => setInteractionMode("swipe")}
						data-testid="btn-swipe"
					>
						<Gamepad2 size={18} />
						<span>Свайп</span>
					</button>
				</div>

				<!-- Tabs -->
				<nav class="tabs" data-testid="level-topic-tabs">
					{#each TABS as tab (tab.id)}
						{#if settingsStore.value.interactionMode === "match" || tab.id === "levels" || tab.id === "topics"}
							<button
								class="tab"
								class:active={activeTab === tab.id}
								onclick={() => navigationState.setTab(tab.id)}
								data-testid={tab.testId}
							>
								{$_(tab.label)}
							</button>
						{/if}
					{/each}
				</nav>

				<!-- Content -->
				<div class="content-wrapper" data-testid="level-topic-modal-content">
					{#key activeTab}
						<div
							in:fade={{ duration: 250, delay: 50 }}
							out:fade={{ duration: 150 }}
							class="content"
							data-testid="level-topic-scroll-area"
						>
							{#if activeTab === "levels"}
								<LevelGrid mode="levels" {selectedIds} onselect={toggleId} />
							{:else if activeTab === "topics"}
								<TopicGrid {selectedIds} onselect={toggleId} />
							{:else if activeTab === "phrases"}
								<LevelGrid mode="phrases" {selectedIds} onselect={toggleId} />
							{:else if activeTab === "tenses"}
								<TenseFilters
									{selectedForms}
									quantity={tenseQuantity}
									onToggleForm={toggleForm}
									onChangeQuantity={updateQuantity}
								/>
								<TenseGrid {selectedIds} onselect={toggleId} />
							{:else if activeTab === "playlists"}
								<PlaylistGrid onselect={selectPlaylist} />
							{/if}
						</div>
					{/key}
				</div>

				<!-- Actions -->
				{#if activeTab !== "playlists"}
					<div class="actions" data-testid="level-topic-actions">
						<button
							class="action-btn secondary"
							onclick={resetSelection}
							disabled={selectedIds.length === 0}
							data-testid="level-topic-reset-btn"
						>
							{$_("common.reset")}
						</button>
						<button
							class="action-btn primary"
							onclick={startLearning}
							disabled={selectedIds.length === 0}
							data-testid="level-topic-learn-btn"
						>
							{$_("common.learn")} ({selectedIds.length})
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</BaseModal>

<style>
	.modal-internal-wrapper {
		display: block;
	}

	.modal-content-measure {
		display: block;
		width: 100%;
		height: auto;
	}

	.modal-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.interaction-toggle {
		display: flex;
		background: var(--bg-primary);
		padding: 4px;
		border-radius: 12px;
		margin-bottom: 1rem;
		border: 1px solid var(--border);
	}

	.interaction-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 0.75rem;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.interaction-btn:hover {
		color: var(--text-primary);
	}

	.interaction-btn.active {
		background: var(--accent);
		color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.tabs {
		display: flex;
		flex-wrap: wrap; /* Дозволяємо перенесення на новий рядок */
		margin-bottom: 1.5rem;
		gap: 0.25rem;
		justify-content: flex-start;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.tab {
		padding: 0.6rem 1.25rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		border-radius: 12px;
		white-space: nowrap;
	}

	.tab:hover {
		color: var(--text-primary);
		background: var(--bg-secondary);
	}

	.tab.active {
		color: var(--accent);
		background: var(--bg-secondary);
	}

	.content-wrapper {
		display: grid;
		grid-template-columns: 100%;
		grid-template-rows: 1fr;
		width: 100%;
	}

	.content {
		grid-area: 1 / 1 / 2 / 2;
		padding: 0.5rem 0;
	}

	.actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.action-btn {
		flex: 1;
		padding: 1rem;
		border-radius: 16px;
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		filter: grayscale(1);
	}

	.action-btn.primary {
		background: var(--accent);
		color: white;
	}

	.action-btn.primary:not(:disabled):hover {
		transform: scale(1.02);
		filter: brightness(1.1);
	}

	.action-btn.secondary {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.action-btn.secondary:not(:disabled):hover {
		background: var(--border);
	}
</style>
