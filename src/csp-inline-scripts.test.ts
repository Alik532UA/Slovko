// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Інлайн-скрипти `app.html` мусять стояти НИЖЧЕ `%sveltekit.head%`
 * (SECURITY-v8 § 6.3).
 *
 * Клас дефекту найтихіший з можливих. У пререндері політика приїжджає не
 * заголовком, а тегом `<meta http-equiv="Content-Security-Policy">`, який
 * SvelteKit вставляє рівно на місце `%sveltekit.head%`. Мета-політика діє лише
 * на те, що йде НИЖЧЕ за неї, тож скрипт вище неї не покритий узагалі — а
 * хеш для нього, обчислений у `svelte.config.js`, не захищає нічого.
 *
 * Симптому немає жодного: сайт працює, консоль чиста, тести зелені. Саме тому
 * канон перевіряє це прямим експериментом («прибрати хеш — чи щось зміниться»),
 * а тут — позицією в файлі, яку видно до збірки.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): перенести будь-який із
 * двох скриптів вище `%sveltekit.head%` — перевірка мусить назвати саме його.
 */

const HTML = readFileSync('src/app.html', 'utf8');
const MARKER = '%sveltekit.head%';

/** Позиції інлайн-скриптів (без `src`) у порядку появи. */
function inlineScriptPositions(): { at: number; head: string }[] {
	const found: { at: number; head: string }[] = [];
	for (const m of HTML.matchAll(/<script(\s[^>]*)?>/g)) {
		const attrs = m[1] ?? '';
		if (/\bsrc\s*=/.test(attrs)) continue;
		const body = HTML.slice(m.index + m[0].length, m.index + m[0].length + 60);
		found.push({ at: m.index, head: body.trim().split('\n')[0].slice(0, 40) });
	}
	return found;
}

describe('CSP та інлайн-скрипти app.html', () => {
	const marker = HTML.indexOf(MARKER);
	const scripts = inlineScriptPositions();

	it('перевірка жива: маркер і скрипти на місці', () => {
		expect(marker, `у app.html немає ${MARKER}`).toBeGreaterThan(-1);
		expect(scripts.length, 'жодного інлайн-скрипта — перевіряти нема що').toBeGreaterThan(0);
	});

	it('кожен інлайн-скрипт стоїть нижче %sveltekit.head%', () => {
		const above = scripts.filter((s) => s.at < marker).map((s) => s.head);
		expect(
			above,
			'скрипт вище мета-політики нею не покритий, і його хеш у svelte.config.js ' +
				`декоративний (SECURITY-v8 § 6.3):\n  ${above.join('\n  ')}`
		).toEqual([]);
	});

	it('хеші рахуються з файлу, а не вписані рядком у конфіг', () => {
		const config = readFileSync('svelte.config.js', 'utf8');
		expect(
			/inlineScriptHashes\(\)/.test(config),
			'у script-src немає виклику, що читає app.html — вписаний рядком хеш ' +
				'розійдеться зі скриптом при першій же правці'
		).toBe(true);

		const literal = config.match(/["'`]sha256-[A-Za-z0-9+/=]+["'`]/g) ?? [];
		expect(literal, 'хеш вписано літералом — він застаріє мовчки').toEqual([]);
	});

	it('кількість інлайн-скриптів збігається з тією, на яку розрахований конфіг', () => {
		const config = readFileSync('svelte.config.js', 'utf8');
		const expected = Number(/hashes\.length\s*!==\s*(\d+)/.exec(config)?.[1]);
		expect(expected, 'у svelte.config.js не знайдено очікуваної кількості скриптів').toBeGreaterThan(0);
		expect(
			scripts.length,
			'конфіг кине помилку на збірці — онови перелік разом із app.html'
		).toBe(expected);
	});
});
