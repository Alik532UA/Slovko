import { settingsStore } from "../stores/settingsStore.svelte";
import type { AppSettings } from "../data/schemas";
import { logService } from "./logService.svelte";

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
			urlLevels: dataSettings.currentLevel,
			storeLevels: current.currentLevel,
			urlUpdated: dataSettings.updatedAt,
			storeUpdated: current.updatedAt,
			hasCompletedOnboarding: current.hasCompletedOnboarding
		});

		// КРИТИЧНО: Якщо онбординг не завершено, ми НЕ дозволяємо URL перезаписувати вибір користувача.
		if (!current.hasCompletedOnboarding) return;

		// ЗАХИСТ ВІД СТАРИХ ДАНИХ (Race Condition)
		const urlTime = dataSettings.updatedAt || 0;
		const storeTime = current.updatedAt || 0;

		if (storeTime > urlTime) {
			logService.log("sync", "URL data is stale. Skipping sync.");
			return;
		}

		// Порівнюємо масиви через JSON.stringify
		const levelsChanged = JSON.stringify(current.currentLevel) !== JSON.stringify(dataSettings.currentLevel);
		const topicsChanged = JSON.stringify(current.currentTopic) !== JSON.stringify(dataSettings.currentTopic);
		const tensesChanged = JSON.stringify(current.currentTenses) !== JSON.stringify(dataSettings.currentTenses);
		const formsChanged = JSON.stringify(current.currentForms) !== JSON.stringify(dataSettings.currentForms);
		const playlistsChanged = JSON.stringify(current.currentPlaylists) !== JSON.stringify(dataSettings.currentPlaylists);

		if (
			current.mode !== dataSettings.mode ||
			levelsChanged ||
			topicsChanged ||
			tensesChanged ||
			formsChanged ||
			playlistsChanged ||
			current.tenseQuantity !== dataSettings.tenseQuantity ||
			current.sourceLanguage !== dataSettings.sourceLanguage ||
			current.targetLanguage !== dataSettings.targetLanguage ||
			current.interactionMode !== dataSettings.interactionMode
		) {
			logService.log("sync", "Applying URL data to Store (Mismatch found)");
			settingsStore._internalUpdate({
				mode: dataSettings.mode,
				currentLevel: dataSettings.currentLevel,
				currentTopic: dataSettings.currentTopic,
				currentTenses: dataSettings.currentTenses,
				currentForms: dataSettings.currentForms,
				tenseQuantity: dataSettings.tenseQuantity,
				currentPlaylists: dataSettings.currentPlaylists,
				sourceLanguage: dataSettings.sourceLanguage,
				targetLanguage: dataSettings.targetLanguage,
				interactionMode: dataSettings.interactionMode,
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

		const levelsStr = s.currentLevel.join(",");
		const topicsStr = s.currentTopic.join(",");
		const tensesStr = s.currentTenses.join(",");
		const formsStr = s.currentForms.join(",");
		const playlistsStr = s.currentPlaylists.join(",");

		// Перевіряємо чи потрібно оновлювати
		const currentSource = url.searchParams.get("source");
		const currentTarget = url.searchParams.get("target");
		const currentMode = url.searchParams.get("mode");
		const currentInteraction = url.searchParams.get("interaction");

		const needsUpdate =
			url.searchParams.toString() === "" ||
			currentSource !== s.sourceLanguage ||
			currentTarget !== s.targetLanguage ||
			currentMode !== s.mode ||
			currentInteraction !== s.interactionMode ||
			((s.mode === "levels" || s.mode === "phrases") && url.searchParams.get("level") !== levelsStr) ||
			(s.mode === "topics" && url.searchParams.get("topic") !== topicsStr) ||
			(s.mode === "tenses" && (
				url.searchParams.get("tense") !== tensesStr || 
				url.searchParams.get("forms") !== formsStr ||
				url.searchParams.get("qty") !== s.tenseQuantity
			)) ||
			(s.mode === "playlists" && url.searchParams.get("playlist") !== playlistsStr);

		if (!needsUpdate) return null;

		logService.log("sync", "URL needs update based on Store state");

		// Оновлюємо параметри (зберігаючи UI стан модалок)
		const currentModal = url.searchParams.get("modal");
		const currentTab = url.searchParams.get("tab");
		const currentSubTab = url.searchParams.get("subtab");

		url.searchParams.set("mode", s.mode);
		url.searchParams.set("source", s.sourceLanguage);
		url.searchParams.set("target", s.targetLanguage);
		url.searchParams.set("interaction", s.interactionMode);

		if (currentModal) url.searchParams.set("modal", currentModal);
		if (currentTab) url.searchParams.set("tab", currentTab);
		if (currentSubTab) url.searchParams.set("subtab", currentSubTab);

		if (s.mode === "levels" || s.mode === "phrases") {
			url.searchParams.set("level", levelsStr);
			url.searchParams.delete("topic");
			url.searchParams.delete("playlist");
			url.searchParams.delete("tense");
			url.searchParams.delete("forms");
			url.searchParams.delete("qty");
		} else if (s.mode === "topics") {
			url.searchParams.set("topic", topicsStr);
			url.searchParams.delete("level");
			url.searchParams.delete("playlist");
			url.searchParams.delete("tense");
			url.searchParams.delete("forms");
			url.searchParams.delete("qty");
		} else if (s.mode === "tenses") {
			url.searchParams.set("tense", tensesStr);
			url.searchParams.set("forms", formsStr);
			url.searchParams.set("qty", s.tenseQuantity);
			url.searchParams.delete("level");
			url.searchParams.delete("topic");
			url.searchParams.delete("playlist");
		} else if (s.mode === "playlists" && s.currentPlaylists.length > 0) {
			url.searchParams.set("playlist", playlistsStr);
			url.searchParams.delete("level");
			url.searchParams.delete("topic");
			url.searchParams.delete("tense");
			url.searchParams.delete("forms");
			url.searchParams.delete("qty");
		}

		return url.toString() !== currentUrl.toString() ? url : null;
	}
}
