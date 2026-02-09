import { versionStore } from "../stores/versionStore.svelte";
import { base } from "$app/paths";
import { logService } from "./logService";

const VERSION_URL = `${base}/app-version.json`;
const CACHE_VERSION_KEY = "app_cache_version";
const REFUSED_VERSION_KEY = "app_update_refused_version";
const REFUSED_AT_KEY = "app_update_refused_at";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Порівнює дві версії (v1 < v2 ?)
 * Повертає true, якщо v1 менша за v2
 */
function isVersionOlder(v1: string, v2: string): boolean {
	const p1 = v1.split('.').map(Number);
	const p2 = v2.split('.').map(Number);
	
	for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
		const part1 = p1[i] || 0;
		const part2 = p2[i] || 0;
		if (part1 < part2) return true;
		if (part1 > part2) return false;
	}
	return false;
}

/**
 * Сервіс для перевірки оновлень
 */
export async function checkForUpdates() {
	logService.log("version", "Checking for updates...");
	try {
		// Примусово обходимо будь-яке кешування (SW, CDN, Browser)
		const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
			cache: "no-store",
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0'
			}
		});
		if (!response.ok) {
			logService.error("version", `Failed to fetch version info: ${response.status}`);
			return;
		}

		const data = await response.json();
		const serverVersion = data.version;
		const minVersion = data.minVersion || "0.0.0";

		const cacheVersion = localStorage.getItem(CACHE_VERSION_KEY) || "0.0.0";
		const refusedVersion = localStorage.getItem(REFUSED_VERSION_KEY);
		const refusedAt = parseInt(localStorage.getItem(REFUSED_AT_KEY) || "0");

		logService.log("version", "Version comparison:", {
			server: serverVersion,
			minRequired: minVersion,
			local: cacheVersion,
			refused: refusedVersion,
		});

		versionStore.setVersion(serverVersion);
		if (refusedVersion) {
			versionStore.setRefusal(refusedVersion, refusedAt);
		}

		// ПЕРЕВІРКА НА КРИТИЧНУ ВЕРСІЮ
		// Якщо поточна версія менша або рівна критичній — оновлюємо миттєво
		const isCritical = cacheVersion === minVersion || isVersionOlder(cacheVersion, minVersion);
		if (isCritical && cacheVersion !== "0.0.0" && cacheVersion !== serverVersion) {
			logService.warn("version", "CRITICAL UPDATE REQUIRED. Forcing reload...");
			await applyUpdate();
			return;
		}

		if (cacheVersion === "0.0.0") {
			logService.log("version", "First visit: setting initial cache version.");
			localStorage.setItem(CACHE_VERSION_KEY, serverVersion);
			return;
		}

		if (cacheVersion !== serverVersion) {
			const now = Date.now();
			const isNewerThanRefused = serverVersion !== refusedVersion;
			const isCooldownOver = now - refusedAt > FIVE_DAYS_MS;
			
			logService.log("version", "Conditions for showing update banner:", {
				isNewerThanRefused,
				isCooldownOver,
			});

			if (!refusedVersion || isNewerThanRefused || isCooldownOver) {
				logService.log("version", "Action: Triggering update proposal banner.");
				versionStore.setUpdate(true);
			} else {
				logService.log("version", "Action: Update proposal suppressed (cooldown/refused).");
			}
		} else {
			logService.log("version", "App is already running the latest version.");
		}
	} catch (error) {
		logService.error("version", "Error during update check:", error);
	}
}

/**
 * Виконує оновлення (застосовує нову версію)
 */
export async function applyUpdate() {
	logService.log("version", "applyUpdate called. Starting update process...");
	const nextVersion = versionStore.currentVersion || "latest";

	try {
		logService.log("version", "Clearing caches and unregistering SW...");
		await clearCaches();
		
		// Оновлюємо маркер версії
		localStorage.setItem(CACHE_VERSION_KEY, nextVersion);
		localStorage.removeItem(REFUSED_VERSION_KEY);
		localStorage.removeItem(REFUSED_AT_KEY);

		logService.log("version", "Performing HARD reload with cache buster...");
		
		// Створюємо URL з параметром для обходу HTTP-кешу браузера
		const url = new URL(window.location.origin + base);
		url.searchParams.set('upd', Date.now().toString());
		
		// Використовуємо replace, щоб не засмічувати історію переходів
		window.location.replace(url.toString());
	} catch (e) {
		logService.error("version", "Failed to perform clean update:", e);
		// Fallback до звичайного релоаду
		window.location.reload();
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
	// 1. Очищення Service Workers (важливо дочекатися завершення)
	if ("serviceWorker" in navigator) {
		try {
			const registrations = await navigator.serviceWorker.getRegistrations();
			await Promise.all(registrations.map(reg => reg.unregister()));
			logService.log("version", "Service workers unregistered.");
		} catch (e) {
			logService.error("version", "SW unregistration failed:", e);
		}
	}

	// 2. Очищення Cache API
	if ("caches" in window) {
		try {
			const keys = await caches.keys();
			await Promise.all(keys.map(key => caches.delete(key)));
			logService.log("version", "Cache Storage cleared.");
		} catch (e) {
			logService.error("version", "Cache deletion failed:", e);
		}
	}
}
