/// <reference types="@sveltejs/kit" />
import { build, files, prerendered, version } from "$service-worker";

// Назва кешу з версією для автоматичного оновлення
const CACHE = `slovko-cache-${version}`;

// Список всіх файлів для попереднього кешування
const ASSETS = [
	...build, // файли, згенеровані Vite (js, css)
	...files, // статичні файли з папки static
	...prerendered, // пререндерені сторінки
];

self.addEventListener("install", (event) => {
	// Одразу активуємо новий SW
	self.skipWaiting();

	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
	// Видаляємо старі кеші (тільки Slovko)
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key.startsWith("slovko-") && key !== CACHE) {
					await caches.delete(key);
				}
			}
			// Змушуємо SW одразу керувати всіма вкладками
			await self.clients.claim();
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
						(await cache.match("/Slovko/")) ||
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
