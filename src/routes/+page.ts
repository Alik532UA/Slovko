import { gameDataService } from "$lib/services/gameDataService";
import { settingsStore } from "$lib/stores/settingsStore.svelte";
import { playlistStore } from "$lib/stores/playlistStore.svelte";
import { errorHandler } from "$lib/services/errorHandler";
import { logService } from "$lib/services/logService";
import { z } from "zod";
import type { PageLoad } from "./$types";
import type { AppSettings } from "$lib/stores/settingsStore.svelte";

// Схема для валідації URL параметрів
const UrlParamsSchema = z.object({
	mode: z.enum(["levels", "topics", "phrases", "playlists"]).optional(),
	level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
	topic: z.string().optional(),
	playlist: z.string().optional(),
	source: z.enum(["en", "uk", "nl", "de", "el", "crh"]).optional(),
	target: z.enum(["en", "uk", "nl", "de", "el", "crh"]).optional(),
});

// Вимикаємо SSR, оскільки гра залежить від localStorage та клієнтської логіки
export const ssr = false;

export const load: PageLoad = async ({ url }) => {
	// Отримуємо поточні налаштування як базу
	const settings = settingsStore.value;

	// Створюємо копію для запиту даних
	const requestSettings: AppSettings = { ...settings };

	// Отримуємо параметри з URL
	const params = {
		mode: url.searchParams.get("mode") || undefined,
		level: url.searchParams.get("level") || undefined,
		topic: url.searchParams.get("topic") || undefined,
		playlist: url.searchParams.get("playlist") || undefined,
		source: url.searchParams.get("source") || undefined,
		target: url.searchParams.get("target") || undefined,
	};

	logService.log("settings", "URL Params detected:", params);

	// Валідуємо параметри
	const result = UrlParamsSchema.safeParse(params);

	if (result.success) {
		const validated = result.data;
		let hasChanges = false;

		logService.log("settings", "URL Params validated successfully:", validated);

		if (validated.mode && validated.mode !== requestSettings.mode) {
			logService.log("settings", "Mode change detected from URL:", {
				from: requestSettings.mode,
				to: validated.mode,
			});
			requestSettings.mode = validated.mode;
			hasChanges = true;
		}
		if (validated.level && validated.level !== requestSettings.currentLevel) {
			logService.log("settings", "Level change detected from URL:", {
				from: requestSettings.currentLevel,
				to: validated.level,
			});
			requestSettings.currentLevel = validated.level;
			hasChanges = true;
		}
		if (validated.topic && validated.topic !== requestSettings.currentTopic) {
			logService.log("settings", "Topic change detected from URL:", {
				from: requestSettings.currentTopic,
				to: validated.topic,
			});
			requestSettings.currentTopic = validated.topic;
			hasChanges = true;
		}
		if (
			validated.playlist &&
			validated.playlist !== requestSettings.currentPlaylist
		) {
			logService.log("settings", "Playlist change detected from URL:", {
				from: requestSettings.currentPlaylist,
				to: validated.playlist,
			});
			requestSettings.currentPlaylist = validated.playlist;
			hasChanges = true;
		}
		if (
			validated.source &&
			validated.source !== requestSettings.sourceLanguage
		) {
			logService.log("settings", "Source lang change detected from URL:", {
				from: requestSettings.sourceLanguage,
				to: validated.source,
			});
			requestSettings.sourceLanguage = validated.source;
			hasChanges = true;
		}
		if (
			validated.target &&
			validated.target !== requestSettings.targetLanguage
		) {
			logService.log("settings", "Target lang change detected from URL:", {
				from: requestSettings.targetLanguage,
				to: validated.target,
			});
			requestSettings.targetLanguage = validated.target;
			hasChanges = true;
		}

		// Ми БІЛЬШЕ НЕ оновлюємо стор тут напряму, щоб уникнути Race Condition.
		// Стор буде оновлено в +page.svelte після успішного отримання даних.
	} else {
		console.warn("Invalid URL parameters, ignoring:", result.error.format());
	}

	// Отримуємо snapshot плейлістів з безпечними перевірками
	const systemPlaylists = playlistStore.systemPlaylists || {};
	const playlists = {
		favorites: (systemPlaylists.favorites?.words || []).map((w) => {
			const id = typeof w === "string" ? w : w.id;
			return { id, source: id, target: id };
		}),
		extra: (systemPlaylists.extra?.words || []).map((w) => {
			const id = typeof w === "string" ? w : w.id;
			return { id, source: id, target: id };
		}),
		mistakes: (systemPlaylists.mistakes?.words || []).map((w) => {
			const id = typeof w === "string" ? w : w.id;
			return {
				pair: { id, source: id, target: id },
				correctStreak: (playlistStore.mistakeMetadata || {})[id] || 0,
			};
		}),
		custom: (playlistStore.customPlaylists || []).map((p) => ({
			id: p.id,
			name: p.name,
			words: p.words || [],
		})),
	};

	try {
		const gameData = await gameDataService.loadGameData(
			requestSettings,
			playlists,
		);
		return {
			gameData,
			gameSettings: requestSettings,
			error: null,
		};
	} catch (e) {
		errorHandler.handle(e, "PageLoad", { category: "game" });
		return {
			gameData: null,
			gameSettings: requestSettings,
			error: e instanceof Error ? e.message : "Unknown error",
		};
	}
};
