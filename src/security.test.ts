// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Безпека — те, що видно в джерелах (SECURITY-v8 § 16).
 *
 * Решта безпеки цього проєкту вже покрита, і саме тому прогалина була
 * непомітна: CSP і секрети в бандлі ловить `check-build.mjs`, правила доступу —
 * `check:rules` над емулятором, `eval` у формі виклику — ESLint
 * (`no-eval`, `no-implied-eval`, `no-new-func`). Не було перевірки на дві речі,
 * яких не бачить жоден із них:
 *
 *   1. `document.write` — ESLint-правила про `eval` його не стосуються, а він
 *      робить те саме: віддає рядок парсеру як розмітку.
 *   2. `{@html}` без санітизації. ESLint має `svelte/no-at-html-tags`, але в
 *      цьому проєкті єдиний вжиток винесений у ФАЙЛОВИЙ ВИНЯТОК конфігу — тобто
 *      рівно там, де правило вимкнене, не лишалося нічого. Виняток у конфігу
 *      знімає попередження назавжди й для всього файлу, включно з рядками, яких
 *      там ще немає.
 *
 * Тому перевірка нижче вимагає не «дозволу», а ОЗНАКИ ОБРОБКИ поруч: викликаної
 * функції санітизації або `JSON.stringify`. Коментар за ознаку не вважається:
 * пояснення не робить рядок безпечним.
 */

const ROOT = process.cwd().replace(/\\/g, "/");

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

const sources = walk(join(ROOT, "src"))
	.filter((f) => /\.(ts|js|svelte)$/.test(f))
	.filter((f) => !/\.(test|spec)\.(ts|js)$/.test(f));

/** Коментарі відрізаються: цей файл сам цитує заборонені форми в докблоках. */
const code = (file: string) =>
	readFileSync(file, "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/^[ \t]*\/\/.*$/gm, "");

const short = (file: string) => file.slice(ROOT.length + 1);

describe("безпека", () => {
	it("перевірка жива: джерела знайдено", () => {
		expect(sources.length, "джерел немає — сканер шукає не там").toBeGreaterThan(50);
	});

	/**
	 * Рядок, який стає кодом. ESLint покриває три форми з чотирьох; четверту —
	 * `document.write` — не покриває жодне з увімкнених правил.
	 */
	it("немає рядка, що стає кодом чи розміткою (§ 13)", () => {
		const bad: string[] = [];
		for (const file of sources) {
			const text = code(file);
			for (const form of [
				/(?<![.\w])eval\s*\(/,
				/new\s+Function\s*\(/,
				/document\s*\.\s*write(?:ln)?\s*\(/,
				// `setTimeout("код", …)` — та сама `eval`, лише в іншій формі.
				/set(?:Timeout|Interval)\s*\(\s*["'`]/,
			]) {
				const m = form.exec(text);
				if (m) bad.push(`${short(file)}: ${m[0]}`);
			}
		}
		expect(bad, `рядок як код:\n${bad.join("\n")}`).toEqual([]);
	});

	/**
	 * `{@html}` без обробки. Санітизацією вважається виклик функції, що чистить
	 * значення, або `JSON.stringify` (для `ld+json`, де вивід за побудовою
	 * екранований).
	 *
	 * Зворотний експеримент виконано: прибрати `asPlainName(...)` у
	 * `SpeechErrorModal.svelte` — перевірка падає саме на цьому рядку.
	 */
	it("кожен {@html} має ознаку санітизації, а не пояснення (§ 5)", () => {
		const bad: string[] = [];
		let total = 0;

		for (const file of sources.filter((f) => f.endsWith(".svelte"))) {
			const text = code(file);
			for (const m of text.matchAll(/\{@html\s+([\s\S]*?)\}\s*(?:<|$)/g)) {
				total += 1;
				const expression = m[1];
				// Ознака обробки: викликана функція із «sanit/escape/plain» в імені
				// або серіалізація в JSON.
				const processed =
					/\b\w*(?:sanit\w*|escape\w*|asPlain\w*|Plain\w*)\s*\(/i.test(expression) ||
					/JSON\.stringify\s*\(/.test(expression);
				if (!processed) {
					bad.push(`${short(file)}: {@html ${expression.replace(/\s+/g, " ").slice(0, 80)}…}`);
				}
			}
		}

		expect(total, "жодного {@html} не знайдено — перевірка мертва").toBeGreaterThan(0);
		expect(bad, `{@html} без санітизації:\n${bad.join("\n")}`).toEqual([]);
	});

	/**
	 * Секрет у джерелах. `check-build.mjs` шукає їх у `build/`, і цього досить
	 * для бандла — але не для репозиторію: значення, вписане в `.ts` і потім
	 * прибране зі збірки трясінням дерева, лишається в історії Git назавжди.
	 */
	it("немає вписаного ключа чи токена в джерелах (§ 4.1)", () => {
		const SECRET = [
			/(?:api[_-]?secret|private[_-]?key|service[_-]?account)\s*[:=]\s*["'`][^"'`]{8,}/i,
			/-----BEGIN [A-Z ]*PRIVATE KEY-----/,
			// Ключ Google/Firebase, вписаний рядком замість import.meta.env.
			/["'`]AIza[0-9A-Za-z_-]{30,}["'`]/,
		];
		const bad: string[] = [];
		for (const file of sources) {
			const text = code(file);
			for (const form of SECRET) {
				const m = form.exec(text);
				if (m) bad.push(`${short(file)}: ${m[0].slice(0, 40)}…`);
			}
		}
		expect(bad, `схоже на секрет у джерелах:\n${bad.join("\n")}`).toEqual([]);
	});

	/**
	 * `target="_blank"` без `rel="noopener"` віддає відкритій сторінці доступ до
	 * `window.opener`. Сучасні браузери це вже закривають самі, але не всі й не
	 * всюди, а ціна атрибута — нуль.
	 */
	it("кожен target=\"_blank\" має rel із noopener (§ 13)", () => {
		const bad: string[] = [];
		for (const file of sources.filter((f) => f.endsWith(".svelte"))) {
			const text = code(file);
			for (const tag of text.matchAll(/<a\b[\s\S]*?>/g)) {
				if (!/target\s*=\s*["'{]?_blank/.test(tag[0])) continue;
				if (!/rel\s*=\s*["'][^"']*noopener/.test(tag[0])) {
					bad.push(`${short(file)}: ${tag[0].replace(/\s+/g, " ").slice(0, 70)}`);
				}
			}
		}
		expect(bad, `_blank без noopener:\n${bad.join("\n")}`).toEqual([]);
	});
});
