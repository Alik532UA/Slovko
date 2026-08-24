// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * SERVICE WORKER НЕ ЗАБИРАЄ КЕРУВАННЯ У ВІДКРИТОЇ СТОРІНКИ.
 *
 * Клас дефекту, проти якого стоїть цей файл, ламає не оновлення, а сторінку,
 * яка ще працює. Механіка:
 *
 *   1. виходить деплой, людина тримає відкриту сторінку зі збірки N-1;
 *   2. новий SW ставиться і з `skipWaiting()` активується НЕГАЙНО;
 *   3. `clients.claim()` віддає йому керування тією самою відкритою сторінкою;
 *   4. `activate` видаляє кеш збірки N-1;
 *   5. сторінка просить свій наступний чанк — з хешем N-1. У новому кеші його
 *      немає (інші імена), а на GitHub Pages деплой замінює дерево цілком.
 *
 * Далі видно `Failed to fetch dynamically imported module`, а в консолі — 503:
 * саме його віддає Chrome, коли обробник `fetch` у SW відхиляється. Тобто
 * симптом вказує на дані («не завантажились слова»), а причина лежить у
 * стратегії оновлення, і зв'язати одне з одним по логу неможливо.
 *
 * Автоматично цього не бачить ніщо: збірка зелена, `svelte-check` німий, а
 * локально дефект не відтворюється взагалі — для нього потрібні ДВІ послідовні
 * збірки на живому хостингу й відкрита сторінка між ними.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): повернути в
 * `src/service-worker.js` виклик `self.skipWaiting()` — перевірка мусить
 * назвати саме його.
 */

const SW = readFileSync('src/service-worker.js', 'utf8');
const LAYOUT = readFileSync('src/routes/+layout.svelte', 'utf8');
const VERSION_SERVICE = readFileSync('src/lib/services/versionService.ts', 'utf8');

/** Текст без коментарів: у них ці виклики згадуються як опис дефекту. */
const code = SW.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

describe('service worker: оновлення застосовує людина, а не SW', () => {
	it('перевірка жива: файл SW прочитано, і в ньому є обробники', () => {
		expect(SW.length, 'файл SW порожній — перевіряти нема що').toBeGreaterThan(500);
		expect(code, 'у SW немає обробника install — сканер дивиться не туди').toContain('"install"');
		expect(code).toContain('"activate"');
		expect(code, 'коментарі не вирізано — перевірки нижче ловили б документацію').not.toContain(
			'НЕ ЗАБИРАЄ'
		);
	});

	it('SW не активується сам і не перебирає керування сторінкою', () => {
		const seized = ['skipWaiting', 'clients.claim'].filter((call) => code.includes(call));

		expect(
			seized,
			'негайна активація видаляє кеш збірки, з якої ЩЕ ПРАЦЮЄ відкрита ' +
				'сторінка, і її наступний динамічний імпорт падає з 503. Оновлення ' +
				'застосовує applyUpdate() після банера — SW має чекати: ' +
				seized.join(', ')
		).toEqual([]);
	});

	it('кешування при встановленні не атомарне', () => {
		// `addAll` відкидає весь виклик через один недоступний файл: `install`
		// падає, стан `installed` не настає, банер не з'являється — і людина
		// лишається на старій збірці без жодного повідомлення.
		expect(
			code.includes('addAll'),
			'cache.addAll атомарний: один файл зі ста блокує оновлення цілком'
		).toBe(false);
		expect(code, 'кешування по одному файлу зникло — install знову атомарний').toContain(
			'allSettled'
		);
	});

	it('шлях оновлення, на який спирається SW, існує', () => {
		/*
		 * Друга половина припущення. SW чекає саме тому, що застосунок має свій
		 * шлях: банер із `updatefound` і `applyUpdate()`, який знімає реєстрацію
		 * SW, чистить кеші й переходить із `?upd=`. Якщо цей шлях приберуть,
		 * чекання перетвориться на «оновлення не застосовується ніколи» — і
		 * дізнатися про це треба тут, а не від людини через тиждень.
		 */
		expect(LAYOUT, 'банер оновлення слухає updatefound').toContain('updatefound');
		expect(LAYOUT, 'подія installed більше не веде до банера').toContain('setUpdate(true)');
		expect(VERSION_SERVICE, 'applyUpdate більше не знімає реєстрацію SW').toContain(
			'unregister()'
		);
		expect(VERSION_SERVICE, 'обхід HTTP-кешу параметром upd зник').toContain("'upd'");
	});
});
