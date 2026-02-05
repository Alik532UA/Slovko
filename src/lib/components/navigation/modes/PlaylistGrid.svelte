<script lang="ts">
	import { _ } from "svelte-i18n";
	import {
		Bookmark,
		Plus,
		Settings2,
		Trash2,
		Upload,
	} from "lucide-svelte";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { playlistStore } from "$lib/stores/playlistStore.svelte";
	import PlaylistModal from "../PlaylistModal.svelte";
	import { PLAYLIST_ICONS_MAP } from "$lib/config/icons";
	import type { PlaylistId } from "$lib/types";

	interface Props {
		onselect: (id: PlaylistId) => void;
	}

	let { onselect }: Props = $props();

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
				if (data.name && Array.isArray(data.words)) {
					const p = playlistStore.createPlaylist(
						data.name,
						data.description || "",
						data.color || "#FF5733",
					);
					if (p) playlistStore.updatePlaylist(p.id, { words: data.words });
				}
			} else {
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
						if (line.startsWith("Description:")) desc = line.replace("Description:", "").trim();
						if (line.startsWith("Color:")) color = line.replace("Color:", "").trim();
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
				if (p) playlistStore.updatePlaylist(p.id, { words });
			}
		} catch (err) {
			console.error("Import failed", err);
			alert($_("playlists.importError"));
		}
		(e.target as HTMLInputElement).value = "";
	}
</script>

<div class="grid topics-grid">
	<!-- System Playlists -->
	{#each [playlistStore.systemPlaylists.favorites, playlistStore.systemPlaylists.mistakes, playlistStore.systemPlaylists.extra] as p (p.id)}
		{@const Icon = PLAYLIST_ICONS_MAP[p.id === "mistakes" ? "RotateCcw" : p.id === "favorites" ? "Heart" : "Bookmark"]}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="item topic-item {p.id}"
			class:selected={settingsStore.value.currentPlaylist === p.id}
			onclick={() => onselect(p.id)}
			onkeydown={(e) => e.key === "Enter" && onselect(p.id)}
			role="button"
			tabindex="0"
			data-testid="playlist-{p.id}"
		>
			<span class="item-icon">
				{#if Icon}<Icon size={24} />{/if}
			</span>
			<div class="item-info">
				<span class="item-title">{$_(p.name)}</span>
				<span class="word-count"
					>{$_("playlists.wordsCount", { values: { count: p.words.length } })}</span
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
		{@const Icon = (PLAYLIST_ICONS_MAP as any)[p.icon || "Bookmark"] || Bookmark}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="item topic-item custom-playlist"
			style="border-color: {p.color}"
			class:selected={settingsStore.value.currentPlaylist === p.id}
			onclick={() => onselect(p.id)}
			onkeydown={(e) => e.key === "Enter" && onselect(p.id)}
			role="button"
			tabindex="0"
			data-testid="playlist-custom-{p.id}"
		>
			<span class="item-icon" style="color: {p.color}">
				<Icon size={24} />
			</span>
			<div class="item-info">
				<span class="item-title">{p.name}</span>
				<span class="word-count"
					>{$_("playlists.wordsCount", { values: { count: p.words.length } })}</span
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
		<div
			class="item topic-item add-playlist"
			onclick={() => openPlaylistModal()}
			onkeydown={(e) => e.key === "Enter" && openPlaylistModal()}
			role="button"
			tabindex="0"
		>
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

{#if showPlaylistModal}
	<PlaylistModal
		playlistId={editingPlaylistId}
		onclose={() => (showPlaylistModal = false)}
	/>
{/if}

<style>
	.grid {
		display: grid;
		gap: 0.75rem;
	}

	.topics-grid {
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	}

	.item {
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--card-bg);
		border: 2px solid var(--card-border);
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		min-height: 72px;
		gap: 0.75rem;
		text-align: left;
	}

	.topic-item.favorites { border-color: var(--playlist-favorites-border); }
	.topic-item.mistakes { border-color: var(--playlist-mistakes-border); }
	.topic-item.extra { border-color: var(--playlist-extra-border); }

	.item:hover {
		border-color: var(--card-hover-border);
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
	}

	.item.selected {
		background: var(--selected-bg);
		border-color: var(--selected-border);
		box-shadow: 0 0 0 2px var(--selected-border);
	}

	.item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent);
		flex-shrink: 0;
	}

	.item-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.item-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.25;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.word-count {
		font-size: 0.8rem;
		color: var(--text-secondary);
		opacity: 0.8;
	}

	.actions {
		display: flex;
		gap: 0.15rem;
		margin-left: auto;
	}

	.action-btn {
		padding: 0.35rem;
		border-radius: 10px;
		color: var(--text-secondary);
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid transparent;
		transition: all 0.2s;
		cursor: pointer;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.action-btn.danger:hover {
		color: var(--toast-error);
		background: rgba(239, 68, 68, 0.1);
	}

	.playlist-controls {
		display: contents;
	}

	.add-playlist,
	.import-playlist {
		border-style: dashed;
		opacity: 0.7;
		background: rgba(255, 255, 255, 0.02);
		font-weight: 600;
		justify-content: center;
	}

	.add-playlist:hover,
	.import-playlist:hover {
		opacity: 1;
		border-color: var(--accent);
		color: var(--accent);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}
</style>