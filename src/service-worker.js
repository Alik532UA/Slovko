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
	const isDev = url.hostname === 'localhost';

	// Ігноруємо запити не по http (наприклад, розширення браузера)
	if (!url.protocol.startsWith("http")) return;

	// ПОВНЕ ІГНОРУВАННЯ на localhost для всього, крім статичних асетів:
	// Це критично для стабільної роботи Vite (HMR) та уникнення помилок "Failed to fetch"
	if (isDev) {
		const isAsset = ASSETS.includes(url.pathname);
		const isVite = url.pathname.startsWith('/@vite/') || url.pathname.includes('vite');
		
		if (!isAsset || isVite) return;
	}

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
					
					// Кешуємо тільки чисті успішні відповіді, яких ще немає в списку ASSETS
					if (!isAsset && !isVersionFile && !hasParams) {
						if (response.type === 'basic' || response.type === 'cors') {
							cache.put(event.request, response.clone());
						}
					}
				}

				return response;
			} catch (err) {
				// Якщо ми офлайн, шукаємо в кеші
				const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
				if (cachedResponse) return cachedResponse;

				// Якщо це запит навігації (сторінка), повертаємо корінь додатка
				if (event.request.mode === "navigate") {
					const fallback =
						(await cache.match("/")) ||
						(await cache.match(`${base}/`)) ||
						(await cache.match("404.html"));
					if (fallback) return fallback;
				}

				// Не викидаємо помилку в консоль на localhost, якщо запит просто перервано
				if (isDev) {
					console.warn(`[SW] Fetch failed for ${url.pathname}${url.search}:`, err);
					return new Response("Network error", { status: 408 });
				}

				throw err;
			}
		})(),
	);
});
