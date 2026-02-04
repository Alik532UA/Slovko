import { versionStore } from "../stores/versionStore.svelte";
import { base } from "$app/paths";

const VERSION_URL = `${base}/app-version.json`;
const CACHE_VERSION_KEY = "app_cache_version";
const AVAILABLE_VERSION_KEY = "app_available_version";

/**
 * Сервіс для перевірки оновлень
 */
export async function checkForUpdates() {
	try {
		const response = await fetch(`${VERSION_URL}?v=${Date.now()}`);
		if (!response.ok) return;

		const data = await response.json();
		const serverVersion = data.version;

		const cacheVersion = localStorage.getItem(CACHE_VERSION_KEY);
		const skippedVersion = localStorage.getItem(AVAILABLE_VERSION_KEY);

		versionStore.setVersion(serverVersion);

		if (!cacheVersion) {
			// Перший візит — фіксуємо поточну версію як кешовану
			localStorage.setItem(CACHE_VERSION_KEY, serverVersion);
		} else if (cacheVersion !== serverVersion) {
			// Є новіша версія на сервері.
			// Показуємо банер, якщо користувач ще не пропустив саме цю версію.
			if (skippedVersion !== serverVersion) {
				versionStore.setUpdate(true);
			}
		}
	} catch (error) {
		console.error("Failed to check for updates:", error);
	}
}

/**
 * Виконує оновлення (застосовує нову версію)
 */
export async function applyUpdate() {
	if (versionStore.currentVersion) {
		const nextVersion = versionStore.currentVersion;

		try {
			await clearCaches();
		} catch (e) {
			console.error("Failed to clear caches:", e);
		}

		// 3. Очищення localStorage
		localStorage.clear();
		localStorage.setItem(CACHE_VERSION_KEY, nextVersion);
		// Обов'язково видаляємо маркер доступної версії, бо ми на неї оновилися
		localStorage.removeItem(AVAILABLE_VERSION_KEY);

		window.location.reload();
	}
}

/**
 * Пропускає оновлення, запам'ятовує версію як "доступну, але пропущену"
 */
export function skipUpdate() {
	if (versionStore.currentVersion) {
		localStorage.setItem(AVAILABLE_VERSION_KEY, versionStore.currentVersion);
		versionStore.setUpdate(false);
	}
}

async function clearCaches() {
	// 1. Очищення Service Workers
	if ("serviceWorker" in navigator) {
		const registrations = await navigator.serviceWorker.getRegistrations();
		for (let registration of registrations) {
			await registration.unregister();
		}
	}

	// 2. Очищення Cache API
	if ("caches" in window) {
		const keys = await caches.keys();
		for (let key of keys) {
			await caches.delete(key);
		}
	}
}
