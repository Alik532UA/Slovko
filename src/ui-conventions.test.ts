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

/**
 * Емодзі в UI (UI-UX-v8 § 1.2, MEDIUM).
 *
 * Правило пакета говорить про системні емодзі в кнопках, меню й діалогах:
 * замість них SVG-іконка. Причина не в смаку — емодзі малює ШРИФТ СИСТЕМИ,
 * тож той самий ⚠️ у Windows жовтий і плаский, в Android помаранчевий, в iOS
 * об'ємний, а в частині Linux-збірок його немає взагалі й лишається порожній
 * прямокутник. Розмір при цьому йде за текстом, а не за іконками поруч, і
 * колір не слухає тему.
 *
 * Канон радить перевіряти це по СЛОВНИКАХ. Тут словники чисті всі сім — а
 * емодзі жили в розмітці: ⚠️ на трьох екранах помилки й ✅ 📋 на кнопках
 * аварійної сторінки, поруч із `AlertTriangle` і `Copy`, які проєкт уже
 * імпортує. Тому перевірка дивиться саме туди, де знайшлося.
 *
 * ## Межі
 *
 * Дивиться лише РОЗМІТКУ: `<script>`, `<style>` і коментарі вирізані. Емодзі в
 * рядку всередині `<script>`, який потім рендериться, ця перевірка не побачить —
 * сказано прямо, бо мовчання тут читалося б як «таких випадків немає». Зате
 * `logService.log("… ✅")` і таблиця гарячих клавіш у коментарі не дають
 * хибних спрацювань: це не UI.
 *
 * Прапори мов (`LANGUAGE_FLAGS`) — виняток самого канону («списки для вибору»)
 * і лежать у `.ts`, тобто сюди не потрапляють за побудовою.
 *
 * Зворотний експеримент: повернути ⚠️ в будь-який компонент — перевірка мусить
 * назвати саме той файл і рядок.
 */
const EMOJI =
	/[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

/** Розмітка компонента: без `<script>`, `<style>` і коментарів. */
function markupOf(text: string): string[] {
	const stripped = text
		.replace(/<script[\s\S]*?<\/script>/g, (m) => m.replace(/[^\n]/g, " "))
		.replace(/<style[\s\S]*?<\/style>/g, (m) => m.replace(/[^\n]/g, " "))
		.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
	return stripped.split("\n");
}

describe("емодзі в UI (UI-UX-v8 § 1.2)", () => {
	const found = files.flatMap((file) =>
		markupOf(read(file))
			.map((line, i) => ({ line, i }))
			.filter(({ line }) => EMOJI.test(line))
			.map(({ line, i }) => `${file}:${i + 1}: ${line.trim()}`),
	);

	it("перевірка жива: розбір лишає розмітку й прибирає script", () => {
		const sample = markupOf(
			['<script>', 'const a = "⚠️";', '</script>', '<p>⚠️</p>'].join("\n"),
		);
		expect(sample.some((l) => EMOJI.test(l)), "емодзі в розмітці мусить лишитися").toBe(true);
		expect(EMOJI.test(sample[1]), "емодзі в script мусить зникнути").toBe(false);
	});

	it("у розмітці компонентів немає емодзі", () => {
		expect(
			found,
			"емодзі малює шрифт системи: інший вигляд у кожній ОС, розмір за текстом, " +
				`колір повз тему. Іконка з lucide-svelte робить те саме однаково:\n  ${found.join("\n  ")}`,
		).toEqual([]);
	});
});
