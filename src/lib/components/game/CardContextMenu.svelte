<script lang="ts">
	import { playlistStore } from "$lib/controllers/PlaylistStore.svelte";
	import { _ } from "svelte-i18n";
	import { Heart, Bookmark, Volume2, AlertTriangle, X } from "lucide-svelte";
	import { speakText } from "$lib/services/speechService";
	import { scale, fade } from "svelte/transition";
	import { PLAYLIST_ICONS_MAP, type AppIconId } from "$lib/config/icons";

	interface Props {
		wordKey: string;
		language: string; // New prop to know which language to speak
		text: string; // New prop to know what to speak
		onclose: () => void;
		onreport: () => void;
	}
	let { wordKey, language, text, onclose, onreport }: Props = $props();

	let isFavorite = $derived(playlistStore.isFavorite(wordKey));
	let isExtra = $derived(playlistStore.isExtra(wordKey));

	function playSound() {
		speakText(text, language);
		onclose();
	}

	function toggleFav() {
		playlistStore.toggleFavorite(wordKey);
		onclose();
	}

	function toggleExt() {
		playlistStore.toggleExtra(wordKey);
		onclose();
	}

	function addToPlaylist(id: string) {
		playlistStore.addWordToPlaylist(id, wordKey);
		onclose();
	}

	function handleReport() {
		onreport();
		onclose();
	}

	/**
	 * Escape закриває меню — і доти не закривав.
	 *
	 * Обробник стояв на тлі, у якого був `tabindex="-1"`: до такого елемента не
	 * доходить ні табуляція, ні фокус при відкритті, тож подія на ньому не
	 * виникала ніколи. Тобто клавіатурний вихід виглядав написаним і не
	 * працював — рівно як `role="button"` поруч виглядав контролом і ним не був.
	 *
	 * На вікні, а не на самому меню: меню фокус собі не забирає (воно
	 * відкривається довгим натисканням по картці, а не табуляцією), тож подія
	 * з фокусованого елемента поза меню до нього не спливе. Захисту від набору
	 * тексту такий обробник не потребує — Escape не друкує символа, і це
	 * єдиний виняток, який допускає `hotkeys.test.ts`.
	 */
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!--
	Тло — НЕ кнопка: див. розгорнуте обґрунтування в `ui/BaseModal.svelte`.
	Тут вузол порожній, тож `nested-interactive` не спрацьовував, — але
	`role="button"` із `tabindex="-1"` лишав у дереві доступності контрол, до
	якого неможливо дійти з клавіатури й натиснути. `aria-hidden` каже про
	цей шар правду: він декоративний, а закриття є на Escape (обробник на
	вікні, доданий тим самим комітом) і на кнопці «×» у шапці меню.
-->
<div
	class="backdrop"
	onclick={onclose}
	aria-hidden="true"
	in:fade={{ duration: 150 }}
	data-testid="context-menu-backdrop"
></div>
<div
	class="menu"
	in:scale={{ duration: 200, start: 0.9, opacity: 0 }}
	data-testid="context-menu-container"
>
	<div class="menu-header" data-testid="context-menu-header">
		<span class="word-title">{text}</span>
		<button
			class="close-btn"
			onclick={onclose}
			aria-label={$_("common.close")}
			data-testid="card-context-menu-close-btn"
		>			<X size={18} />
		</button>
	</div>

	<div class="divider"></div>

	<button onclick={playSound} data-testid="context-menu-listen">
		<span class="icon">
			<Volume2 size={20} />
		</span>
		<span>{$_("common.listen")}</span>
	</button>
	<button onclick={toggleFav} data-testid="context-menu-favorite">
		<span class="icon" class:filled={isFavorite}>
			<Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
		</span>
		<span
			>{isFavorite
				? $_("playlists.removeFromFavorites")
				: $_("playlists.addToFavorites")}</span
		>
	</button>
	<button onclick={toggleExt} data-testid="context-menu-extra">
		<span class="icon" class:filled={isExtra}>
			<Bookmark size={20} fill={isExtra ? "currentColor" : "none"} />
		</span>
		<span
			>{isExtra
				? $_("playlists.removeFromExtra")
				: $_("playlists.addToExtra")}</span
		>
	</button>

	{#if playlistStore.customPlaylists.length > 0}
		<div class="divider"></div>
		<div class="submenu-label" data-testid="context-menu-playlists-title">{$_("playlists.addToPlaylist")}</div>
		{#each playlistStore.customPlaylists as p (p.id)}
			{@const Icon = PLAYLIST_ICONS_MAP[(p.icon as AppIconId) || "Bookmark"] || Bookmark}
			<button 
				onclick={() => addToPlaylist(p.id)} 
				class="custom-playlist-btn"
				data-testid="context-menu-playlist-{p.id}"
			>
				<span class="icon" style="color: {p.color}">
					<Icon size={18} fill={p.words.includes(wordKey) ? p.color : "none"} />
				</span>
				<span class="playlist-name">{p.name}</span>
			</button>
		{/each}
	{/if}

	<div class="divider"></div>

	<button
		onclick={handleReport}
		class="report-btn"
		data-testid="context-menu-report"
	>
		<span class="icon">
			<AlertTriangle size={20} />
		</span>
		<span>{$_("wordReport.title")}</span>
	</button>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 20000;
		/* Transparent but blocks clicks */
	}
	.menu {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 20001;
		background: var(--card-bg); /* Use theme card bg */
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 240px;
		max-width: 90vw;
		backdrop-filter: blur(10px);
	}

	.menu-header {
		padding: 0.5rem 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-height: 40px;
	}

	.word-title {
		font-weight: 800;
		font-size: 1.1rem;
		color: var(--accent);
		text-align: center;
		word-break: break-word;
		padding: 0 1.5rem;
	}

	.close-btn {
		position: absolute;
		right: 0.25rem;
		top: 50%;
		transform: translateY(-50%);
		width: 32px;
		height: 32px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
		border-radius: 50%;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	button {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		width: 100%;
		text-align: left;
		background: transparent;
		border: none;
		color: var(--text-primary);
		cursor: pointer;
		border-radius: 8px;
		font-size: 0.95rem;
		transition: background 0.2s;
	}

	button:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.report-btn {
		color: var(--error, #ff4444);
	}

	.report-btn:hover {
		background: rgba(255, 68, 68, 0.1);
	}

	.divider {
		height: 1px;
		background: var(--border);
		margin: 0.25rem 0.5rem;
		opacity: 0.5;
	}

	.submenu-label {
		font-size: 0.75rem;
		color: var(--text-secondary);
		padding: 0.5rem 1rem 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.custom-playlist-btn {
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
	}

	.playlist-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		transition: color 0.2s;
	}

	.report-btn .icon {
		color: inherit;
	}

	.icon.filled {
		color: var(--accent);
	}
</style>
