<script lang="ts">
	/**
	 * LevelTopicModal — Вибір рівня або теми
	 * Використовує BaseModal для сучасного дизайну
	 */
	import { _ } from "svelte-i18n";
	import { fade } from "svelte/transition";
	import { goto } from "$app/navigation";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import type { GameMode, PlaylistId, TenseForm } from "$lib/types/index";
	import BaseModal from "../ui/BaseModal.svelte";
	import SegmentedControl from "../ui/SegmentedControl.svelte";
	import { smoothHeight } from "$lib/actions/smoothHeight";
	import { page } from "$app/stores";
	import { navigationState } from "$lib/controllers/NavigationState.svelte";
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

	const visibleTabs = $derived(
		TABS.filter(
			(tab) =>
				settingsStore.value.interactionMode === "match" ||
				tab.id === "levels" ||
				tab.id === "topics",
		),
	);

	const interactionOptions = [
		{ id: "match", label: "interaction.match", icon: Layers, testId: "btn-match" },
		{ id: "swipe", label: "interaction.swipe", icon: Gamepad2, testId: "btn-swipe" }
	];

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

	function toggleForm(form: TenseForm) {
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
				<SegmentedControl
					options={interactionOptions}
					value={settingsStore.value.interactionMode}
					onchange={(id) => setInteractionMode(id as any)}
					testid="interaction-toggle"
					class="mb-4 max-w-[400px]"
				/>

				<SegmentedControl
					options={visibleTabs.map(t => ({ id: t.id, label: t.label, testId: t.testId }))}
					value={activeTab}
					onchange={(id) => navigationState.setTab(id as any)}
					testid="level-topic-tabs"
					class="mb-6 max-w-[500px]"
				/>
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
					<div class="actions safe-scale-container" data-testid="level-topic-actions">
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
		flex-direction: row !important; /* Force row for modal footer */
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
		transition: var(--hover-transition);
		border: none;
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		filter: grayscale(1);
	}

	.action-btn:not(:disabled):hover {
		transform: scale(var(--hover-scale));
		z-index: 2;
	}

	.action-btn.primary {
		background: var(--accent);
		color: white;
	}

	.action-btn.primary:not(:disabled):hover {
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
