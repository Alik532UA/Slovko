/**
 * Playlist Store — Stores user collections (Favorites, Mistakes, Extra + Custom)
 * Persisted to localStorage
 */
import { browser } from "$app/environment";
import { SyncService } from "../firebase/SyncService";
import type { WordPair, Playlist, PlaylistId, CustomWord, WordKey } from "../types";

const STORAGE_KEY = "wordApp_playlists_v2"; // Increment version for new structure
const LEGACY_STORAGE_KEY = "wordApp_playlists";
const MISTAKE_REMOVAL_THRESHOLD = 3;

export interface MistakeEntry {
	pair: WordPair;
	correctStreak: number;
}

export interface PlaylistState {
	customPlaylists: Playlist[];
	systemPlaylists: {
		favorites: Playlist;
		mistakes: Playlist;
		extra: Playlist;
	};
	/** Metadata for mistakes like streaks */
	mistakeMetadata: Record<string, number>; 
}

const DEFAULT_SYSTEM_PLAYLISTS = {
	favorites: {
		id: "favorites",
		name: "playlists.favorites",
		isSystem: true,
		words: [],
		createdAt: Date.now(),
		color: "#2ecc71"
	},
	mistakes: {
		id: "mistakes",
		name: "playlists.mistakes",
		isSystem: true,
		words: [],
		createdAt: Date.now(),
		color: "#e74c3c"
	},
	extra: {
		id: "extra",
		name: "playlists.extra",
		isSystem: true,
		words: [],
		createdAt: Date.now(),
		color: "#3a8fd6"
	}
};

const DEFAULT_STATE: PlaylistState = {
	customPlaylists: [],
	systemPlaylists: { ...DEFAULT_SYSTEM_PLAYLISTS },
	mistakeMetadata: {}
};

function createPlaylistStore() {
	let state = $state<PlaylistState>(loadState());

	function loadState(): PlaylistState {
		if (!browser) return DEFAULT_STATE;
		try {
			// Try new structure first
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				return { ...DEFAULT_STATE, ...JSON.parse(stored) };
			}

			// Fallback to legacy and migrate
			const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
			if (legacy) {
				const oldData = JSON.parse(legacy);
				return migrateFromLegacy(oldData);
			}
		} catch (e) {
			console.error("Failed to load playlists", e);
		}
		return DEFAULT_STATE;
	}

	function migrateFromLegacy(oldData: any): PlaylistState {
		const newState = { ...DEFAULT_STATE };
		
		if (Array.isArray(oldData.favorites)) {
			newState.systemPlaylists.favorites.words = oldData.favorites.map((p: any) => p.id);
		}
		if (Array.isArray(oldData.extra)) {
			newState.systemPlaylists.extra.words = oldData.extra.map((p: any) => p.id);
		}
		if (Array.isArray(oldData.mistakes)) {
			newState.systemPlaylists.mistakes.words = oldData.mistakes.map((m: any) => m.pair.id);
			oldData.mistakes.forEach((m: any) => {
				newState.mistakeMetadata[m.pair.id] = m.correctStreak;
			});
		}
		
		return newState;
	}

	function saveState() {
		if (browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			SyncService.uploadAll();
		}
	}

	return {
		get customPlaylists() { return state.customPlaylists; },
		get systemPlaylists() { return state.systemPlaylists; },
		get allPlaylists() { 
			return [
				state.systemPlaylists.favorites,
				state.systemPlaylists.mistakes,
				state.systemPlaylists.extra,
				...state.customPlaylists
			];
		},

		/** Internal set for SyncService */
		_internalSet(newData: PlaylistState) {
			state = newData;
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			}
		},

		// CRUD for Custom Playlists
		createPlaylist(name: string, description: string = "", color: string = "#FF5733", icon: string = "Bookmark") {
			const newPlaylist: Playlist = {
				id: crypto.randomUUID(),
				name,
				description,
				color,
				icon,
				isSystem: false,
				words: [],
				createdAt: Date.now()
			};
			state.customPlaylists = [...state.customPlaylists, newPlaylist];
			saveState();
			return newPlaylist;
		},

		updatePlaylist(id: PlaylistId, data: Partial<Playlist>) {
			if (id === "favorites" || id === "mistakes" || id === "extra") {
				// Only allow updating words/metadata for system playlists
				const key = id as keyof typeof state.systemPlaylists;
				state.systemPlaylists[key] = { ...state.systemPlaylists[key], ...data, isSystem: true, id };
			} else {
				state.customPlaylists = state.customPlaylists.map(p => 
					p.id === id ? { ...p, ...data, isSystem: false, id } : p
				);
			}
			saveState();
		},

		deletePlaylist(id: PlaylistId) {
			if (id === "favorites" || id === "mistakes" || id === "extra") return;
			state.customPlaylists = state.customPlaylists.filter(p => p.id !== id);
			saveState();
		},

		addWordToPlaylist(playlistId: PlaylistId, word: WordKey | CustomWord) {
			const playlist = this.getPlaylist(playlistId);
			if (!playlist) return;

			const wordId = typeof word === "string" ? word : word.id;
			if (playlist.words.some(w => (typeof w === "string" ? w : w.id) === wordId)) return;

			const updatedWords = [...playlist.words, word];
			this.updatePlaylist(playlistId, { words: updatedWords });
		},

		removeWordFromPlaylist(playlistId: PlaylistId, wordId: string) {
			const playlist = this.getPlaylist(playlistId);
			if (!playlist) return;

			const updatedWords = playlist.words.filter(w => (typeof w === "string" ? w : w.id) !== wordId);
			this.updatePlaylist(playlistId, { words: updatedWords });
		},

		getPlaylist(id: PlaylistId): Playlist | undefined {
			if (id === "favorites") return state.systemPlaylists.favorites;
			if (id === "mistakes") return state.systemPlaylists.mistakes;
			if (id === "extra") return state.systemPlaylists.extra;
			return state.customPlaylists.find(p => p.id === id);
		},

		// System specific helpers (Legacy compatibility)
		toggleFavorite(wordKey: WordKey) {
			const isFav = state.systemPlaylists.favorites.words.includes(wordKey);
			if (isFav) {
				this.removeWordFromPlaylist("favorites", wordKey);
			} else {
				this.addWordToPlaylist("favorites", wordKey);
			}
		},

		isFavorite(wordKey: WordKey) {
			return state.systemPlaylists.favorites.words.includes(wordKey);
		},

		toggleExtra(wordKey: WordKey) {
			const isExtra = state.systemPlaylists.extra.words.includes(wordKey);
			if (isExtra) {
				this.removeWordFromPlaylist("extra", wordKey);
			} else {
				this.addWordToPlaylist("extra", wordKey);
			}
		},

		isExtra(wordKey: WordKey) {
			return state.systemPlaylists.extra.words.includes(wordKey);
		},

		// Mistakes logic
		recordMistake(wordKey: WordKey) {
			if (!state.systemPlaylists.mistakes.words.includes(wordKey)) {
				this.addWordToPlaylist("mistakes", wordKey);
			}
			state.mistakeMetadata[wordKey] = 0;
			saveState();
		},

		recordCorrect(wordKey: WordKey) {
			if (state.systemPlaylists.mistakes.words.includes(wordKey)) {
				const currentStreak = (state.mistakeMetadata[wordKey] || 0) + 1;
				if (currentStreak >= MISTAKE_REMOVAL_THRESHOLD) {
					this.removeWordFromPlaylist("mistakes", wordKey);
					delete state.mistakeMetadata[wordKey];
				} else {
					state.mistakeMetadata[wordKey] = currentStreak;
				}
				saveState();
				return true;
			}
			return false;
		},

		/** Скинути плейлісти (тільки локально) */
		reset() {
			state = { ...DEFAULT_STATE, systemPlaylists: { ...DEFAULT_SYSTEM_PLAYLISTS } };
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
				localStorage.removeItem(LEGACY_STORAGE_KEY);
			}
		},
	};
}

export const playlistStore = createPlaylistStore();