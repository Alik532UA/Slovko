/**
 * Playlist Store — Stores user collections (Favorites, Mistakes, Extra)
 * Persisted to localStorage
 */
import { browser } from "$app/environment";
import { SyncService } from "../firebase/SyncService";
import type { WordPair } from "../types";

const STORAGE_KEY = "wordApp_playlists";
const MISTAKE_REMOVAL_THRESHOLD = 3;

export interface MistakeEntry {
	pair: WordPair;
	correctStreak: number;
}

export interface PlaylistState {
	favorites: WordPair[];
	extra: WordPair[];
	mistakes: MistakeEntry[];
}

const DEFAULT_STATE: PlaylistState = {
	favorites: [],
	extra: [],
	mistakes: [],
};

function createPlaylistStore() {
	let state = $state<PlaylistState>(loadState());

	function loadState(): PlaylistState {
		if (!browser) return DEFAULT_STATE;
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				return { ...DEFAULT_STATE, ...JSON.parse(stored) };
			}
		} catch (e) {
			console.error("Failed to load playlists", e);
		}
		return DEFAULT_STATE;
	}

	function saveState() {
		if (browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			SyncService.uploadAll();
		}
	}

	return {
		get favorites() {
			return state.favorites;
		},
		get extra() {
			return state.extra;
		},
		get mistakes() {
			return state.mistakes;
		},

		/** Internal set for SyncService to avoid infinite loops */
		_internalSet(newData: PlaylistState) {
			state = newData;
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			}
		},

		// Favorites
		addToFavorites(pair: WordPair) {
			if (!state.favorites.some((p) => p.id === pair.id)) {
				state = { ...state, favorites: [...state.favorites, pair] };
				saveState();
			}
		},
		removeFromFavorites(pairId: string) {
			state = {
				...state,
				favorites: state.favorites.filter((p) => p.id !== pairId),
			};
			saveState();
		},
		toggleFavorite(pair: WordPair) {
			if (state.favorites.some((p) => p.id === pair.id)) {
				this.removeFromFavorites(pair.id);
			} else {
				this.addToFavorites(pair);
			}
		},
		isFavorite(pairId: string) {
			return state.favorites.some((p) => p.id === pairId);
		},

		// Extra
		addToExtra(pair: WordPair) {
			if (!state.extra.some((p) => p.id === pair.id)) {
				state = { ...state, extra: [...state.extra, pair] };
				saveState();
			}
		},
		removeFromExtra(pairId: string) {
			state = { ...state, extra: state.extra.filter((p) => p.id !== pairId) };
			saveState();
		},
		toggleExtra(pair: WordPair) {
			if (state.extra.some((p) => p.id === pair.id)) {
				this.removeFromExtra(pair.id);
			} else {
				this.addToExtra(pair);
			}
		},
		isExtra(pairId: string) {
			return state.extra.some((p) => p.id === pairId);
		},

		// Mistakes
		// Called when user makes a mistake
		recordMistake(pair: WordPair) {
			// Check if already in mistakes
			const existingIdx = state.mistakes.findIndex(
				(m) => m.pair.id === pair.id,
			);
			if (existingIdx >= 0) {
				// Reset streak? Or just keep it? Usually mistake resets streak.
				const newMistakes = [...state.mistakes];
				newMistakes[existingIdx].correctStreak = 0;
				state = { ...state, mistakes: newMistakes };
			} else {
				// Add new
				state = {
					...state,
					mistakes: [...state.mistakes, { pair, correctStreak: 0 }],
				};
			}
			saveState();
		},

		// Called when user answers correctly
		// Only affects if pair is in mistakes list
		recordCorrect(pairId: string) {
			const existingIdx = state.mistakes.findIndex((m) => m.pair.id === pairId);
			if (existingIdx >= 0) {
				const newMistakes = [...state.mistakes];
				newMistakes[existingIdx].correctStreak += 1;

				// Check threshold
				if (
					newMistakes[existingIdx].correctStreak >= MISTAKE_REMOVAL_THRESHOLD
				) {
					// Remove
					newMistakes.splice(existingIdx, 1);
				}

				state = { ...state, mistakes: newMistakes };
				saveState();
				return true; // Was in mistakes
			}
			return false;
		},

		/** Скинути плейлісти (тільки локально) */
		reset() {
			state = { ...DEFAULT_STATE };
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			}
		},
	};
}

export const playlistStore = createPlaylistStore();
