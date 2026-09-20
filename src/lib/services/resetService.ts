import { base } from "$app/paths";
import { ownCacheNames, unregisterOwnServiceWorkers } from "./ownScope";
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
	 * Фільтр живе в `ownScope.ts`, і не заради стислості: правильний він був
	 * САМЕ ТУТ, поки два інші шляхи прибирання (`versionService.applyUpdate` і
	 * кнопка на екрані падіння в `app.html`) знімали реєстрації всього origin.
	 * Копія розходиться там, де додається наступний виклик, — тому копії більше
	 * немає, а `src/own-scope.test.ts` не дає завести нову.
	 */
	await unregisterOwnServiceWorkers();

	// 2. Кеші — теж лише свої, і ознак тут ДВІ: власний префікс імені й наш
	// `scope` усередині імені. Друга ознака потрібна кешам, які називає не
	// застосунок, а бібліотека воркера, — див. `ownScope.ts`.
	if ("caches" in window) {
		const keys = await caches.keys();
		for (const key of ownCacheNames(keys)) {
			await caches.delete(key);
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
