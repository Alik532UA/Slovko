import { versionStore } from "../stores/versionStore.svelte";
import { base } from "$app/paths";
import { logService } from "./logService.svelte";
import { localStorageProvider } from "./storage/storageProvider";

const VERSION_URL = `${base}/app-version.json`;
const CACHE_VERSION_KEY = "app_cache_version";
const REFUSED_VERSION_KEY = "app_update_refused_version";
const REFUSED_AT_KEY = "app_update_refused_at";
const ATTEMPTED_VERSION_KEY = "app_update_attempted_version";

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

		// Поточна версія, яка ЗАРАЗ запущена в браузері (Build-time)
		const runningVersion = versionStore.currentVersion;
		
		const refusedVersion = localStorageProvider.getItem(REFUSED_VERSION_KEY);
		const refusedAt = parseInt(localStorageProvider.getItem(REFUSED_AT_KEY) || "0");

		logService.log("version", "Version comparison:", {
			server: serverVersion,
			minRequired: minVersion,
			running: runningVersion,
			refused: refusedVersion,
		});

		if (refusedVersion) {
			versionStore.setRefusal(refusedVersion, refusedAt);
		}

		// ПЕРЕВІРКА НА КРИТИЧНУ ВЕРСІЮ
		// Якщо поточно запущена версія менша за критичну — оновлюємо миттєво
		const isCritical = runningVersion === minVersion || isVersionOlder(runningVersion, minVersion);
		if (isCritical && runningVersion !== "0.0.0" && runningVersion !== serverVersion) {
			logService.warn("version", "CRITICAL UPDATE REQUIRED. Forcing reload...");
			await applyUpdate();
			return;
		}

		// Синхронізуємо маркер версії у storage із запущеною (build-time) версією
		const cachedVersion = localStorageProvider.getItem(CACHE_VERSION_KEY);
		if (cachedVersion !== runningVersion) {
			logService.log("version", `Version changed from ${cachedVersion} to ${runningVersion}. Updating cache marker.`);
			localStorageProvider.setItem(CACHE_VERSION_KEY, runningVersion);
			// Оновлення фактично пройшло, стираємо маркер спроби
			localStorageProvider.removeItem(ATTEMPTED_VERSION_KEY);
		}

		versionStore.setServerVersion(serverVersion); // Зберігаємо для відображення в UI

		// Якщо на сервері версія новіша за ту, що запущена
		if (runningVersion !== serverVersion && isVersionOlder(runningVersion, serverVersion)) {
			const now = Date.now();
			const isNewerThanRefused = serverVersion !== refusedVersion;
			const isCooldownOver = now - refusedAt > FIVE_DAYS_MS;
			
			// Якщо ми щойно спробували оновитися до цієї (або новішої) версії, але після релоаду все ще маємо стару
			const attemptedVersion = localStorageProvider.getItem(ATTEMPTED_VERSION_KEY);
			const isAlreadyAttempted = attemptedVersion === serverVersion || attemptedVersion === "latest";
			
			logService.log("version", "Conditions for showing update banner:", {
				isNewerThanRefused,
				isCooldownOver,
				isAlreadyAttempted
			});

			if (isAlreadyAttempted) {
				logService.warn("version", "Action: Update proposal suppressed. Already attempted but app version hasn't changed. Likely cached/dev mode issue.");
			} else if (!refusedVersion || isNewerThanRefused || isCooldownOver) {
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
export async function applyUpdate(targetVersion?: string) {
	logService.log("version", `applyUpdate called with target ${targetVersion}. Starting update process...`);

	try {
		logService.log("version", "Clearing caches and unregistering SW...");
		await clearCaches();
		
		localStorageProvider.removeItem(REFUSED_VERSION_KEY);
		localStorageProvider.removeItem(REFUSED_AT_KEY);
		
		// Записуємо версію, яку намагалися завантажити, щоб уникнути безкінечного циклу оновлень
		localStorageProvider.setItem(ATTEMPTED_VERSION_KEY, targetVersion || "latest");

		logService.log("version", "Performing HARD reload with cache buster...");
		
		// Створюємо URL з параметром для обходу HTTP-кешу браузера
		const url = new URL(window.location.href);
		url.searchParams.set('upd', Date.now().toString());
		
		// Використовуємо href для гарантованого релоаду
		window.location.href = url.toString();
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
		
		localStorageProvider.setItem(REFUSED_VERSION_KEY, versionStore.currentVersion);
		localStorageProvider.setItem(REFUSED_AT_KEY, now.toString());
		
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
			// Видаляємо лише кеші проєкту Slovko
			await Promise.all(
				keys
					.filter((key) => key.startsWith("slovko-"))
					.map((key) => caches.delete(key))
			);
			logService.log("version", "Cache Storage cleared (Slovko only).");
		} catch (e) {
			logService.error("version", "Cache deletion failed:", e);
		}
	}
}
