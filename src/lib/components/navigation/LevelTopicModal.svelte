<script lang="ts">
	/**
	 * LevelTopicModal — Вибір рівня або теми
	 * Використовує BaseModal для сучасного дизайну
	 */
	import { _ } from "svelte-i18n";
	import { goto } from "$app/navigation";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import type { CEFRLevel, GameMode, PlaylistId } from "$lib/types";
	import BaseModal from "../ui/BaseModal.svelte";

	// Mode Components
	import LevelGrid from "./modes/LevelGrid.svelte";
	import TopicGrid from "./modes/TopicGrid.svelte";
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
		{ id: "playlists", label: "tabs.playlists", testId: "tab-playlists" },
	];

	// Initialize directly from store
	let activeTab = $state<GameMode>(settingsStore.value.mode);
	
	// Local state for multi-selection
	let selectedIds = $state<string[]>([]);

	// Sync local selection when tab changes or modal opens
	$effect(() => {
		if (activeTab === settingsStore.value.mode) {
			if (activeTab === "topics") selectedIds = [...settingsStore.value.currentTopic];
			else if (activeTab === "levels" || activeTab === "phrases") selectedIds = [...settingsStore.value.currentLevel];
		} else {
			selectedIds = [];
		}
	});

	function toggleId(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter(i => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	function resetSelection() {
		selectedIds = [];
	}

	function startLearning() {
		if (selectedIds.length === 0) return;

		const idsStr = selectedIds.join(",");
		if (activeTab === "levels") {
			goto(`?mode=levels&level=${idsStr}`);
		} else if (activeTab === "phrases") {
			goto(`?mode=phrases&level=${idsStr}`);
		} else if (activeTab === "topics") {
			goto(`?mode=topics&topic=${idsStr}`);
		}
		onclose();
	}

	function selectPlaylist(playlistId: PlaylistId) {
		goto(`?mode=playlists&playlist=${playlistId}`);
		onclose();
	}
</script>

<BaseModal {onclose} testid="level-topic-modal" maxWidth="640px">
	<div class="modal-inner">
		<!-- Tabs -->
		<nav class="tabs">
			{#each TABS as tab (tab.id)}
				<button
					class="tab"
					class:active={activeTab === tab.id}
					onclick={() => (activeTab = tab.id)}
					data-testid={tab.testId}
				>
					{$_(tab.label)}
				</button>
			{/each}
		</nav>

		<!-- Content -->
		<div class="content">
			{#if activeTab === "levels"}
				<LevelGrid mode="levels" {selectedIds} onselect={toggleId} />
			{:else if activeTab === "topics"}
				<TopicGrid {selectedIds} onselect={toggleId} />
			{:else if activeTab === "phrases"}
				<LevelGrid mode="phrases" {selectedIds} onselect={toggleId} />
			{:else if activeTab === "playlists"}
				<PlaylistGrid onselect={selectPlaylist} />
			{/if}
		</div>

		<!-- Actions -->
		{#if activeTab !== "playlists"}
			<div class="actions">
				<button 
					class="action-btn secondary" 
					onclick={resetSelection}
					disabled={selectedIds.length === 0}
				>
					{$_("common.reset")}
				</button>
				<button 
					class="action-btn primary" 
					onclick={startLearning}
					disabled={selectedIds.length === 0}
				>
					{$_("common.learn")} ({selectedIds.length})
				</button>
			</div>
		{/if}
	</div>
</BaseModal>

<style>
	.modal-inner {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.tabs {
		display: flex;
		margin-bottom: 1.5rem;
		gap: 0.25rem;
		justify-content: flex-start;
		overflow-x: auto;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
		scrollbar-width: none;
	}

	.tabs::-webkit-scrollbar {
		display: none;
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

	.content {
		padding: 0.5rem 0;
		max-height: 60vh;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
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
