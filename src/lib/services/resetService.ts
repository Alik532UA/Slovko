import { base } from "$app/paths";
import { localStorageProvider, sessionStorageProvider } from "./storage/storageProvider";

/**
 * Reset Service — Повне очищення даних додатка.
 *
 * Текст підтвердження приходить ЗВІДКИ ВИКЛИКАЮТЬ, а не лежить тут рядком.
 *
 * Доти тут стояло українське речення, зашите в код, — і його бачив кожен, у
 * кого інтерфейс грецькою, польською чи кримськотатарською, рівно перед тим,
 * як безповоротно стерти власний прогрес. Це та сама вимога, що вже виконана
 * для решти підтверджень у проєкті (`playlists.confirmDelete`,
 * `friends.confirmUnfollow`): вони йдуть через `$_`, бо живуть у компонентах.
 *
 * Сервіс `$_` викликати не може — це чистий `.ts` без реактивності, — тому
 * рядок передається параметром. Обидва виклики живуть у `.svelte`, де словник
 * під рукою.
 *
 * @param confirmMessage Питання перед знищенням. `null`/`undefined` — не
 * питати (режим розробки, де скидання роблять навмисно й часто).
 */
export async function hardReset(confirmMessage?: string | null) {
	if (confirmMessage && !confirm(confirmMessage)) {
		return;
	}

	/*
	 * 1. Service Worker — ЛИШЕ СВІЙ, за `scope`.
	 *
	 * Доти тут стояв цикл по всіх реєстраціях без жодного фільтра, і це не
	 * недбалість в оформленні, а знищення чужих даних: `getRegistrations()` віддає
	 * реєстрації ВСЬОГО origin, тож одне натискання `r` у Slovko знімало service
	 * worker `MindStep`, `VetCrewGames` і будь-якого іншого проєкту на
	 * `alik532ua.github.io`. Кеші нижче фільтрувалися за префіксом від початку —
	 * реєстрації ні.
	 *
	 * Порівняння як АДРЕСИ, а не рядка: `scope` завжди абсолютний
	 * (`https://host/Slovko/`), а `base` — шлях (`/Slovko`), тож пряме
	 * `startsWith(base)` не збіглося б ніколи й фільтр тихо відкинув би все,
	 * включно зі своїм.
	 */
	if ("serviceWorker" in navigator) {
		const registrations = await navigator.serviceWorker.getRegistrations();
		const scopePrefix = new URL(`${base || ""}/`, window.location.origin).href;
		for (const registration of registrations) {
			if (registration.scope.startsWith(scopePrefix)) {
				await registration.unregister();
			}
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
		document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + (base || "/") + "/";
	}

	// 5. Force Reload
	window.location.reload();
}
