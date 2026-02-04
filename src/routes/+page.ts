import { gameDataService } from "$lib/services/gameDataService";
import { settingsStore } from "$lib/stores/settingsStore.svelte";
import { playlistStore } from "$lib/stores/playlistStore.svelte";
import { errorHandler } from "$lib/services/errorHandler";
import { z } from "zod";
import type { PageLoad } from "./$types";
import type { AppSettings } from "$lib/stores/settingsStore.svelte";

// Схема для валідації URL параметрів
const UrlParamsSchema = z.object({
	mode: z.enum(["levels", "topics", "phrases", "playlists"]).optional(),
	level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
	topic: z.string().optional(),
	playlist: z.enum(["favorites", "mistakes", "extra"]).optional(),
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
	};

	// Валідуємо параметри
	const result = UrlParamsSchema.safeParse(params);

	if (result.success) {
		const validated = result.data;
		if (validated.mode) requestSettings.mode = validated.mode;
		if (validated.level) requestSettings.currentLevel = validated.level;
		if (validated.topic) requestSettings.currentTopic = validated.topic;
		if (validated.playlist)
			requestSettings.currentPlaylist = validated.playlist;
	} else {
		console.warn("Invalid URL parameters, ignoring:", result.error.format());
	}

	// Отримуємо snapshot плейлістів
	const playlists = {
		favorites: playlistStore.favorites,
		extra: playlistStore.extra,
		mistakes: playlistStore.mistakes,
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
