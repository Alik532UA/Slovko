<script lang="ts">
	import { playlistStore } from "$lib/stores/playlistStore.svelte";
	import { gameState } from "$lib/stores/gameState.svelte";
	import { _ } from "svelte-i18n";
	import { Heart, Bookmark, Volume2 } from "lucide-svelte";
	import { speakText } from "$lib/services/speechService";
	import { settingsStore } from "$lib/stores/settingsStore.svelte";
	import { scale, fade } from "svelte/transition";

	interface Props {
		x: number;
		y: number;
		wordKey: string;
		language: string; // New prop to know which language to speak
		text: string; // New prop to know what to speak
		onclose: () => void;
	}
	let { x, y, wordKey, language, text, onclose }: Props = $props();

	let pair = $derived(
		gameState.constructWordPair(wordKey, settingsStore.value),
	);
	let isFavorite = $derived(playlistStore.isFavorite(wordKey));
	let isExtra = $derived(playlistStore.isExtra(wordKey));

	function playSound() {
		speakText(text, language);
		onclose();
	}

	function toggleFav() {
		if (pair) {
			playlistStore.toggleFavorite(pair);
		}
		onclose();
	}

	function toggleExt() {
		if (pair) {
			playlistStore.toggleExtra(pair);
		}
		onclose();
	}
</script>

<div
	class="backdrop"
	onclick={onclose}
	role="button"
	tabindex="-1"
	onkeydown={(e) => e.key === "Escape" && onclose()}
	in:fade={{ duration: 150 }}
></div>
<div
	class="menu"
	style="top: {y}px; left: {x}px"
	in:scale={{ duration: 200, start: 0.9, opacity: 0 }}
>
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
		z-index: 20001;
		background: var(--card-bg); /* Use theme card bg */
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 220px;
		backdrop-filter: blur(10px);
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

	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		transition: color 0.2s;
	}

	.icon.filled {
		color: var(--accent);
	}
</style>
