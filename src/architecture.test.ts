// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Архітектурні правила, які досі трималися лише на уважності
 * (PROJECT-STRUCTURE-v8 § 8, SVELTE-CORE-v8 § 6).
 *
 * Усі чотири перевірки нижче зелені з першого прогону, і це не робить їх
 * зайвими — рівно навпаки. Пакет v8 стоїть на одному твердженні: «правило, яке
 * не можна перевірити автоматично, — це побажання, а не стандарт». Правило, яке
 * виконується сьогодні й не має гейта, — це побажання, яке ПОКИ ЩО збігається з
 * дійсністю; наступна правка розійдеться з ним без жодного сигналу.
 *
 * Найдорожча з чотирьох — контекст через `Symbol`-аксесор. `gameContext.ts`
 * цього проєкту не просто виконує правило, а є ЗРАЗКОМ, з якого правило й
 * потрапило в канон (SVELTE-CORE-v8 § 3.3, запис у PROJECT-CONTEXT.md). Зразок
 * без гейта — найкрихкіше, що буває: його копіюють, а не звіряють.
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

const all = walk(join(ROOT, "src"));
const sources = all
	.filter((f) => /\.(ts|svelte)$/.test(f))
	.filter((f) => !/\.(test|spec)\.ts$/.test(f));

const short = (file: string) => file.slice(ROOT.length + 1);
/** Коментарі відрізаються: цей файл цитує заборонені форми в докблоках. */
const code = (file: string) =>
	readFileSync(file, "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/^[ \t]*\/\/.*$/gm, "");

describe("архітектура", () => {
	it("перевірка жива: джерела знайдено", () => {
		expect(sources.length, "джерел немає — сканер шукає не там").toBeGreaterThan(50);
	});

	/**
	 * Руни лише у `.svelte` та `.svelte.ts` (PROJECT-STRUCTURE-v8 § анти-патерни).
	 *
	 * Клас дефекту тонкий: `$state` у звичайному `.ts` КОМПІЛЮЄТЬСЯ — Vite не
	 * скаржиться, типи сходяться, — але реактивності там немає, бо компілятор
	 * Svelte цей файл не обробляє. Значення просто перестає оновлюватися, і
	 * виглядає це як «чомусь не перемальовується».
	 */
	it("руни живуть лише у .svelte та .svelte.ts", () => {
		const bad: string[] = [];
		for (const file of sources) {
			if (!file.endsWith(".ts") || file.endsWith(".svelte.ts")) continue;
			const text = code(file);
			for (const rune of [/\$state[({<]/, /\$derived[({<]/, /\$effect[({.]/, /\$props\s*\(/]) {
				const m = rune.exec(text);
				if (m) bad.push(`${short(file)}: ${m[0]}`);
			}
		}
		expect(
			bad,
			`руна у звичайному .ts — компілятор Svelte цей файл не обробляє, реактивності не буде:\n${bad.join("\n")}`
		).toEqual([]);
	});

	/**
	 * Псевдонім імпорту збігається з іменем файлу (§ 5.2). Розбіжність ламає не
	 * збірку, а пошук: `grep MenuModal` перестає знаходити місця вжитку, і
	 * наступна правка робиться наосліп.
	 */
	it("псевдонім імпорту збігається з іменем файлу", () => {
		const bad: string[] = [];
		const form = /import\s+([A-Z][A-Za-z0-9]*)\s+from\s+["'][^"']*\/([A-Z][A-Za-z0-9]*)\.svelte["']/g;
		for (const file of sources) {
			for (const m of code(file).matchAll(form)) {
				if (m[1] !== m[2]) bad.push(`${short(file)}: ${m[1]} -> ${m[2]}.svelte`);
			}
		}
		expect(bad, `розбіжність псевдоніма й файлу:\n${bad.join("\n")}`).toEqual([]);
	});

	/**
	 * Контекст — лише типізованим аксесором із `Symbol`-ключем
	 * (SVELTE-CORE-v8 § 3.3, § 6).
	 *
	 * Рядковий ключ — це глобальний простір імен без перевірки: два компоненти
	 * пишуть під однією назвою, і `getContext` тихо віддає чуже значення.
	 * `Symbol` унікальний за побудовою, а аксесор додає тип і `throw`, коли
	 * контексту немає, — тобто помилка стає видимою в момент помилки, а не
	 * пізніше, у вигляді `undefined`.
	 *
	 * Негативний lookbehind відсікає `canvas.getContext("2d")`, який інакше дає
	 * знахідку в кожному проєкті з фоном на canvas.
	 */
	it("контекст береться лише аксесором із Symbol-ключем", () => {
		const form = /(?<![.\w])(get|set)Context\s*(?:<[^>]*>)?\s*\(\s*["'`]/g;
		const bad: string[] = [];
		for (const file of sources) {
			for (const m of code(file).matchAll(form)) {
				bad.push(`${short(file)}: ${m[0].trim()}`);
			}
		}
		expect(
			bad,
			`рядковий ключ контексту — два компоненти під однією назвою віддають одне одному чуже значення:\n${bad.join("\n")}`
		).toEqual([]);
	});

	/**
	 * Зворотний бік того самого правила: `getContext`/`setContext` не
	 * викликаються з компонентів напряму — лише з модуля-аксесора. Інакше
	 * `Symbol`-ключ доведеться експортувати, і він перестане бути захистом.
	 */
	it("getContext і setContext кличе лише модуль-аксесор", () => {
		const ACCESSOR = "src/lib/config/gameContext.ts";
		const callers = sources
			.filter((f) => /(?<![.\w])(?:get|set)Context\s*(?:<[^>]*>)?\s*\(/.test(code(f)))
			.map(short)
			.filter((f) => f !== ACCESSOR);

		expect(existsSync(join(ROOT, ACCESSOR)), `модуля-аксесора ${ACCESSOR} немає`).toBe(true);
		expect(
			callers,
			`контекст беруть повз аксесор — Symbol-ключ доведеться експортувати, і він перестане бути захистом:\n${callers.join("\n")}`
		).toEqual([]);
	});

	/**
	 * Файл перевірки лежить поруч із тим, що перевіряє, АБО в корені `src/` —
	 * але не в третьому місці. Тут це не смак: `module-reachability.test.ts`
	 * будує дерево імпортів від точок входу, і файл перевірки в довільній теці
	 * читається ним як осиротілий модуль.
	 */
	it("немає порожніх файлів у src/", () => {
		const empty = all
			.filter((f) => /\.(ts|svelte|css|json)$/.test(f))
			.filter((f) => readFileSync(f, "utf8").trim().length === 0)
			.map(short);
		expect(
			empty,
			`порожній файл читається як зроблена робота — видалити або наповнити:\n${empty.join("\n")}`
		).toEqual([]);
	});

	/**
	 * Дві теки з однаковою роллю розводять однотипні файли, і половина правил
	 * починає застосовуватися лише до однієї з них. Найчастіша пара —
	 * `utils/` проти `helpers/` і `stores/` проти `controllers/`.
	 */
	it("немає двох тек з однаковою роллю (§ 4)", () => {
		const dirs = new Set(
			all.map((f) => basename(f.slice(0, f.lastIndexOf("/"))))
		);
		const CLASHES: Array<[string, string]> = [
			["utils", "helpers"],
			["controllers", "stores"],
			["services", "api"],
			["types", "models"],
		];
		const both = CLASHES.filter(([a, b]) => dirs.has(a) && dirs.has(b)).map(
			([a, b]) => `${a}/ і ${b}/`
		);
		expect(
			both,
			`дві теки з однією роллю — однотипні файли розійдуться між ними: ${both.join(", ")}`
		).toEqual([]);
	});
});
