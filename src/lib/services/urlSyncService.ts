import { settingsStore } from "../stores/settingsStore.svelte";
import type { AppSettings } from "../data/schemas";

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

		// КРИТИЧНО: Якщо онбординг не завершено, ми НЕ дозволяємо URL перезаписувати вибір користувача.
		// Це запобігає ситуації, коли параметри за замовчуванням (?source=en&target=uk)
		// перебивають те, що користувач щойно вибрав у модальному вікні.
		if (!current.hasCompletedOnboarding) return;

		// Перевіряємо чи є реальна різниця між даними з URL та Store
		if (
			current.mode !== dataSettings.mode ||
			current.currentLevel !== dataSettings.currentLevel ||
			current.currentTopic !== dataSettings.currentTopic ||
			current.currentPlaylist !== dataSettings.currentPlaylist ||
			current.sourceLanguage !== dataSettings.sourceLanguage ||
			current.targetLanguage !== dataSettings.targetLanguage
		) {
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
