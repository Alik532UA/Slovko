/// <reference types="@sveltejs/kit" />
import { build, files, prerendered, version } from '$service-worker';

// Назва кешу з версією для автоматичного оновлення
const CACHE = `cache-${version}`;

// Список всіх файлів для попереднього кешування
const ASSETS = [
	...build, // файли, згенеровані Vite (js, css)
	...files, // статичні файли з папки static
	...prerendered // пререндерені сторінки
];

self.addEventListener('install', (event) => {
	// Одразу активуємо новий SW
	self.skipWaiting();

	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
	);
});

self.addEventListener('activate', (event) => {
	// Видаляємо старі кеші
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE) await caches.delete(key);
			}
			// Змушуємо SW одразу керувати всіма вкладками
			await self.clients.claim();
		})
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET' || event.request.headers.has('range')) return;

	const url = new URL(event.request.url);

	// Ігноруємо запити не по http (наприклад, розширення браузера)
	if (!url.protocol.startsWith('http')) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const isAsset = ASSETS.includes(url.pathname);
			
			// Для файлів збірки використовуємо Cache First
			if (isAsset) {
				const cachedResponse = await cache.match(url.pathname);
				if (cachedResponse) return cachedResponse;
			}

			// Для всього іншого намагаємось отримати з мережі
			try {
				const response = await fetch(event.request);

				if (response.status === 200) {
					// Кешуємо успішні відповіді, яких ще немає в списку ASSETS
					if (!isAsset) {
						cache.put(event.request, response.clone());
					}
				}

				return response;
			} catch (err) {
				// Якщо ми офлайн, шукаємо в кеші
				const cachedResponse = await cache.match(event.request);
				if (cachedResponse) return cachedResponse;

				// Якщо це запит навігації (сторінка), повертаємо корінь додатка
				if (event.request.mode === 'navigate') {
					// Шукаємо index.html або 404.html (для статичного адаптера)
					const fallback = await cache.match('/') || await cache.match('/Slovko/') || await cache.match('404.html');
					if (fallback) return fallback;
				}

				throw err;
			}
		})()
	);
});