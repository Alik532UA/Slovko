// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UI-конвенції, яких не покривають ні `svelte-check`, ні плагін ESLint
 * (SVELTE-UI-v8 § 4, ACCESSIBILITY-v8 § 10.5).
 *
 * Дві різні речі про `svelte-ignore`, і жодна з них не перевіряється
 * компілятором:
 *
 *   1. **Мертве придушення** — коментар, під яким уже немає попередження. Це
 *      ловить ESLint (`svelte/no-unused-svelte-ignore`, увімкнене як `error`
 *      2026-08-20; шість таких лежало в проєкті).
 *   2. **Придушення без причини** — попередження є, коментар є, а чому саме тут
 *      так можна, не сказано ніде. Ловить цей файл: ACCESSIBILITY-v8 § 10.5
 *      називає це HIGH, і причина конкретна — придушення без обґрунтування
 *      неможливо ні перевірити, ні зняти. Наступний читач бачить «тут так
 *      вирішили» й лишає як є, назавжди.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): прибрати блок-коментар
 * над будь-яким `svelte-ignore` — перевірка мусить назвати саме той файл і
 * рядок.
 */

const ROOT = process.cwd().replace(/\\/g, "/");

function svelteFiles(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) svelteFiles(full, out);
		else if (entry.endsWith(".svelte")) out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

const files = svelteFiles(join(ROOT, "src")).map((f) => f.slice(ROOT.length + 1));
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

describe("UI-конвенції", () => {
	it("перевірка жива: компоненти знайдено", () => {
		expect(files.length, "жодного .svelte — сканер шукає не там").toBeGreaterThan(20);
	});

	/**
	 * Svelte 4 API. `svelte-check` ловить частину випадків, але не всі: `<slot>`
	 * у Svelte 5 ще працює в режимі сумісності, тобто мовчить і компілюється.
	 */
	it("немає Svelte 4 API: <slot>, on:подія, <svelte:component>", () => {
		const bad: string[] = [];
		for (const file of files) {
			const text = read(file).replace(/<!--[\s\S]*?-->/g, "");
			for (const [pattern, what] of [
				[/<slot[\s/>]/, "<slot> замість сніпета"],
				[/\son:[a-z]+[=}]/, "on:подія замість onподія"],
				[/<svelte:component/, "<svelte:component> замість динамічного компонента"],
			] as const) {
				if (pattern.test(text)) bad.push(`${file}: ${what}`);
			}
		}
		expect(bad, `застаріле API Svelte 4:\n${bad.join("\n")}`).toEqual([]);
	});

	/**
	 * Обґрунтуванням вважається людський текст ПОРУЧ — у коментарі над
	 * придушенням або в хвості того самого коментаря. Назва правила не
	 * обґрунтування: вона повторює те, що й так написано.
	 *
	 * Порядок саме такий: SvelteKit вимагає, щоб `svelte-ignore` стояв
	 * безпосередньо над елементом, тож пояснення фізично не може стояти між
	 * ними — лише вище (AI-AGENT-PITFALLS-v8 § 5.7 про придушення, які
	 * промахуються).
	 */
	it("кожен svelte-ignore має поруч обґрунтування (ACCESSIBILITY § 10.5, HIGH)", () => {
		const naked: string[] = [];
		let total = 0;

		for (const file of files) {
			const lines = read(file).split("\n");
			lines.forEach((line, index) => {
				const inline = /<!--\s*svelte-ignore\s+(\S+)([^>]*)-->/.exec(line);
				if (!inline) return;
				total += 1;

				// 1. Пояснення в хвості того самого коментаря.
				if (/\S/.test(inline[2].replace(/-->/, ""))) return;

				// 2. Пояснення вище: коментар, що завершується безпосередньо над
				//    цим рядком. Сусідні `svelte-ignore` того ж елемента
				//    пропускаються — вони не пояснення одне одному.
				let cursor = index - 1;
				while (cursor >= 0 && /<!--\s*svelte-ignore/.test(lines[cursor])) cursor -= 1;

				if (cursor >= 0 && lines[cursor].trim().endsWith("-->")) {
					// Зібрати блок від його `<!--` до `-->` і подивитися, чи є в
					// ньому текст, окрім самих маркерів. Однорядковий коментар
					// `<!-- причина -->` — той самий випадок.
					let start = cursor;
					while (start > 0 && !lines[start].includes("<!--")) start -= 1;
					const body = lines
						.slice(start, cursor + 1)
						.join(" ")
						.replace(/<!--|-->/g, "");
					// Слова, а не окремі літери: `<!-- x -->` причиною не є.
					if ((body.match(/\p{L}{3,}/gu) ?? []).length >= 3) return;
				}

				naked.push(`${file}:${index + 1} — ${inline[1]}`);
			});
		}

		expect(total, "жодного svelte-ignore не знайдено — перевірка мертва").toBeGreaterThan(0);
		expect(
			naked,
			`придушення без причини — його неможливо ні перевірити, ні зняти:\n${naked.join("\n")}`
		).toEqual([]);
	});

	/**
	 * Зворотний бік того самого: правило, яким це тримається, мусить бути
	 * увімкнене. Інваріант над джерелами, а не над зібраним конфігом — тут
	 * важливо, що рівень саме `error`, а `eslint-baseline.test.ts` перевіряє
	 * лише «не off».
	 */
	it("мертві придушення ловить ESLint, і правило стоїть на error", () => {
		const config = readFileSync(join(ROOT, "eslint.config.js"), "utf8");
		expect(
			/"svelte\/no-unused-svelte-ignore":\s*"error"/.test(config),
			"без цього правила мертвий svelte-ignore заздалегідь дозволяє майбутнє порушення"
		).toBe(true);
	});
});
