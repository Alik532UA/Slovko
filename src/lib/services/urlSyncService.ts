import { settingsStore } from "../stores/settingsStore.svelte";
import type { AppSettings } from "../data/schemas";
import { logService } from "./logService";

/**
 * UrlSyncService - відповідає за синхронізацію стану між URL та SettingsStore.
 * Використовується в +page.svelte для підтримки актуальності параметрів.
 */
export class UrlSyncService {
	/**
	 * Синхронізує стор із даними, що прийшли з URL (після завантаження сторінки).
	 * Не викликає Cloud Sync (використовує _internalUpdate).
	 */
	static syncStoreWithUrl(dataSettings: AppSettings) {
		const current = settingsStore.value;
		logService.log("sync", "syncStoreWithUrl check:", {
			urlSource: dataSettings.sourceLanguage,
			storeSource: current.sourceLanguage,
			urlUpdated: dataSettings.updatedAt,
			storeUpdated: current.updatedAt,
			hasCompletedOnboarding: current.hasCompletedOnboarding
		});

		// КРИТИЧНО: Якщо онбординг не завершено, ми НЕ дозволяємо URL перезаписувати вибір користувача.
		if (!current.hasCompletedOnboarding) return;

		// ЗАХИСТ ВІД СТАРИХ ДАНИХ (Race Condition):
		// Якщо дані з URL старіші за дані в сторі — ігноруємо їх.
		// Це запобігає "відкату" налаштувань під час переходу між сторінками.
		const urlTime = dataSettings.updatedAt || 0;
		const storeTime = current.updatedAt || 0;

		if (storeTime > urlTime) {
			logService.log("sync", "URL data is stale (older than store). Skipping sync.", { urlTime, storeTime });
			return;
		}

		// Перевіряємо чи є реальна різниця між даними з URL та Store
		if (
			current.mode !== dataSettings.mode ||
			current.currentLevel !== dataSettings.currentLevel ||
			current.currentTopic !== dataSettings.currentTopic ||
			current.currentPlaylist !== dataSettings.currentPlaylist ||
			current.sourceLanguage !== dataSettings.sourceLanguage ||
			current.targetLanguage !== dataSettings.targetLanguage
		) {
			logService.log("sync", "Applying URL data to Store (Mismatch found)");
			settingsStore._internalUpdate({
				mode: dataSettings.mode,
				currentLevel: dataSettings.currentLevel,
				currentTopic: dataSettings.currentTopic,
				currentPlaylist: dataSettings.currentPlaylist,
				sourceLanguage: dataSettings.sourceLanguage,
				targetLanguage: dataSettings.targetLanguage,
			});
		}
	}

	/**
	 * Створює новий об'єкт URL на основі поточних налаштувань.
	 * Повертає null, якщо URL не потребує оновлення.
	 */
	static getUpdatedUrl(currentUrl: URL, settings: AppSettings): URL | null {
		const url = new URL(currentUrl);
		const s = settings;

		// Перевіряємо чи потрібно оновлювати
		const needsUpdate =
			url.searchParams.toString() === "" ||
			url.searchParams.get("source") !== s.sourceLanguage ||
			url.searchParams.get("target") !== s.targetLanguage ||
			url.searchParams.get("mode") !== s.mode ||
			((s.mode === "levels" || s.mode === "phrases") && url.searchParams.get("level") !== s.currentLevel) ||
			(s.mode === "topics" && url.searchParams.get("topic") !== s.currentTopic) ||
			(s.mode === "playlists" && s.currentPlaylist && url.searchParams.get("playlist") !== s.currentPlaylist);

		if (!needsUpdate) return null;

		logService.log("sync", "URL needs update based on Store state");

		// Оновлюємо параметри
		url.searchParams.set("mode", s.mode);
		url.searchParams.set("source", s.sourceLanguage);
		url.searchParams.set("target", s.targetLanguage);

		if (s.mode === "levels" || s.mode === "phrases") {
			url.searchParams.set("level", s.currentLevel);
			url.searchParams.delete("topic");
			url.searchParams.delete("playlist");
		} else if (s.mode === "topics") {
			url.searchParams.set("topic", s.currentTopic);
			url.searchParams.delete("level");
			url.searchParams.delete("playlist");
		} else if (s.mode === "playlists" && s.currentPlaylist) {
			url.searchParams.set("playlist", s.currentPlaylist);
			url.searchParams.delete("level");
			url.searchParams.delete("topic");
		}

		return url.toString() !== currentUrl.toString() ? url : null;
	}
}
