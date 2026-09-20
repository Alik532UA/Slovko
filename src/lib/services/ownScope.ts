import { base } from "$app/paths";

/**
 * Межа «своє / чуже» на СПІЛЬНОМУ origin (STORAGE-NAMESPACE § 1,
 * DEBUGGING § `DBG-HARD-RESET`, CRITICAL).
 *
 * ## Що саме було зламане
 *
 * Проєкт живе на `alik532ua.github.io` разом із рештою проєктів акаунта. Два
 * браузерні API не знають про підшлях нічого й віддають дані ВСЬОГО origin:
 *
 *   * `navigator.serviceWorker.getRegistrations()` — реєстрації всіх сусідів;
 *   * `caches.keys()` — імена кешів усіх сусідів.
 *
 * Прибирання тут живе в ТРЬОХ місцях, і фільтр стояв рівно в одному:
 *
 *   1. `resetService.hardReset()` — фільтрував за `scope`, правильно;
 *   2. `versionService.applyUpdate()` → `clearCaches()` — знімав УСІ
 *      реєстрації без жодного фільтра. Виконується на КОЖНОМУ застосуванні
 *      оновлення, включно з примусовим за `minVersion`;
 *   3. кнопка «Очищення» на екрані падіння в `app.html` — так само без
 *      фільтра, з коментарем «Slovko only», який не відповідав коду.
 *
 * Тобто кожне оновлення Slovko знімало service worker у `MindStep`,
 * `AudioRemote` і решти проєктів акаунта. Симптом у сусіда — сайт раптово
 * перестав працювати офлайн, а причина в чужому репозиторії.
 *
 * ## Чому модуль, а не фільтр на місці
 *
 * Бо копія вже розійшлася: правильний фільтр у `resetService` існував із
 * докблоком на пів екрана, поки два інші виклики його не мали. Копія
 * розходиться саме тоді, коли додається наступний виклик. Тримає це
 * `src/own-scope.test.ts`: він сканує ДЖЕРЕЛА й червоніє на будь-якому
 * `getRegistrations()` чи `caches.keys()` поза цим файлом.
 */

/**
 * Абсолютний префікс scope цього застосунку: `https://host/Slovko/`.
 *
 * Порівнювати доводиться АДРЕСАМИ, а не рядками: `registration.scope` завжди
 * абсолютний, а `base` — шлях (`/Slovko`), тож пряме `startsWith(base)` не
 * збіглося б ніколи й фільтр тихо відкинув би все, включно зі своїм.
 */
function ownScopePrefix(): string {
	return new URL(`${base || ""}/`, window.location.origin).href;
}

/** Реєстрації service worker, що належать саме цьому застосунку. */
function ownRegistrations<T extends { scope: string }>(
	registrations: readonly T[],
): T[] {
	const prefix = ownScopePrefix();
	return registrations.filter((registration) =>
		registration.scope.startsWith(prefix),
	);
}

/**
 * Зняти реєстрації ЦЬОГО застосунку. Повертає, скільки їх було.
 *
 * Готова дія, а не лише фільтр, — бо однаковий цикл «взяти всі, відфільтрувати,
 * зняти» стояв копіями у трьох місцях (`resetService`, `versionService`,
 * dev-гілка `+layout.svelte`), і рівно в цих копіях фільтр і розійшовся: у двох
 * із трьох його не було зовсім. Поки цикл пишеться на місці виклику, наступна
 * копія знову буде без фільтра.
 *
 * Лічильник у відповіді потрібен викликачам для журналу: «зняли N» і «знімати
 * не було чого» — різні факти, і другий не мусить писати рядок.
 */
export async function unregisterOwnServiceWorkers(): Promise<number> {
	if (!("serviceWorker" in navigator)) return 0;

	const registrations = await navigator.serviceWorker.getRegistrations();
	const own = ownRegistrations(registrations);
	await Promise.all(own.map((registration) => registration.unregister()));
	return own.length;
}

/**
 * Префікс кешів, які застосунок називає САМ (`service-worker.js`).
 *
 * Дефіс, а не підкреслення: у сховища префікс `slovko_`, і це різні простори
 * імен. Зводити їх в одну константу не можна — перейменування кеша й
 * перейменування ключів сховища це різні події з різною ціною.
 */
const OWN_CACHE_PREFIX = "slovko-";

/**
 * Імена кешів цього застосунку — за ДВОМА ознаками, і друга не зайва.
 *
 * Кеші на спільному origin бувають двох родів, і фільтр лише за власним
 * префіксом бачить рівно один із них:
 *
 *   1. ті, які застосунок називає сам — `slovko-cache-<version>`;
 *   2. ті, які називає workbox, — `workbox-precache-v2-<scope>`, де `<scope>`
 *      це `registration.scope`, тобто `https://host/Slovko/`. Власного
 *      префікса в такому імені НЕМАЄ ЖОДНОГО.
 *
 * Слово «workbox» тут не згадується навмисно: ознака — наш scope у кінці
 * імені, а не назва бібліотеки, яка його поставила. Сусідський
 * `…-https://host/MindStep/` цієї ознаки не має, і саме кінцевий слеш робить
 * перевірку точною: гіпотетичний `/Slovko2/` під `/Slovko/` не підпадає.
 *
 * Чому це тут, хоч власний воркер workbox не вживає: залишкові кеші від
 * збірок, які його вживали, на цьому origin можливі, а ціна правила — три
 * рядки. Той самий модуль стоїть у `MindStep`, де рід (2) єдиний, що існує.
 */
export function ownCacheNames(names: readonly string[]): string[] {
	const scope = ownScopePrefix();
	return names.filter((name) => isOwnCacheName(name, scope));
}

/**
 * Саме правило, зі `scope` параметром, — щоб його можна було ПЕРЕВІРИТИ.
 *
 * `ownCacheNames` бере `scope` із `window.location`, тобто поза браузером не
 * виконується взагалі. Доки правило жило всередині неї, єдиним способом
 * перевірити його лишалося читання коду — а читанням коду помилка цього роду
 * не ловиться: неправильний фільтр виглядає точно так само, як правильний.
 *
 * Це не теорія. Сусідній `MindStep` має той самий модуль, і там фільтр стояв
 * лише за власним префіксом — при тому, що всі кеші того застосунку називає
 * воркер, і власного префікса в їхніх іменах немає взагалі. Тобто фільтр
 * віддавав порожній список, а крок «очистити кеші» не робив нічого. Зелено
 * було скрізь.
 */
export function isOwnCacheName(name: string, scope: string): boolean {
	return name.startsWith(OWN_CACHE_PREFIX) || name.includes(scope);
}
