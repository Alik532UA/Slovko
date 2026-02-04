<script lang="ts">
	/**
	 * LevelTopicModal — Вибір рівня або теми
	 * Scalable architecture: Tabs defined as config
	 */
	import { _ } from "svelte-i18n";
	import { goto } from "$app/navigation";
	import {
		X,
		Leaf,
		PawPrint,
		Plane,
		Utensils,
		Home,
		Car,
		Laptop,
		HelpCircle,
		Hash,
		Palette,
		Clock,
		Users,
		Heart,
		Shirt,
		User,
		Footprints,
		Sparkles,
		GraduationCap,
		Brain,
		Scale,
		Puzzle,
		ArrowLeftRight,
		MessageSquare,
		RotateCcw,
		Bookmark,
		Plus,
		Settings2,
		Trash2,
		Upload,
	} from "lucide-svelte";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { playlistStore } from "$lib/stores/playlistStore.svelte";
	import PlaylistModal from "./PlaylistModal.svelte";
	import { PLAYLIST_ICONS_MAP } from "$lib/config/icons";
	import {
		ALL_LEVELS,
		ALL_TOPICS,
		type CEFRLevel,
		type GameMode,
		type PlaylistId,
	} from "$lib/types";

	// Map string names to components
	const ICON_MAP: Record<string, any> = {
		Leaf,
		PawPrint,
		Plane,
		Utensils,
		Home,
		Car,
		Laptop,
		HelpCircle,
		Hash,
		Palette,
		Clock,
		Users,
		Heart,
		Shirt,
		User,
		Footprints,
		Sparkles,
		GraduationCap,
		Brain,
		Scale,
		Puzzle,
		ArrowLeftRight,
	};

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

	// Playlist management state
	let showPlaylistModal = $state(false);
	let editingPlaylistId = $state<PlaylistId | undefined>(undefined);

	function openPlaylistModal(id?: PlaylistId) {
		editingPlaylistId = id;
		showPlaylistModal = true;
	}

	function deletePlaylist(id: PlaylistId, e: MouseEvent) {
		e.stopPropagation();
		if (confirm($_("playlists.confirmDelete"))) {
			playlistStore.deletePlaylist(id);
		}
	}

	async function handleImport(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const text = await file.text();
		try {
			if (file.name.endsWith(".json")) {
				const data = JSON.parse(text);
				// Basic validation
				if (data.name && Array.isArray(data.words)) {
					const p = playlistStore.createPlaylist(
						data.name,
						data.description || "",
						data.color || "#FF5733",
					);
					playlistStore.updatePlaylist(p.id, { words: data.words });
				}
			} else {
				// Parse TXT with metadata
				const lines = text.split("\n");
				let name = "Imported Playlist";
				let desc = "";
				let color = "#FF5733";
				let words: any[] = [];
				let parsingWords = false;

				for (let line of lines) {
					line = line.trim();
					if (line === "---") {
						parsingWords = true;
						continue;
					}
					if (!parsingWords) {
						if (line.startsWith("Name:")) name = line.replace("Name:", "").trim();
						if (line.startsWith("Description:"))
							desc = line.replace("Description:", "").trim();
						if (line.startsWith("Color:"))
							color = line.replace("Color:", "").trim();
					} else if (line) {
						if (line.includes("|")) {
							const [original, translation] = line.split("|");
							words.push({
								id: `custom-${Date.now()}-${Math.random()}`,
								original,
								translation,
							});
						} else {
							words.push(line);
						}
					}
				}
				const p = playlistStore.createPlaylist(name, desc, color);
				playlistStore.updatePlaylist(p.id, { words });
			}
		} catch (err) {
			console.error("Import failed", err);
			alert($_("playlists.importError"));
		}
		(e.target as HTMLInputElement).value = ""; // Reset input
	}

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
		<div class="tabs">
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
		</div>

		<!-- Content -->
		<div class="content">
			{#if activeTab === "levels"}
				<div class="grid">
					{#each ALL_LEVELS as level (level)}
						<button
							class="item"
							class:selected={settingsStore.value.mode === "levels" &&
								settingsStore.value.currentLevel === level}
							onclick={() => selectLevel(level)}
							data-testid="level-item-{level}"
						>
							<span class="item-title">{level}</span>
							<span class="item-desc">{$_(`levels.${level}`)}</span>
						</button>
					{/each}
				</div>
			{:else if activeTab === "topics"}
				<div class="grid topics-grid">
					{#each ALL_TOPICS as topic (topic.id)}
						{@const Icon = ICON_MAP[topic.icon]}
						<button
							class="item topic-item"
							class:selected={settingsStore.value.currentTopic === topic.id}
							onclick={() => selectTopic(topic.id)}
							data-testid="topic-item-{topic.id}"
						>
							<span class="item-icon">
								{#if Icon}
									<Icon size={24} />
								{:else}
									?
								{/if}
							</span>
							<span class="item-title">{$_(`topics.${topic.id}`)}</span>
						</button>
					{/each}
				</div>
			{:else if activeTab === "phrases"}
				<div class="grid">
					{#each ALL_LEVELS as level (level)}
						<button
							class="item"
							class:selected={settingsStore.value.mode === "phrases" &&
								settingsStore.value.currentLevel === level}
							onclick={() => selectPhrasesLevel(level)}
							data-testid="phrase-level-item-{level}"
						>
							<div class="item-icon">
								<MessageSquare size={24} />
							</div>
							<span class="item-title">{level}</span>
							<span class="item-desc">{$_(`levels.${level}`)}</span>
						</button>
					{/each}
				</div>
			{:else if activeTab === "playlists"}
				<div class="grid topics-grid">
					<!-- System Playlists -->
					{#each [playlistStore.systemPlaylists.favorites, playlistStore.systemPlaylists.mistakes, playlistStore.systemPlaylists.extra] as p (p.id)}
						{@const Icon = PLAYLIST_ICONS_MAP[p.id === "mistakes" ? "RotateCcw" : (p.id === "favorites" ? "Heart" : "Bookmark")]}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="item topic-item {p.id}"
							class:selected={settingsStore.value.currentPlaylist === p.id}
							onclick={() => selectPlaylist(p.id)}
							data-testid="playlist-{p.id}"
						>
							<span class="item-icon">
								{#if Icon}<Icon size={24} />{/if}
							</span>
							<div class="item-info">
								<span class="item-title">{$_(p.name)}</span>
								<span class="word-count"
									>{$_("playlists.wordsCount", {
										values: { count: p.words.length },
									})}</span
								>
							</div>
							<div class="actions">
								<button
									class="action-btn"
									onclick={(e) => {
										e.stopPropagation();
										openPlaylistModal(p.id);
									}}
									title={$_("common.edit")}
								>
									<Settings2 size={18} />
								</button>
							</div>
						</div>
					{/each}

					<!-- Custom Playlists -->
					{#each playlistStore.customPlaylists as p (p.id)}
						{@const Icon = PLAYLIST_ICONS_MAP[p.icon || "Bookmark"] || Bookmark}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="item topic-item custom-playlist"
							style="border-color: {p.color}"
							class:selected={settingsStore.value.currentPlaylist === p.id}
							onclick={() => selectPlaylist(p.id)}
							data-testid="playlist-custom-{p.id}"
						>
							<span class="item-icon" style="color: {p.color}">
								<Icon size={24} />
							</span>
							<div class="item-info">
								<span class="item-title">{p.name}</span>
								<span class="word-count"
									>{$_("playlists.wordsCount", {
										values: { count: p.words.length },
									})}</span
								>
							</div>
							<div class="actions">
								<button
									class="action-btn"
									onclick={(e) => {
										e.stopPropagation();
										openPlaylistModal(p.id);
									}}
								>
									<Settings2 size={18} />
								</button>
								<button
									class="action-btn danger"
									onclick={(e) => deletePlaylist(p.id, e)}
								>
									<Trash2 size={18} />
								</button>
							</div>
						</div>
					{/each}

					<!-- Create New & Import -->
					<div class="playlist-controls">
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="item topic-item add-playlist" onclick={() => openPlaylistModal()}>
							<Plus size={24} />
							<span>{$_("playlists.createNew")}</span>
						</div>

						<label class="item topic-item import-playlist">
							<Upload size={24} />
							<span>{$_("playlists.import")}</span>
							<input
								type="file"
								accept=".json,.txt"
								onchange={handleImport}
								class="sr-only"
							/>
						</label>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

{#if showPlaylistModal}
	<PlaylistModal
		playlistId={editingPlaylistId}
		onclose={() => (showPlaylistModal = false)}
	/>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10001;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(8px);
		display: flex;
		/* justify-content: center; REMOVED */
		align-items: center;
		padding: 1rem;
		transition: background 0.3s;
		overflow-y: auto; /* Allow scroll if content is tall */
	}

	.modal {
		background: transparent;
		max-width: 100%;
		width: 100%;
		position: relative;
		display: flex;
		flex-direction: column;
		/* max-height: 85vh; - Remove rigid constraint if we want full scroll */
		color: var(--text-primary);
		margin: auto; /* Center vertically if space exists */
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
		/* border-bottom: 1px solid var(--border); - Remove rigid border */
		margin-bottom: 1rem;
		gap: 0.5rem;
		justify-content: center;
		flex-wrap: wrap; /* Allow wrapping on small screens */
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
		background: var(--bg-secondary); /* Soft hover bg */
	}

	.tab.active {
		color: var(--text-primary);
		font-weight: 700;
		background: var(--bg-secondary);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.content {
		padding: 0.5rem; /* Add some padding for scrollbar space */
		overflow-y: auto;
		/* Custom scrollbar for webkit */
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 0.75rem;
	}

	.topics-grid {
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	}

	.item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem 0.5rem;
		background: var(--card-bg); /* Cards keep their background */
		border: 2px solid var(--card-border);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Slight shadow for depth */
		height: 100%; /* Ensure full height in grid */
	}

	.topic-item {
		flex-direction: row;
		justify-content: flex-start;
		align-items: center; /* Center vertically */
		padding: 0.75rem 1rem;
		gap: 0.75rem;
		min-height: 60px; /* Enforce minimum height */
	}

	.item:hover {
		border-color: var(--card-hover-border);
		transform: translateY(-2px);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
	}

	.item.selected {
		background: var(--selected-bg);
		border-color: var(--selected-border);
		box-shadow: 0 0 0 2px var(--selected-border); /* Highlight selected */
	}

	.item.favorites {
		border-color: var(--playlist-favorites-border);
	}
	.item.mistakes {
		border-color: var(--playlist-mistakes-border);
	}
	.item.extra {
		border-color: var(--playlist-extra-border);
	}

	.item-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.item-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}

	.item-icon {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		display: flex; /* Fix icon alignment */
		align-items: center;
		justify-content: center;
		flex-shrink: 0; /* Prevent icon shrinking */
		color: var(--text-primary);
	}

	.topic-item .item-icon {
		font-size: 1.25rem;
		margin-bottom: 0;
	}

	.topic-item .item-title {
		font-size: 0.95rem;
		text-align: left;
		flex: 1; /* Allow text to take remaining space */
		word-break: break-word; /* Wrap long words */
		overflow-wrap: break-word;
	}

	.item-info {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.word-count {
		font-size: 0.7rem;
		color: var(--text-secondary);
		font-weight: 400;
	}

	.actions {
		display: flex;
		gap: 0.25rem;
	}

	.action-btn {
		padding: 0.4rem;
		border-radius: 8px;
		color: var(--text-secondary);
		transition: all 0.2s;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.action-btn.danger:hover {
		color: var(--toast-error);
	}

	.playlist-controls {
		display: contents; /* Keep grid structure */
	}

	.add-playlist,
	.import-playlist {
		border-style: dashed;
		opacity: 0.8;
		background: transparent;
	}

	.add-playlist:hover,
	.import-playlist:hover {
		opacity: 1;
		border-color: var(--accent);
		color: var(--accent);
	}
</style>