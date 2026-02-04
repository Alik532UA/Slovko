<script lang="ts">
	import { _ } from "svelte-i18n";
	import { 
		Plus, Save, Trash2, ArrowUp, ArrowDown, FileJson, FileText, X,
		Bookmark, Star, Heart, List, Music, Book, Pen, Zap, Brain, Trophy, Flame, GraduationCap
	} from "lucide-svelte";
	import { playlistStore } from "$lib/stores/playlistStore.svelte";
	import type { PlaylistId, WordKey, CustomWord } from "$lib/types";
	import { THEME_COLORS } from "$lib/config/colors";
	import { slide } from "svelte/transition";
	import BaseModal from "../ui/BaseModal.svelte";

	interface Props {
		playlistId?: PlaylistId; // If null, we are creating new
		onclose: () => void;
	}

	let { playlistId, onclose }: Props = $props();

	// Mapping icons to components
	const PLAYLIST_ICONS = [
		{ id: "Bookmark", component: Bookmark },
		{ id: "Star", component: Star },
		{ id: "Heart", component: Heart },
		{ id: "List", component: List },
		{ id: "Music", component: Music },
		{ id: "Book", component: Book },
		{ id: "Pen", component: Pen },
		{ id: "Zap", component: Zap },
		{ id: "Brain", component: Brain },
		{ id: "Trophy", component: Trophy },
		{ id: "Flame", component: Flame },
		{ id: "GraduationCap", component: GraduationCap }
	];

	// Initial state
	const existingPlaylist = $derived(playlistId ? playlistStore.getPlaylist(playlistId) : null);
	const isSystem = $derived(existingPlaylist?.isSystem || false);
	
	let name = $state("");
	let description = $state("");
	let color = $state(THEME_COLORS[1]);
	let selectedIcon = $state("Bookmark");
	let words = $state<(WordKey | CustomWord)[]>([]);

	// Sync when modal opens or playlist changes
	$effect(() => {
		if (existingPlaylist) {
			name = $_(existingPlaylist.name);
			description = existingPlaylist.description || "";
			color = existingPlaylist.color || THEME_COLORS[1];
			selectedIcon = existingPlaylist.icon || "Bookmark";
			words = [...existingPlaylist.words];
		}
	});

	// New custom word state
	let newWordOriginal = $state("");
	let newWordTranslation = $state("");

	function handleSave() {
		if (!name.trim()) return;

		if (existingPlaylist) {
			playlistStore.updatePlaylist(existingPlaylist.id, {
				name: isSystem ? existingPlaylist.name : name,
				description,
				color,
				icon: selectedIcon,
				words
			});
		} else {
			const p = playlistStore.createPlaylist(name, description, color, selectedIcon);
			playlistStore.updatePlaylist(p.id, { words });
		}
		onclose();
	}

	function addCustomWord() {
		if (!newWordOriginal.trim() || !newWordTranslation.trim()) return;
		
		const custom: CustomWord = {
			id: `custom-${Date.now()}`,
			original: newWordOriginal.trim(),
			translation: newWordTranslation.trim()
		};
		
		words = [...words, custom];
		newWordOriginal = "";
		newWordTranslation = "";
	}

	function removeWord(index: number) {
		words = words.filter((_, i) => i !== index);
	}

	function moveWord(index: number, direction: -1 | 1) {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= words.length) return;
		
		const newWords = [...words];
		[newWords[index], newWords[newIndex]] = [newWords[newIndex], newWords[index]];
		words = newWords;
	}

	// Export functions
	function exportJSON() {
		if (!existingPlaylist) return;
		const data = JSON.stringify({ ...existingPlaylist, words }, null, 2);
		downloadFile(`${name}.json`, data);
	}

	function exportTXT() {
		if (!existingPlaylist) return;
		let content = `Name: ${name}\nDescription: ${description}\nColor: ${color}\nIcon: ${selectedIcon}\n---\n`;
		words.forEach(w => {
			if (typeof w === "string") {
				content += `${w}\n`;
			} else {
				content += `${w.original}|${w.translation}\n`;
			}
		});
		downloadFile(`${name}.txt`, content);
	}

	function downloadFile(filename: string, content: string) {
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<BaseModal {onclose} testid="playlist-modal" maxWidth="500px">
	<div class="content">
		<div class="header">
			<h2 data-testid="playlist-modal-title">
				{existingPlaylist ? $_("playlists.editTitle") : $_("playlists.createTitle")}
			</h2>
		</div>

		<div class="scroll-content">
			<!-- Meta Info -->
			<section class="section">
				<label>
					<span>{$_("playlists.name")}</span>
					<input 
						type="text" 
						bind:value={name} 
						placeholder={$_("playlists.namePlaceholder")} 
						disabled={isSystem}
						data-testid="playlist-name-input"
					/>
				</label>
				
				{#if !isSystem}
					<label transition:slide>
						<span>{$_("playlists.description")}</span>
						<textarea 
							bind:value={description} 
							placeholder={$_("playlists.descPlaceholder")}
							data-testid="playlist-desc-input"
						></textarea>
					</label>
				{/if}
			</section>

			<!-- Customization Picker (Hidden for system) -->
			{#if !isSystem}
				<section class="section customization-section" transition:slide>
					<div class="picker-group">
						<h3>{$_("playlists.color")}</h3>
						<div class="color-grid" data-testid="playlist-color-picker">
							{#each THEME_COLORS as c}
								<button 
									class="color-btn" 
									style="background-color: {c === 'transparent' ? 'rgba(255,255,255,0.1)' : c}"
									class:selected={color === c}
									onclick={() => (color = c)}
									aria-label={c}
									title={c}
									data-testid="color-btn-{c}"
								></button>
							{/each}
						</div>
					</div>

					<div class="picker-group">
						<h3>{$_("playlists.icon")}</h3>
						<div class="icon-grid" data-testid="playlist-icon-picker">
							{#each PLAYLIST_ICONS as { id, component: Icon }}
								<button 
									class="icon-picker-btn" 
									class:selected={selectedIcon === id}
									onclick={() => (selectedIcon = id)}
									data-testid="icon-btn-{id}"
									aria-label={id}
								>
									<Icon size={20} />
								</button>
							{/each}
						</div>
					</div>
				</section>
			{/if}

			<!-- Words Management -->
			<section class="section words-section">
				<div class="section-header">
					<h3>{$_("playlists.wordsCount", { values: { count: words.length } })}</h3>       
				</div>

				<div class="words-list" data-testid="playlist-words-list">
					{#each words as word, i (typeof word === 'string' ? word : word.id)}
						<div class="word-item" transition:slide>
							<div class="word-info">
								{#if typeof word === "string"}
									<span class="key" data-testid="word-key-{word}">{word}</span>
								{:else}
									<span class="custom" data-testid="word-custom-{word.id}">
										{word.original} <small>({word.translation})</small>
									</span>
								{/if}
							</div>
							<div class="word-actions">
								<button 
									onclick={() => moveWord(i, -1)} 
									disabled={i === 0}
									data-testid="move-up-{i}"
									aria-label="Move up"
								>
									<ArrowUp size={16} />
								</button>
								<button 
									onclick={() => moveWord(i, 1)} 
									disabled={i === words.length - 1}
									data-testid="move-down-{i}"
									aria-label="Move down"
								>
									<ArrowDown size={16} />
								</button>
								<button 
									class="delete" 
									onclick={() => removeWord(i)}
									data-testid="delete-word-{i}"
									aria-label="Delete"
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					{/each}
				</div>

				{#if !isSystem}
					<div class="add-custom-word" transition:slide>
						<div class="custom-word-inputs">
							<input 
								type="text" 
								bind:value={newWordOriginal} 
								placeholder={$_("settings.sourceLanguage")} 
								data-testid="new-word-original-input"
							/>
							<input 
								type="text" 
								bind:value={newWordTranslation} 
								placeholder={$_("settings.targetLanguage")} 
								data-testid="new-word-translation-input"
							/>
							<button 
								class="add-btn" 
								onclick={addCustomWord}
								data-testid="add-custom-word-btn"
								aria-label="Add word"
							>
								<Plus size={20} />
							</button>
						</div>
					</div>
				{/if}
			</section>

			{#if existingPlaylist}
				<section class="section io-section">
					<h3>{$_("playlists.exportTitle")}</h3>
					<div class="io-actions">
						<button 
							class="io-btn" 
							onclick={exportJSON}
							data-testid="export-json-btn"
						>
							<FileJson size={20} /> JSON
						</button>
						<button 
							class="io-btn" 
							onclick={exportTXT}
							data-testid="export-txt-btn"
						>
							<FileText size={20} /> TXT
						</button>
					</div>
				</section>
			{/if}
		</div>

		<div class="footer">
			<button 
				class="primary-action-btn save-btn" 
				onclick={handleSave}
				data-testid="save-playlist-btn"
			>
				<Save size={20} />
				{$_("common.save")}
			</button>
		</div>
	</div>
</BaseModal>

<style>
	.content {
		display: flex;
		flex-direction: column;
		max-height: 80vh;
	}

	.header {
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: var(--text-primary);
	}

	.scroll-content {
		overflow-y: auto;
		padding-right: 0.5rem;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.section {
		margin-bottom: 2rem;
	}

	.section h3 {
		margin-bottom: 1rem;
		font-size: 1.1rem;
		color: var(--text-secondary);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	label span {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding-left: 0.25rem;
	}

	input, textarea {
		width: 100%;
		padding: 0.85rem 1.1rem;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 1rem;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	input:focus, textarea:focus {
		outline: none;
		border-color: var(--accent);
		background: rgba(255, 255, 255, 0.06);
		box-shadow: 0 0 0 3px rgba(var(--accent-rgb, 233, 84, 32), 0.1);
	}

	input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: rgba(0, 0, 0, 0.05);
	}

	.customization-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.picker-group {
		display: flex;
		flex-direction: column;
	}

	.color-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
	}

	.color-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.color-btn.selected {
		border-color: var(--text-primary);
		transform: scale(1.2);
		box-shadow: 0 0 10px rgba(0,0,0,0.3);
	}

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
		gap: 0.5rem;
		justify-items: center;
	}

	.icon-picker-btn {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		cursor: pointer;
	}

	.icon-picker-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--text-primary);
	}

	.icon-picker-btn.selected {
		background: var(--accent);
		color: white;
		border-color: var(--accent);
		transform: scale(1.1);
	}

	.word-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 12px;
		border: 1px solid var(--border);
	}

	.word-info .key { font-weight: 600; }
	.word-info .custom { color: var(--accent); font-weight: 600; }

	.word-actions { display: flex; gap: 0.25rem; }
	.word-actions button {
		padding: 0.4rem;
		border-radius: 8px;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.word-actions button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.add-custom-word {
		background: rgba(var(--accent-rgb, 233, 84, 32), 0.05);
		padding: 1rem;
		border-radius: 16px;
		border: 1px dashed var(--accent);
	}

	.custom-word-inputs { display: flex; gap: 0.5rem; }

	.add-btn {
		background: var(--accent);
		color: white;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.io-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border);
		border-radius: 12px;
		color: var(--text-primary);
		font-weight: 600;
		cursor: pointer;
	}

	.footer {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.save-btn { width: 100%; }
</style>