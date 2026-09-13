/**
 * Settings Store — SSoT для налаштувань додатку
 * Svelte 5 Runes + localStorage persistence
 */

import { browser } from "$app/environment";
import { SyncService } from "../services/firebase/SyncService.svelte";
import { localStorageProvider } from "../services/storage/storageProvider";
import { logService } from "../services/logService.svelte";
import {
	ALL_LEVELS,
	type Language,
	type CEFRLevel,
	type AppTheme,
	type PlaylistId,
	type TenseForm,
	type InteractionMode,
} from "../types";
import { AppSettingsSchema, type AppSettings } from "../data/schemas";

const STORAGE_KEY = "settings";

const DEFAULT_SETTINGS: AppSettings = AppSettingsSchema.parse({});

function createSettingsStore() {
	let isCorrupted = false;
	let settings = $state<AppSettings>(loadSettings());

	function loadSettings(): AppSettings {
		if (!browser) return DEFAULT_SETTINGS;

		try {
			const validated = localStorageProvider.getJson<AppSettings>(STORAGE_KEY);
			const hasAppVersion = !!localStorageProvider.getItem("app_cache_version");

			if (validated) {
				logService.log("settings", "Loading settings from storage:", validated);

				const result = AppSettingsSchema.safeParse(validated);

				if (result.success) {
					const validatedData = result.data;

					// Якщо в браузері є версія додатку, вважаємо що онбординг вже було пройдено раніше
					if (hasAppVersion) {
						validatedData.hasCompletedOnboarding = true;
					}

					// КРИТИЧНО: Якщо онбординг не завершено, ми ГАРАНТУЄМО, що користувач 
					// почне з дефолтного рівня A1, а не з порожніх плейлістів.
					if (!validatedData.hasCompletedOnboarding) {
						validatedData.mode = "levels";
						validatedData.currentLevel = ["A1"];
						validatedData.currentPlaylists = [];
					}

					logService.log("settings", "Validated settings:", validatedData);
					return validatedData;
				} else {
					logService.error("debug", 
						"CRITICAL: Invalid settings found in localStorage. Resetting to defaults:",
						result.error.format(),
					);
					isCorrupted = true; // Маркуємо як пошкоджені
					return { ...DEFAULT_SETTINGS };
				}
			}
		} catch (e) {
			logService.error("debug", "Failed to load settings from storage:", e);
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
			localStorageProvider.setJson(STORAGE_KEY, settings);

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
			if (e.key === "slovko_" + STORAGE_KEY && e.newValue) {
				const parsed = JSON.parse(e.newValue);
				const result = AppSettingsSchema.safeParse(parsed);
				if (result.success) {
					logService.log("settings", "Settings updated from another tab");
					settings = result.data;
				}
			}
		});
	}

	/**
	 * Тема, яку показуємо «на пробу» під курсором, або `null`
	 * (THEME-SWITCHER § 2.1).
	 *
	 * ОКРЕМО від `settings.theme`, і тут це критичніше, ніж деінде: `setTheme`
	 * кличе `saveSettings()`, тобто пише в сховище й синхронізує з хмарою.
	 * Прев'ю через нього означало б, що курсор, який просто перетнув сітку тем,
	 * зберігає чужу тему назавжди — і на всіх пристроях.
	 */
	let previewedTheme = $state<AppTheme | null>(null);

	/** Знімає клас плавного переходу, коли той доїхав (§ 5). */
	let shiftTimer: ReturnType<typeof setTimeout> | null = null;

	function startThemeShift() {
		if (!browser) return;
		document.documentElement.classList.add("theme-shifting");
		if (shiftTimer) clearTimeout(shiftTimer);
		shiftTimer = setTimeout(() => {
			document.documentElement.classList.remove("theme-shifting");
			shiftTimer = null;
		}, 900);
	}

	return {
		get value() {
			return settings;
		},

		get previewedTheme() {
			return previewedTheme;
		},

		/**
		 * Показує тему «на пробу», поки курсор на її картці; `null` — вертає обрану.
		 *
		 * Малює документ НАПРЯМУ, повз `$effect` у кореневому layout: той
		 * прив'язаний до `settings`, і єдиний спосіб його зачепити — записати
		 * вибір, чого прев'ю робити не має. Мета-тег іде разом з атрибутом,
		 * інакше показана темна тема лишалася б оголошеною як світла.
		 */
		previewTheme(theme: AppTheme | null) {
			if (!browser) return;
			previewedTheme = theme;
			startThemeShift();
			const shown = theme ?? settings.theme;
			document.documentElement.setAttribute("data-theme", shown);
			const meta = document.querySelector('meta[name="color-scheme"]');
			const темна = shown === "dark-gray" || shown === "orange";
			if (meta) meta.setAttribute("content", темна ? "dark" : "only light");
		},

		/** Internal update for SyncService to avoid infinite loops */
		_internalUpdate(newData: Partial<AppSettings>) {
			logService.log("settings", "Internal update received:", newData);
			settings = { ...settings, ...newData };
			if (browser) {
				localStorageProvider.setJson(STORAGE_KEY, settings);
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

		setInteractionMode(mode: InteractionMode) {
			logService.log("settings", "Setting interaction mode:", mode);
			settings = { ...settings, interactionMode: mode };
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

		setTenses(tenseIds: string | string[]) {
			logService.log("settings", "setTenses:", tenseIds);
			const tenses = Array.isArray(tenseIds) ? tenseIds : [tenseIds];
			settings = { ...settings, currentTenses: tenses, mode: "tenses" };
			saveSettings();
		},

		setTenseForms(forms: TenseForm[]) {
			logService.log("settings", "setTenseForms:", forms);
			settings = { ...settings, currentForms: forms };
			saveSettings();
		},

		setTenseQuantity(qty: "1" | "3" | "many") {
			logService.log("settings", "setTenseQuantity:", qty);
			settings = { ...settings, tenseQuantity: qty };
			saveSettings();
		},

		setPlaylist(playlistId: PlaylistId | PlaylistId[]) {
			logService.log("settings", "setPlaylist:", playlistId);
			const playlists = Array.isArray(playlistId) ? playlistId : [playlistId];
			settings = {
				...settings,
				currentPlaylists: playlists,
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
			previewedTheme = null;
			startThemeShift();
			settings = { ...settings, theme };
			saveSettings();
		},

		setBgType(type: "solid" | "image") {
			settings = { ...settings, bgType: type };
			saveSettings();
		},

		setBgBlur(blur: "blurred" | "sharp") {
			settings = { ...settings, bgBlur: blur };
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
				localStorageProvider.setJson(STORAGE_KEY, settings);
			}
		},
	};
}

export const settingsStore = createSettingsStore();
