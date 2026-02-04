<script lang="ts">
	/**
	 * LevelTopicModal — Вибір рівня або теми
	 * Decomposed into specialized grid components
	 */
	import { _ } from "svelte-i18n";
	import { goto } from "$app/navigation";
	import { X } from "lucide-svelte";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import type { CEFRLevel, GameMode, PlaylistId } from "$lib/types";

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

	// Initialize directly from store (SSoT)
	let activeTab = $state<GameMode>(settingsStore.value.mode);

	function selectLevel(level: CEFRLevel) {
		goto(`?mode=levels&level=${level}`);
		onclose();
	}

	function selectPhrasesLevel(level: CEFRLevel) {
		goto(`?mode=phrases&level=${level}`);
		onclose();
	}

	function selectTopic(topicId: string) {
		goto(`?mode=topics&topic=${topicId}`);
		onclose();
	}

	function selectPlaylist(playlistId: PlaylistId) {
		goto(`?mode=playlists&playlist=${playlistId}`);
		onclose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}
</script>

<div
	class="modal-backdrop"
	onclick={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	onkeydown={(e) => {
		if (e.key === "Escape") onclose();
	}}
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="modal"
		data-testid="level-topic-modal"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
	>
		<button
			class="close-btn"
			onclick={onclose}
			aria-label="Close"
			data-testid="close-level-topic-modal-btn"
		>
			<X size={28} />
		</button>

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
				<LevelGrid mode="levels" onselect={selectLevel} />
			{:else if activeTab === "topics"}
				<TopicGrid onselect={selectTopic} />
			{:else if activeTab === "phrases"}
				<LevelGrid mode="phrases" onselect={selectPhrasesLevel} />
			{:else if activeTab === "playlists"}
				<PlaylistGrid onselect={selectPlaylist} />
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10001;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		padding: 1rem;
		transition: background 0.3s;
		overflow-y: auto;
	}

	.modal {
		background: transparent;
		max-width: 100%;
		width: 100%;
		position: relative;
		display: flex;
		flex-direction: column;
		color: var(--text-primary);
		margin: auto;
	}

	.close-btn {
		position: absolute;
		top: -40px;
		right: 0;
		background: transparent;
		border: none;
		color: var(--text-primary);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 8px;
		display: flex;
		transition: all 0.2s;
	}

	.close-btn:hover {
		transform: scale(1.1);
		color: var(--accent);
	}

	.tabs {
		display: flex;
		margin-bottom: 1rem;
		gap: 0.5rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.tab {
		padding: 0.5rem 1rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border-radius: 8px;
	}

	.tab:hover {
		color: var(--text-primary);
		background: var(--bg-secondary);
	}

	.tab.active {
		color: var(--text-primary);
		font-weight: 700;
		background: var(--bg-secondary);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.content {
		padding: 0.5rem;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}
</style>