/**
 * Playlist Store — Stores user collections (Favorites, Mistakes, Extra + Custom)
 * Persisted to localStorage
 */
import { browser } from "$app/environment";
import { SyncService } from "../firebase/SyncService.svelte";
import { settingsStore } from "./settingsStore.svelte";
import type { WordPair, PlaylistId, CustomWord, WordKey } from "../types";
import {
	PlaylistStateSchema,
	type PlaylistState,
	type Playlist,
} from "../data/schemas";

const STORAGE_KEY = "wordApp_playlists_v2"; // Increment version for new structure
const LEGACY_STORAGE_KEY = "wordApp_playlists";
const MISTAKE_REMOVAL_THRESHOLD = 3;

export interface MistakeEntry {
	pair: WordPair;
	correctStreak: number;
}

// Local defaults matching schema for initialization
const DEFAULT_SYSTEM_PLAYLISTS = {
	favorites: {
		id: "favorites",
		name: "playlists.favorites",
		isSystem: true,
		words: [],
		createdAt: Date.now(),
		color: "#2ecc71",
		description: "",
		icon: "Bookmark",
	},
	mistakes: {
		id: "mistakes",
		name: "playlists.mistakes",
		isSystem: true,
		words: [],
		createdAt: Date.now(),
		color: "#e74c3c",
		description: "",
		icon: "Bookmark",
	},
	extra: {
		id: "extra",
		name: "playlists.extra",
		isSystem: true,
		words: [],
		createdAt: Date.now(),
		color: "#3a8fd6",
		description: "",
		icon: "Bookmark",
	},
};

const DEFAULT_STATE: PlaylistState = {
	customPlaylists: [],
	systemPlaylists: { ...DEFAULT_SYSTEM_PLAYLISTS },
	mistakeMetadata: {},
};

function createPlaylistStore() {
	let state = $state<PlaylistState>(loadState());

	function loadState(): PlaylistState {
		if (!browser) return DEFAULT_STATE;
		try {
			// Try new structure first
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Use Zod to validate and fill defaults/missing fields
				return PlaylistStateSchema.parse(parsed);
			}

			// Fallback to legacy and migrate
			const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
			if (legacy) {
				const oldData = JSON.parse(legacy);
				// Migrate and then validate to ensure structure
				return PlaylistStateSchema.parse(migrateFromLegacy(oldData));
			}
		} catch (e) {
			console.error("Failed to load playlists", e);
		}
		return DEFAULT_STATE;
	}

	function migrateFromLegacy(oldData: Record<string, unknown>): PlaylistState {
		const newState = { ...DEFAULT_STATE };

		if (Array.isArray(oldData.favorites)) {
			newState.systemPlaylists.favorites.words = oldData.favorites.map(
				(p: { id: string }) => p.id,
			);
		}
		if (Array.isArray(oldData.extra)) {
			newState.systemPlaylists.extra.words = oldData.extra.map(
				(p: { id: string }) => p.id,
			);
		}
		if (Array.isArray(oldData.mistakes)) {
			newState.systemPlaylists.mistakes.words = oldData.mistakes.map(
				(m: { pair: { id: string } }) => m.pair.id,
			);
			oldData.mistakes.forEach((m: { pair: { id: string }, correctStreak: number }) => {
				newState.mistakeMetadata[m.pair.id] = m.correctStreak;
			});
		}

		return newState;
	}

	function saveState() {
		if (browser) {
			state = { ...state, updatedAt: Date.now() };
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			SyncService.uploadAll();
		}
	}

	if (browser) {
		window.addEventListener("storage", (e: StorageEvent) => {
			if (e.key === STORAGE_KEY && e.newValue) {
				const parsed = JSON.parse(e.newValue);
				const result = PlaylistStateSchema.safeParse(parsed);
				if (result.success) {
					state = result.data;
				}
			}
		});
	}

	return {
		get customPlaylists() {
			return state.customPlaylists;
		},
		get systemPlaylists() {
			return state.systemPlaylists;
		},
		get mistakeMetadata() {
			return state.mistakeMetadata;
		},
		get allPlaylists() {
			return [
				state.systemPlaylists.favorites,
				state.systemPlaylists.mistakes,
				state.systemPlaylists.extra,
				...state.customPlaylists,
			];
		},

		/** Internal set for SyncService */
		_internalSet(newData: unknown) {
			if (!newData) return;

			try {
				// Validate and normalize incoming cloud data using Zod
				const validData = PlaylistStateSchema.parse(newData);
				state = validData;

				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
				}
			} catch (e: unknown) {
				console.error("Failed to sync playlists: invalid data", e);
			}
		},

		// CRUD for Custom Playlists
		createPlaylist(
			name: string,
			description: string = "",
			color: string = "#FF5733",
			icon: string = "Bookmark",
		) {
			const newPlaylist: Playlist = {
				id: crypto.randomUUID(),
				name,
				description,
				color,
				icon,
				isSystem: false,
				words: [],
				createdAt: Date.now(),
			};
			state.customPlaylists = [...state.customPlaylists, newPlaylist];
			saveState();
			return newPlaylist;
		},

		updatePlaylist(id: PlaylistId, data: Partial<Playlist>) {
			if (id === "favorites" || id === "mistakes" || id === "extra") {
				// Only allow updating words/metadata for system playlists
				const key = id as keyof typeof state.systemPlaylists;
				state = {
					...state,
					systemPlaylists: {
						...state.systemPlaylists,
						[key]: {
							...state.systemPlaylists[key],
							...data,
							isSystem: true,
							id,
						}
					}
				};
			} else {
				state = {
					...state,
					customPlaylists: state.customPlaylists.map((p: Playlist) =>
						p.id === id ? { ...p, ...data, isSystem: false, id } : p,
					)
				};
			}
			saveState();
		},

		deletePlaylist(id: PlaylistId) {
			if (id === "favorites" || id === "mistakes" || id === "extra") return;
			
			// Якщо видаляється активний плейліст - скидаємо налаштування на рівні
			if (settingsStore.value.currentPlaylist === id) {
				settingsStore.setLevel("A1");
			}

			state = {
				...state,
				customPlaylists: state.customPlaylists.filter(
					(p: Playlist) => p.id !== id,
				)
			};
			saveState();
		},

		addWordToPlaylist(playlistId: PlaylistId, word: WordKey | CustomWord) {
			const playlist = this.getPlaylist(playlistId);
			if (!playlist) return;

			const wordId = typeof word === "string" ? word : word.id;
			if (
				playlist.words.some(
					(w) => (typeof w === "string" ? w : w.id) === wordId,
				)
			)
				return;

			const updatedWords = [...playlist.words, word];
			this.updatePlaylist(playlistId, { words: updatedWords });
		},

		removeWordFromPlaylist(playlistId: PlaylistId, wordId: string) {
			const playlist = this.getPlaylist(playlistId);
			if (!playlist) return;

			const updatedWords = playlist.words.filter(
				(w) => (typeof w === "string" ? w : w.id) !== wordId,
			);
			this.updatePlaylist(playlistId, { words: updatedWords });
		},

		getPlaylist(id: PlaylistId): Playlist | undefined {
			if (id === "favorites") return state.systemPlaylists.favorites;
			if (id === "mistakes") return state.systemPlaylists.mistakes;
			if (id === "extra") return state.systemPlaylists.extra;
			return state.customPlaylists.find((p: Playlist) => p.id === id);
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
			state = {
				...state,
				mistakeMetadata: {
					...state.mistakeMetadata,
					[wordKey]: 0
				}
			};
			saveState();
		},

		recordCorrect(wordKey: WordKey) {
			if (state.systemPlaylists.mistakes.words.includes(wordKey)) {
				const currentStreak = (state.mistakeMetadata[wordKey] || 0) + 1;
				if (currentStreak >= MISTAKE_REMOVAL_THRESHOLD) {
					this.removeWordFromPlaylist("mistakes", wordKey);
					const newMetadata = { ...state.mistakeMetadata };
					delete newMetadata[wordKey];
					state = { ...state, mistakeMetadata: newMetadata };
				} else {
					state = {
						...state,
						mistakeMetadata: {
							...state.mistakeMetadata,
							[wordKey]: currentStreak
						}
					};
				}
				saveState();
				return true;
			}
			return false;
		},

		/** Скинути плейлісти (тільки локально) */
		reset() {
			state = {
				...DEFAULT_STATE,
				systemPlaylists: { ...DEFAULT_SYSTEM_PLAYLISTS },
			};
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
				localStorage.removeItem(LEGACY_STORAGE_KEY);
			}
		},

		/** Отримати snapshot для завантаження в гру */
		getSnapshot() {
			const system = state.systemPlaylists;
			return {
				favorites: system.favorites.words.map((w: string | CustomWord) => {
					const id = typeof w === "string" ? w : w.id;
					return { id, source: id, target: id };
				}),
				extra: system.extra.words.map((w: string | CustomWord) => {
					const id = typeof w === "string" ? w : w.id;
					return { id, source: id, target: id };
				}),
				mistakes: system.mistakes.words.map((w: string | CustomWord) => {
					const id = typeof w === "string" ? w : w.id;
					return {
						pair: { id, source: id, target: id },
						correctStreak: state.mistakeMetadata[id] || 0,
					};
				}),
				custom: state.customPlaylists.map((p: Playlist) => ({
					id: p.id,
					name: p.name,
					words: p.words,
				})),
			};
		},

		/** Отримати повний об'єкт стану для синхронізації */
		getSnapshotState(): PlaylistState {
			return { ...state };
		},
	};
}

export const playlistStore = createPlaylistStore();
