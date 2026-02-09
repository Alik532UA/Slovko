<script lang="ts">
	import { _ } from "svelte-i18n";
	import { playlistStore } from "$lib/stores/playlistStore.svelte";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { gameDataService } from "$lib/services/gameDataService";
	import type {
		PlaylistId,
		WordKey,
		CustomWord,
		TranslationDictionary,
	} from "$lib/types";
	import { THEME_COLORS } from "$lib/config/colors";
	import { slide } from "svelte/transition";
	import { untrack } from "svelte";
	import BaseModal from "../ui/BaseModal.svelte";
	import { APP_ICONS } from "$lib/config/icons";

	interface Props {
		playlistId?: PlaylistId; // If null, we are creating new
		onclose: () => void;
	}

	let { playlistId, onclose }: Props = $props();

	// Mapping icons to components from central registry
	const PLAYLIST_ICONS = [
		{ id: "Bookmark", component: APP_ICONS.Bookmark },
		{ id: "Star", component: APP_ICONS.Star },
		{ id: "Heart", component: APP_ICONS.Heart },
		{ id: "List", component: APP_ICONS.List },
		{ id: "Music", component: APP_ICONS.Music },
		{ id: "Book", component: APP_ICONS.Book },
		{ id: "Pen", component: APP_ICONS.Pen },
		{ id: "Zap", component: APP_ICONS.Zap },
		{ id: "Brain", component: APP_ICONS.Brain },
		{ id: "Trophy", component: APP_ICONS.Trophy },
		{ id: "Flame", component: APP_ICONS.Flame },
		{ id: "GraduationCap", component: APP_ICONS.GraduationCap },
		{ id: "Target", component: APP_ICONS.Target },
		{ id: "Coffee", component: APP_ICONS.Coffee },
		{ id: "Rocket", component: APP_ICONS.Rocket },
		{ id: "Globe", component: APP_ICONS.Globe },
		{ id: "Smile", component: APP_ICONS.Smile },
		{ id: "Eye", component: APP_ICONS.Eye },
	];

	// Initial state
	const existingPlaylist = $derived(
		playlistId ? playlistStore.getPlaylist(playlistId) : null,
	);
	const isSystem = $derived(existingPlaylist?.isSystem || false);

	let name = $state("");
	let description = $state("");
	let color = $state(THEME_COLORS[1]);
	let selectedIcon = $state("Bookmark");
	let words = $state<(WordKey | CustomWord)[]>([]);

	// Cache for word translations (for system keys)
	let translations = $state<TranslationDictionary>({});

	// Sync when modal opens or playlist changes
	$effect(() => {
		const p = existingPlaylist;
		if (p) {
			untrack(() => {
				name = $_(p.name);
				description = p.description || "";
				color = p.color || THEME_COLORS[1];
				selectedIcon = p.icon || "Bookmark";
				words = [...p.words];
				loadMissingTranslations();
			});
		}
	});

	async function loadMissingTranslations() {
		const keys = words.filter((w) => typeof w === "string") as string[];
		if (keys.length === 0) return;

		try {
			const data = await gameDataService.loadGameData(
				{ ...settingsStore.value, mode: "levels", currentLevel: ["C2"] },
				{ favorites: [], extra: [], mistakes: [], custom: [] },
			);
			translations = { ...translations, ...data.targetTranslations };
		} catch (e) {
			console.error("Failed to load translations for modal", e);
		}
	}

	let newWordLeft = $state("");
	let newWordRight = $state("");

	function handleSave() {
		if (!name.trim()) return;

		if (existingPlaylist) {
			playlistStore.updatePlaylist(existingPlaylist.id, {
				name: isSystem ? existingPlaylist.name : name,
				description,
				color,
				icon: selectedIcon,
				words,
			});
		} else {
			const p = playlistStore.createPlaylist(
				name,
				description,
				color,
				selectedIcon,
			);
			playlistStore.updatePlaylist(p.id, { words });
		}
		onclose();
	}

	function addCustomWord() {
		if (!newWordLeft.trim() || !newWordRight.trim()) return;

		const custom: CustomWord = {
			id: `custom-${Date.now()}`,
			left: newWordLeft.trim(),
			right: newWordRight.trim(),
		};

		words = [...words, custom];
		newWordLeft = "";
		newWordRight = "";
	}

	function removeWord(index: number) {
		words = words.filter((_, i) => i !== index);
	}

	function moveWord(index: number, direction: -1 | 1) {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= words.length) return;

		const newWords = [...words];
		[newWords[index], newWords[newIndex]] = [
			newWords[newIndex],
			newWords[index],
		];
		words = newWords;
	}

	function exportJSON() {
		if (!existingPlaylist) return;
		const data = JSON.stringify(
			{
				id: existingPlaylist.id,
				app: "Slovko",
				name: existingPlaylist.name,
				description: existingPlaylist.description,
				color: existingPlaylist.color,
				icon: existingPlaylist.icon,
				isSystem: existingPlaylist.isSystem,
				words,
				createdAt: existingPlaylist.createdAt,
			},
			null,
			2,
		);
		downloadFile(`${name}.json`, data);
	}

	function exportTXT() {
		if (!existingPlaylist) return;
		let content = `App: Slovko\nName: ${name}\nDescription: ${description}\nColor: ${color}\nIcon: ${selectedIcon}\n---\n`;
		words.forEach((w) => {
			if (typeof w === "string") {
				content += `${w}\n`;
			} else {
				content += `${w.left}|${w.right}\n`;
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
	<div class="content" data-testid="playlist-modal-content">
		<div class="header">
			<h2 data-testid="playlist-modal-title">
				{existingPlaylist
					? $_("playlists.editTitle")
					: $_("playlists.createTitle")}
			</h2>
		</div>

		<div class="scroll-content" data-testid="playlist-modal-scroll">
			<section class="section" data-testid="playlist-meta-section">
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

			{#if !isSystem}
				<section
					class="section customization-section"
					transition:slide
					data-testid="playlist-customize-section"
				>
					<div class="picker-group">
						<h3>{$_("playlists.color")}</h3>
						<div class="color-grid" data-testid="playlist-color-picker">
							{#each THEME_COLORS as c}
								<button
									class="color-btn"
									style="background-color: {c === 'transparent'
										? 'rgba(255,255,255,0.1)'
										: c}"
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

			<section
				class="section words-section"
				data-testid="playlist-words-section"
			>
				<div class="section-header">
					<h3>
						{$_("playlists.wordsCount", { values: { count: words.length } })}
					</h3>
				</div>

				<div class="words-list" data-testid="playlist-words-list">
					{#each words as word, i (typeof word === "string" ? word : word.id)}
						<div
							class="word-item"
							transition:slide
							data-testid="playlist-word-item-{i}"
						>
							<div class="word-info">
								{#if typeof word === "string"}
									<div class="word-pill" data-testid="word-left-{word}">
										{word}
									</div>
									<div
										class="word-pill"
										data-testid="word-right-{word}"
									>
										{translations[word] || "..."}
									</div>
								{:else}
									<div
										class="word-pill"
										data-testid="word-left-custom-{word.id}"
									>
										{word.left}
									</div>
									<div
										class="word-pill"
										data-testid="word-right-custom-{word.id}"
									>
										{word.right}
									</div>
								{/if}
							</div>
							<div class="word-actions">
								<button
									onclick={() => moveWord(i, -1)}
									disabled={i === 0}
									data-testid="move-up-{i}"
									aria-label="Move up"
								>
									<APP_ICONS.ArrowUp size={16} />
								</button>
								<button
									onclick={() => moveWord(i, 1)}
									disabled={i === words.length - 1}
									data-testid="move-down-{i}"
									aria-label="Move down"
								>
									<APP_ICONS.ArrowDown size={16} />
								</button>
								<button
									class="delete"
									onclick={() => removeWord(i)}
									data-testid="delete-word-{i}"
									aria-label="Delete"
								>
									<APP_ICONS.Trash2 size={16} />
								</button>
							</div>
						</div>
					{/each}
				</div>

				{#if !isSystem}
					<div
						class="add-custom-word"
						transition:slide
						data-testid="playlist-add-word-container"
					>
						<div class="custom-word-inputs">
							<input
								type="text"
								bind:value={newWordLeft}
								placeholder={$_("playlists.leftColumn")}
								data-testid="new-word-left-input"
							/>
							<input
								type="text"
								bind:value={newWordRight}
								placeholder={$_("playlists.rightColumn")}
								data-testid="new-word-right-input"
							/>
							<button
								class="add-btn"
								onclick={addCustomWord}
								data-testid="add-custom-word-btn"
								aria-label="Add word"
							>
								<APP_ICONS.Plus size={20} />
							</button>
						</div>
					</div>
				{/if}
			</section>

			{#if existingPlaylist}
				<section class="section io-section" data-testid="playlist-io-section">
					<h3>{$_("playlists.exportTitle")}</h3>
					<div class="io-actions" data-testid="playlist-io-actions">
						<button
							class="io-btn"
							onclick={exportJSON}
							data-testid="export-json-btn"
						>
							<APP_ICONS.FileJson size={20} /> JSON
						</button>
						<button
							class="io-btn"
							onclick={exportTXT}
							data-testid="export-txt-btn"
						>
							<APP_ICONS.FileText size={20} /> TXT
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
				<APP_ICONS.Save size={20} />
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
	input,
	textarea {
		width: 100%;
		padding: 0.85rem 1.1rem;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 1rem;
		transition: all 0.2s;
	}
	input:focus,
	textarea:focus {
		outline: none;
		border-color: var(--accent);
		background: rgba(255, 255, 255, 0.06);
		box-shadow: 0 0 0 3px rgba(233, 84, 32, 0.1);
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
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
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
		gap: 1rem;
	}
	.word-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}
	.word-pill {
		padding: 0.5rem 0.75rem;
		border-radius: 10px;
		font-size: 0.95rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		max-width: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		text-align: center;
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-primary);
	}
	.word-actions {
		display: flex;
		gap: 0.25rem;
	}
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
	.word-actions button.delete:hover {
		color: var(--toast-error);
		background: rgba(239, 68, 68, 0.1);
	}
	.add-custom-word {
		background: rgba(233, 84, 32, 0.08);
		padding: 1.25rem;
		border-radius: 16px;
		border: 1px solid rgba(233, 84, 32, 0.15);
		margin-top: 1rem;
	}
	.custom-word-inputs {
		display: grid;
		grid-template-columns: 1fr 1fr 48px;
		gap: 0.75rem;
		align-items: center;
	}
	.custom-word-inputs input {
		flex: none;
		width: 100%;
		min-width: 0;
		height: 48px;
	}
	.add-btn {
		background: var(--accent);
		color: white;
		height: 48px;
		width: 48px;
		border-radius: 12px;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		cursor: pointer;
	}
	.io-actions {
		display: flex;
		flex-direction: row;
		gap: 0.75rem;
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
	.save-btn {
		width: 100%;
	}
</style>
