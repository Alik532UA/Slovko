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
	let isCorrupted = false;
	let settings = $state<AppSettings>(loadSettings());

	function loadSettings(): AppSettings {
		if (!browser) return DEFAULT_SETTINGS;

		try {
			const stored = localStorageProvider.getItem(STORAGE_KEY);
			const hasAppVersion = !!localStorageProvider.getItem("app_cache_version");

			if (stored) {
				let parsed = JSON.parse(stored);
				logService.log("settings", "Loading settings from storage:", parsed);

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
					isCorrupted = true; // Маркуємо як пошкоджені
					return { ...DEFAULT_SETTINGS };
				}
			}
		} catch (e) {
			console.error("Failed to load settings from storage:", e);
		}
		return DEFAULT_SETTINGS;
	}

	let saveTimeout: ReturnType<typeof setTimeout>;

	function saveSettings() {
		if (browser) {
			// Якщо локальні дані були пошкоджені, ми не синхронізуємо їх у хмару автоматично,
			// щоб не затерти справні дані в Firebase. 
			// Користувач має зробити хоча б одну зміну сам.
			settings = { ...settings, updatedAt: Date.now() };
			logService.log("settings", "Saving settings to storage (immediate):", settings);
			localStorageProvider.setItem(STORAGE_KEY, JSON.stringify(settings));
			
			if (isCorrupted) {
				logService.warn("settings", "Settings are in fallback mode (corrupted local data). Skipping cloud sync to protect data integrity.");
				return;
			}

			// Дебаунс для синхронізації з хмарою
			if (saveTimeout) clearTimeout(saveTimeout);
			saveTimeout = setTimeout(() => {
				SyncService.uploadAll();
			}, 1000); 
		}
	}

	if (browser) {
		window.addEventListener("storage", (e) => {
			if (e.key === STORAGE_KEY && e.newValue) {
				const parsed = JSON.parse(e.newValue);
				const result = AppSettingsSchema.safeParse(parsed);
				if (result.success) {
					logService.log("settings", "Settings updated from another tab");
					settings = result.data;
				}
			}
		});
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
			isCorrupted = false; // Після ручного оновлення ми знову вважаємо дані валідними
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

		setLevel(level: CEFRLevel | CEFRLevel[]) {
			logService.log("settings", "setLevel:", level);
			const levels = Array.isArray(level) ? level : [level];
			settings = { ...settings, currentLevel: levels, mode: "levels" };
			saveSettings();
		},

		setPhrasesLevel(level: CEFRLevel | CEFRLevel[]) {
			logService.log("settings", "setPhrasesLevel:", level);
			const levels = Array.isArray(level) ? level : [level];
			settings = { ...settings, currentLevel: levels, mode: "phrases" };
			saveSettings();
		},

		setTopic(topicId: string | string[]) {
			logService.log("settings", "setTopic:", topicId);
			const topics = Array.isArray(topicId) ? topicId : [topicId];
			settings = { ...settings, currentTopic: topics, mode: "topics" };
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
			const current = settings.currentLevel[0] || "A1";
			const currentIndex = ALL_LEVELS.indexOf(current);
			if (currentIndex < ALL_LEVELS.length - 1) {
				this.setLevel(ALL_LEVELS[currentIndex + 1]);
			}
		},

		prevLevel() {
			const current = settings.currentLevel[0] || "A1";
			const currentIndex = ALL_LEVELS.indexOf(current);
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

		/**
		 * Скидає метадані, специфічні для конкретного користувача.
		 * Викликається при зміні акаунта.
		 */
		resetUserSpecificData() {
			logService.log("settings", "Resetting user-specific metadata");
			settings = {
				...settings,
				lastSeenFollowerAt: 0,
				// Тут можна додати інші поля, які не мають "перетікати" між акаунтами
			};
			if (browser) {
				localStorageProvider.setItem(STORAGE_KEY, JSON.stringify(settings));
			}
		},
	};
}

export const settingsStore = createSettingsStore();
