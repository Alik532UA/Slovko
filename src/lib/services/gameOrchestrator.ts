import { z } from "zod";
import { settingsStore } from "../stores/settingsStore.svelte";
import { playlistStore } from "../stores/playlistStore.svelte";
import { gameDataService, type GameData, type PlaylistData } from "./gameDataService";
import { logService } from "./logService";
import { UrlParamsSchema, type AppSettings, type CustomWord, type Playlist } from "../data/schemas";

export interface GameSessionResult {
	gameData: GameData | null;
	gameSettings: AppSettings;
	error: string | null;
}

/**
 * GameOrchestrator - Domain Service для підготовки ігрової сесії.
 * Відповідає за валідацію вхідних параметрів та збір необхідних даних.
 */
class GameOrchestratorClass {
	/**
	 * Готує всі дані для ігрової сесії на основі URL та поточного стану сторів.
	 */
	async prepareGameSession(url: URL): Promise<GameSessionResult> {
		const currentSettings = settingsStore.value;
		const requestSettings: AppSettings = { ...currentSettings };

		// 1. Отримуємо та валідуємо параметри з URL
		const params = {
			mode: url.searchParams.get("mode") || undefined,
			level: url.searchParams.get("level") || undefined,
			topic: url.searchParams.get("topic") || undefined,
			playlist: url.searchParams.get("playlist") || undefined,
			source: url.searchParams.get("source") || undefined,
			target: url.searchParams.get("target") || undefined,
		};

		const result = UrlParamsSchema.safeParse(params);

		if (result.success) {
			const validated = result.data;
			this.applyUrlParamsToSettings(validated, requestSettings);
		} else {
			logService.warn("settings", "Invalid URL parameters, ignoring:", result.error.format());
		}

		// 2. Збираємо snapshot плейлістів зі стору
		const playlistData = playlistStore.getSnapshot();

		// 3. Завантажуємо дані гри
		try {
			const gameData = await gameDataService.loadGameData(
				requestSettings,
				playlistData,
			);
			return {
				gameData,
				gameSettings: requestSettings,
				error: null,
			};
		} catch (e) {
			return {
				gameData: null,
				gameSettings: requestSettings,
				error: e instanceof Error ? e.message : "Unknown error",
			};
		}
	}

	/**
	 * Прикладає параметри URL до об'єкта налаштувань.
	 */
	private applyUrlParamsToSettings(validated: z.infer<typeof UrlParamsSchema>, settings: AppSettings) {
		if (validated.mode && validated.mode !== settings.mode) {
			settings.mode = validated.mode;
		}
		if (validated.level && validated.level !== settings.currentLevel) {
			settings.currentLevel = validated.level;
		}
		if (validated.topic && validated.topic !== settings.currentTopic) {
			settings.currentTopic = validated.topic;
		}
		if (validated.playlist && validated.playlist !== settings.currentPlaylist) {
			settings.currentPlaylist = validated.playlist;
		}
		if (validated.source && validated.source !== settings.sourceLanguage) {
			settings.sourceLanguage = validated.source;
		}
		if (validated.target && validated.target !== settings.targetLanguage) {
			settings.targetLanguage = validated.target;
		}
	}
}

export const gameOrchestrator = new GameOrchestratorClass();
