import { versionStore } from "../stores/versionStore.svelte";
import { base } from "$app/paths";

const VERSION_URL = `${base}/app-version.json`;
const CACHE_VERSION_KEY = "app_cache_version";
const REFUSED_VERSION_KEY = "app_update_refused_version";
const REFUSED_AT_KEY = "app_update_refused_at";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

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
		const refusedVersion = localStorage.getItem(REFUSED_VERSION_KEY);
		const refusedAt = parseInt(localStorage.getItem(REFUSED_AT_KEY) || "0");

		versionStore.setVersion(serverVersion);
		if (refusedVersion) {
			versionStore.setRefusal(refusedVersion, refusedAt);
		}

		if (!cacheVersion) {
			// Перший візит — фіксуємо поточну версію як кешовану
			localStorage.setItem(CACHE_VERSION_KEY, serverVersion);
			return;
		}

		if (cacheVersion !== serverVersion) {
			// Є новіша версія на сервері.
			const now = Date.now();
			
			// Умови показу сповіщення:
			// 1. Користувач ще не відмовлявся від оновлення
			// 2. АБО версія на сервері НОВІША за ту, від якої він відмовився
			// 3. АБО пройшло більше 5 днів з моменту останньої відмови
			const hasNewerVersionThanRefused = serverVersion !== refusedVersion;
			const isCooldownOver = now - refusedAt > FIVE_DAYS_MS;

			if (!refusedVersion || hasNewerVersionThanRefused || isCooldownOver) {
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

		// Оновлюємо маркер версії
		localStorage.setItem(CACHE_VERSION_KEY, nextVersion);
		
		// Очищаємо дані про відмову, бо ми оновилися
		localStorage.removeItem(REFUSED_VERSION_KEY);
		localStorage.removeItem(REFUSED_AT_KEY);

		window.location.reload();
	}
}

/**
 * Пропускає оновлення, запам'ятовує версію та час відмови
 */
export function skipUpdate() {
	if (versionStore.currentVersion) {
		const now = Date.now();
		localStorage.setItem(REFUSED_VERSION_KEY, versionStore.currentVersion);
		localStorage.setItem(REFUSED_AT_KEY, now.toString());
		
		versionStore.setRefusal(versionStore.currentVersion, now);
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
