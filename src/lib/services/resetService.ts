import { localStorageProvider, sessionStorageProvider } from "./storage/storageProvider";

/**
 * Reset Service — Повне очищення даних додатка
 */
export async function hardReset(askConfirmation = true) {
	if (
		askConfirmation &&
		!confirm("Це видалить ВСІ локальні дані, кукі та кеш. Продовжити?")
	) {
		return;
	}

	// 1. Clear Service Worker
	if ("serviceWorker" in navigator) {
		const registrations = await navigator.serviceWorker.getRegistrations();
		for (const registration of registrations) {
			await registration.unregister();
		}
	}

	// 2. Clear Caches
	if ("caches" in window) {
		const keys = await caches.keys();
		for (const key of keys) {
			if (key.startsWith("slovko-")) {
				await caches.delete(key);
			}
		}
	}

	// 3. Clear Local Storage & Session Storage (Slovko only)
	localStorageProvider.clear();
	sessionStorageProvider.clear();

	// 4. Clear Cookies (Slovko path only)
	const cookies = document.cookie.split(";");
	for (let i = 0; i < cookies.length; i++) {
		const cookie = cookies[i];
		const eqPos = cookie.indexOf("=");
		const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
		document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/Slovko/";
	}

	// 5. Force Reload
	window.location.reload();
}
