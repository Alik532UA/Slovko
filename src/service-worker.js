/// <reference types="@sveltejs/kit" />
import { base, build, files, prerendered, version } from "$service-worker";

// Назва кешу з версією для автоматичного оновлення
const CACHE = `slovko-cache-${version}`;

// Список всіх файлів для попереднього кешування
const ASSETS = [
	...build, // файли, згенеровані Vite (js, css)
	...files, // статичні файли з папки static
	...prerendered, // пререндерені сторінки
];

/**
 * Межа «наше / чуже» для запитів, що проходять через воркер.
 *
 * Два різні рівні, і другий не зайвий. `origin` відсікає сторонні сайти;
 * `scope` відсікає СУСІДІВ — на `alik532ua.github.io` поруч живуть інші
 * проєкти акаунта, і їхні файли нам так само чужі, як і будь-чиї.
 *
 * `base` тут — це не літерал зі збірки: SvelteKit обчислює його в рантаймі з
 * адреси самого воркера (`location.pathname` без останнього сегмента), тож
 * для `/Slovko/service-worker.js` виходить `/Slovko`. Саме тому порівняння й
 * можливе: у `ASSETS` лежать уже повні шляхи з цим префіксом.
 *
 * Сам scope без кінцевого слеша теж наш — це адреса кореня застосунку
 * (`/Slovko`), за якою приходить навігація без слеша.
 */
function isOwnUrl(url) {
	if (url.origin !== self.location.origin) return false;
	const scope = `${base}/`;
	return url.pathname === base || url.pathname.startsWith(scope);
}

/*
 * НОВИЙ SW ЧЕКАЄ, А НЕ ЗАХОПЛЮЄ ВІДКРИТУ СТОРІНКУ.
 *
 * Тут стояли `self.skipWaiting()` і `self.clients.claim()`, і разом із
 * видаленням старого кешу нижче вони давали ось що. Виходить деплой; людина
 * тримає відкриту сторінку зі збірки N-1; новий SW ставиться, НЕГАЙНО
 * активується, перебирає керування тією сторінкою й видаляє кеш N-1. Сторінка
 * при цьому далі жива й далі просить свої чанки — з хешами N-1, яких у новому
 * кеші немає (у них інші імена), а на GitHub Pages деплой замінює дерево
 * цілком. Наслідок: `Failed to fetch dynamically imported module`, і в консолі
 * 503 — Chrome віддає саме його, коли обробник `fetch` у SW відхиляється.
 *
 * Тобто ламалося не оновлення, а СТОРІНКА, яка ще працювала.
 *
 * `skipWaiting()` тут і не був потрібен: застосунок має власний шлях
 * оновлення. `+layout.svelte` слухає `updatefound` і на стані `installed`
 * показує банер, а `applyUpdate()` у `versionService` знімає реєстрацію SW,
 * чистить усі кеші й переходить із `?upd=`. Стан `installed` настає й без
 * `skipWaiting()` — банер лишається на місці. Різниця лише в тому, що тепер
 * нову версію застосовує ЛЮДИНА, а не SW за її спиною.
 *
 * Старі кеші видаляє `activate`, і він тепер настає після того, як сторінок зі
 * старої збірки не лишилося. Тому видалення стало безпечним саме собою, а не
 * тому, що його обставили перевірками.
 */
self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);

			/*
			 * ПО ОДНОМУ ФАЙЛУ, а не `cache.addAll(ASSETS)`.
			 *
			 * `addAll` атомарний: один недоступний файл зі ста відкидає весь
			 * виклик, `install` падає, і новий SW не доходить навіть до стану
			 * `installed`. А значить не спрацьовує `updatefound` → не з'являється
			 * банер → людина лишається на старій збірці, і жодного слова про це
			 * ніде немає. Це рівно той клас, коли «коміт не дійшов у прод», хоча
			 * деплой зелений.
			 *
			 * Тут один файл забирає з собою лише себе. Скільки саме не доїхало —
			 * видно в консолі, бо мовчазне часткове кешування було б гіршим за
			 * обидва варіанти.
			 */
			const results = await Promise.allSettled(
				ASSETS.map((asset) => cache.add(asset)),
			);
			const failed = results.filter((r) => r.status === "rejected").length;
			if (failed > 0) {
				console.warn(
					`[SW] ${failed} із ${ASSETS.length} активів не закешовано — вони підуть із мережі`,
				);
			}
		})(),
	);
});

self.addEventListener("activate", (event) => {
	// Видаляємо старі кеші (тільки Slovko). Сюди ми доходимо вже після того, як
	// сторінок зі старої збірки не лишилося, — тобто відбирати в них нічого.
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key.startsWith("slovko-") && key !== CACHE) {
					await caches.delete(key);
				}
			}
		}),
	);
});

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET" || event.request.headers.has("range"))
		return;

	const url = new URL(event.request.url);

	// Ігноруємо запити не по http (наприклад, розширення браузера)
	if (!url.protocol.startsWith("http")) return;

	/*
	 * ТУТ БУЛИ ГІЛКИ ДЛЯ РОЗРОБКИ, І ВОНИ БУЛИ НЕДОСЯЖНІ.
	 *
	 * Стояло `const isDev = url.hostname === 'localhost'`, а далі — пропуск
	 * усього, крім активів, обхід шляхів Vite і окреме тихе `408` у гілці
	 * помилки. Виконатися це не могло НІКОЛИ: воркер реєструється рівно в
	 * одному місці (`+layout.svelte`) і рівно під умовою `!dev`, тобто в
	 * розробці його немає взагалі.
	 *
	 * Ціна була не в зайвих рядках, а в тому, що вони описували поведінку,
	 * якої не існує: наступний читач шукав би пояснення поломки в HMR саме
	 * тут. Плюс сама ознака хибна — розробку ведуть і за `127.0.0.1`, і за
	 * адресою в локальній мережі з телефона.
	 */

	/*
	 * ЧУЖЕ ПОХОДЖЕННЯ — ПОВЗ ВОРКЕР, і це не обережність, а виправлення.
	 *
	 * Нижче в гілці успіху стояло `response.type === 'basic' || 'cors'`, тобто
	 * у наш кеш клалася БУДЬ-ЯКА успішна крос-origin відповідь на GET без
	 * параметрів — картинка з чужого сайту, шрифт, відповідь стороннього
	 * API. Наслідків два, і обидва тихі:
	 *
	 *   1. кеш `slovko-cache-<version>` росте без жодної межі й без переліку
	 *      того, що в ньому лежить. Квоту витрачає застосунок, а причина
	 *      лежить у чужих відповідях;
	 *   2. чужий ресурс після цього віддається З КЕША доти, доки не вийде
	 *      наступна версія (саме тоді `activate` зносить попередній кеш).
	 *      Тобто оновлення на чужому боці до людини не доїжджає, а виглядає
	 *      це як «у них там щось не оновилося».
	 *
	 * Застосунку це не було потрібне НІ ДЛЯ ЧОГО: увесь власний вміст уже
	 * лежить у передкеші (`ASSETS`), а єдиний рантаймний `fetch()` у коді —
	 * це `app-version.json`, який кешувати заборонено окремо. Тобто гілка
	 * обслуговувала виключно чуже.
	 *
	 * Межа — саме наш `scope`, а не лише origin: на `alik532ua.github.io`
	 * поруч живуть сусідні проєкти, і їхні файли нам так само чужі.
	 */
	if (!isOwnUrl(url)) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const isAsset = ASSETS.includes(url.pathname);
			const isVersionFile = url.pathname.endsWith('app-version.json');
			const isForceUpdate = url.searchParams.has('upd');

			// Для файлів збірки використовуємо Cache First (але НЕ для файлу версії та НЕ при форсованому оновленні)
			if (isAsset && !isVersionFile && !isForceUpdate) {
				const cachedResponse = await cache.match(url.pathname);
				if (cachedResponse) return cachedResponse;
			}

			// Для всього іншого намагаємось отримати з мережі
			try {
				const response = await fetch(event.request);

				if (response.status === 200) {
					// КАТЕГОРИЧНО НЕ кешуємо динамічні запити з параметрами та файл версії
					const hasParams = url.searchParams.toString().length > 0;

					/*
					 * `basic` І ТІЛЬКИ ВІН. Сюди доходить лише своє походження
					 * (див. `isOwnUrl` вище), тож `cors` тут або неможливий,
					 * або означає, що межа протекла, — і тоді краще не класти
					 * в кеш нічого.
					 */
					if (
						!isAsset &&
						!isVersionFile &&
						!hasParams &&
						response.type === "basic"
					) {
						cache.put(event.request, response.clone());
					}
				}

				return response;
			} catch (err) {
				// Якщо ми офлайн, шукаємо в кеші
				const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
				if (cachedResponse) return cachedResponse;

				// Якщо це запит навігації (сторінка), повертаємо оболонку застосунку.
				//
				// Обидві адреси — з `base`. Доти першим стояв `cache.match("/")`,
				// тобто КОРІНЬ ORIGIN: застосунок живе під `/Slovko/`, такого
				// запису в кеші немає ніколи, і ця гілка не спрацювала жодного
				// разу. Тепер туди по визначенню не доходить і сам запит —
				// `isOwnUrl` відсіює все поза нашим scope.
				if (event.request.mode === "navigate") {
					const fallback =
						(await cache.match(`${base}/`)) ||
						(await cache.match(`${base}/404.html`));
					if (fallback) return fallback;
				}

				throw err;
			}
		})(),
	);
});
