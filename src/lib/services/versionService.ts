import { versionStore } from "../stores/versionStore.svelte";
import { base } from "$app/paths";
import { logService } from "./logService";

const VERSION_URL = `${base}/app-version.json`;
const CACHE_VERSION_KEY = "app_cache_version";
const REFUSED_VERSION_KEY = "app_update_refused_version";
const REFUSED_AT_KEY = "app_update_refused_at";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Сервіс для перевірки оновлень
 */
export async function checkForUpdates() {
	logService.log("version", "Checking for updates...");
	try {
		const response = await fetch(`${VERSION_URL}?v=${Date.now()}`);
		if (!response.ok) {
			logService.error("version", `Failed to fetch version info: ${response.status}`);
			return;
		}

		const data = await response.json();
		logService.log("version", "Raw server response data:", data);
		const serverVersion = data.version;

		const cacheVersion = localStorage.getItem(CACHE_VERSION_KEY);
		const refusedVersion = localStorage.getItem(REFUSED_VERSION_KEY);
		const refusedAt = parseInt(localStorage.getItem(REFUSED_AT_KEY) || "0");

		logService.log("version", "Version data comparison:", {
			server: serverVersion,
			localCache: cacheVersion,
			lastRefused: refusedVersion,
			refusedAt: refusedAt > 0 ? new Date(refusedAt).toISOString() : "never"
		});

		versionStore.setVersion(serverVersion);
		if (refusedVersion) {
			versionStore.setRefusal(refusedVersion, refusedAt);
		}

		if (!cacheVersion) {
			logService.log("version", "First visit: setting initial cache version.");
			localStorage.setItem(CACHE_VERSION_KEY, serverVersion);
			return;
		}

		if (cacheVersion !== serverVersion) {
			const now = Date.now();
			const hasNewerVersionThanRefused = serverVersion !== refusedVersion;
			const isCooldownOver = now - refusedAt > FIVE_DAYS_MS;

			logService.log("version", "Update check conditions:", {
				versionMismatch: true,
				hasNewerThanRefused: hasNewerVersionThanRefused,
				isCooldownOver: isCooldownOver,
				cooldownRemaining: refusedAt > 0 ? Math.max(0, FIVE_DAYS_MS - (now - refusedAt)) : 0
			});

			if (!refusedVersion || hasNewerVersionThanRefused || isCooldownOver) {
				logService.log("version", "Triggering update proposal banner.");
				versionStore.setUpdate(true);
			} else {
				logService.log("version", "Update proposal suppressed by active cooldown/postponement.");
			}
		} else {
			logService.log("version", "App is up to date.");
		}
	} catch (error) {
		logService.error("version", "Failed to check for updates:", error);
	}
}

/**
 * Виконує оновлення (застосовує нову версію)
 */
export async function applyUpdate() {
	logService.log("version", "applyUpdate called. Starting update process...");
	if (versionStore.currentVersion) {
		const nextVersion = versionStore.currentVersion;

		try {
			logService.log("version", "Clearing caches...");
			await clearCaches();
		} catch (e) {
			logService.error("version", "Failed to clear caches:", e);
		}

		// Оновлюємо маркер версії
		logService.log("version", `Setting new cache version in localStorage: ${nextVersion}`);
		localStorage.setItem(CACHE_VERSION_KEY, nextVersion);
		
		// Очищаємо дані про відмову, бо ми оновилися
		localStorage.removeItem(REFUSED_VERSION_KEY);
		localStorage.removeItem(REFUSED_AT_KEY);

		logService.log("version", "Reloading page...");
		window.location.reload();
	} else {
		logService.warn("version", "applyUpdate called but currentVersion is missing in store.");
	}
}

/**
 * Пропускає оновлення, запам'ятовує версію та час відмови
 */
export function skipUpdate() {
	logService.log("version", "skipUpdate called. Postponing update...");
	if (versionStore.currentVersion) {
		const now = Date.now();
		logService.log("version", `Postponing version ${versionStore.currentVersion} until ${new Date(now + FIVE_DAYS_MS).toISOString()}`);
		
		localStorage.setItem(REFUSED_VERSION_KEY, versionStore.currentVersion);
		localStorage.setItem(REFUSED_AT_KEY, now.toString());
		
		versionStore.setRefusal(versionStore.currentVersion, now);
		versionStore.setUpdate(false);
	} else {
		logService.warn("version", "skipUpdate called but currentVersion is missing in store.");
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
