/**
 * Settings Store — SSoT для налаштувань додатку
 * Svelte 5 Runes + localStorage persistence
 */

import { browser } from "$app/environment";
import { SyncService } from "../firebase/SyncService.svelte";
import { localStorageProvider } from "../services/storage/storageProvider";
import { logService } from "../services/logService";
import {
	ALL_LEVELS,
	type Language,
	type CEFRLevel,
	type AppTheme,
	type PlaylistId,
} from "../types";
import { AppSettingsSchema, type AppSettings } from "../data/schemas";

const STORAGE_KEY = "wordApp_settings";

const DEFAULT_SETTINGS: AppSettings = AppSettingsSchema.parse({});

function createSettingsStore() {
	let settings = $state<AppSettings>(loadSettings());

	function loadSettings(): AppSettings {
		if (!browser) return DEFAULT_SETTINGS;

		try {
			const stored = localStorageProvider.getItem(STORAGE_KEY);
			const hasAppVersion = !!localStorageProvider.getItem("app_cache_version");

			if (stored) {
				let parsed = JSON.parse(stored);
				logService.log("settings", "Loading settings from storage:", parsed);

				// ... (rest of logic)
				const result = AppSettingsSchema.safeParse(parsed);

				if (result.success) {
					let validated = result.data as AppSettings;
					if (hasAppVersion) {
						validated.hasCompletedOnboarding = true;
					}
					logService.log("settings", "Validated settings:", validated);
					return validated;
				} else {
					console.error(
						"CRITICAL: Invalid settings found in localStorage. Resetting to defaults:",
						result.error.format(),
					);
					// Return default settings if data is corrupted
					return { ...DEFAULT_SETTINGS };
				}
			}
		} catch (e) {
			console.error("Failed to load settings from storage:", e);
		}
		return DEFAULT_SETTINGS;
	}

	function saveSettings() {
		if (browser) {
			settings = { ...settings, updatedAt: Date.now() };
			logService.log("settings", "Saving settings to storage:", settings);
			localStorageProvider.setItem(STORAGE_KEY, JSON.stringify(settings));
			SyncService.uploadAll();
		}
	}

	return {
		get value() {
			return settings;
		},

		/** Internal update for SyncService to avoid infinite loops */
		_internalUpdate(newData: Partial<AppSettings>) {
			logService.log("settings", "Internal update received:", newData);
			settings = { ...settings, ...newData };
			if (browser) {
				localStorageProvider.setItem(STORAGE_KEY, JSON.stringify(settings));
			}
		},

		update(partial: Partial<AppSettings>) {
			logService.log("settings", "Public update requested:", partial);
			settings = { ...settings, ...partial };
			saveSettings();
		},

		setCardLanguages(source: Language, target: Language) {
			logService.log("settings", "Setting card languages:", { source, target });
			settings = {
				...settings,
				sourceLanguage: source,
				targetLanguage: target,
			};
			saveSettings();
		},

		setInterfaceLanguage(lang: Language) {
			logService.log("settings", "Setting interface language:", lang);
			settings = { ...settings, interfaceLanguage: lang };
			saveSettings();
		},

		setLevel(level: CEFRLevel) {
			logService.log("settings", "setLevel:", level);
			settings = { ...settings, currentLevel: level, mode: "levels" };
			saveSettings();
		},

		setPhrasesLevel(level: CEFRLevel) {
			logService.log("settings", "setPhrasesLevel:", level);
			settings = { ...settings, currentLevel: level, mode: "phrases" };
			saveSettings();
		},

		setTopic(topicId: string) {
			logService.log("settings", "setTopic:", topicId);
			settings = { ...settings, currentTopic: topicId, mode: "topics" };
			saveSettings();
		},

		setPlaylist(playlistId: PlaylistId) {
			logService.log("settings", "setPlaylist:", playlistId);
			settings = {
				...settings,
				currentPlaylist: playlistId,
				mode: "playlists",
			};
			saveSettings();
		},

		nextLevel() {
			const currentIndex = ALL_LEVELS.indexOf(
				settings.currentLevel as CEFRLevel,
			);
			if (currentIndex < ALL_LEVELS.length - 1) {
				this.setLevel(ALL_LEVELS[currentIndex + 1]);
			}
		},

		prevLevel() {
			const currentIndex = ALL_LEVELS.indexOf(
				settings.currentLevel as CEFRLevel,
			);
			if (currentIndex > 0) {
				this.setLevel(ALL_LEVELS[currentIndex - 1]);
			}
		},

		togglePronunciationSource() {
			settings = {
				...settings,
				enablePronunciationSource: !settings.enablePronunciationSource,
			};
			saveSettings();
		},

		togglePronunciationTarget() {
			settings = {
				...settings,
				enablePronunciationTarget: !settings.enablePronunciationTarget,
			};
			saveSettings();
		},

		toggleTranscriptionSource() {
			settings = {
				...settings,
				showTranscriptionSource: !settings.showTranscriptionSource,
			};
			saveSettings();
		},

		toggleTranscriptionTarget() {
			settings = {
				...settings,
				showTranscriptionTarget: !settings.showTranscriptionTarget,
			};
			saveSettings();
		},

		setVoicePreference(lang: string, voiceURI: string) {
			settings = {
				...settings,
				voicePreferences: { ...settings.voicePreferences, [lang]: voiceURI },
			};
			saveSettings();
		},

		setTheme(theme: AppTheme) {
			settings = { ...settings, theme };
			saveSettings();
		},

		completeOnboarding() {
			settings = { ...settings, hasCompletedOnboarding: true };
			saveSettings();
		},
	};
}

export const settingsStore = createSettingsStore();
