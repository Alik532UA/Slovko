// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolveSiblingLocale, SIBLINGS, siblingUrl } from "./siblings";
import { ALL_LANGUAGES } from "./types";

/**
 * `siblings.ts` — ОДНА таблиця, скопійована у вісім репозиторіїв, і кожен із
 * них знає правду лише про свій рядок.
 *
 * Сусідні сайти будують посилання сюди з рядка `slovko`: сім мов, українська на
 * голій адресі, мовного сегмента немає. Додана тут мова робить сім чужих копій
 * застарілими мовчки; прибрана — веде чужі посилання в мову, якої вже немає.
 * Симптом зʼявляється на ЧУЖОМУ сайті й через місяці, тож перевірка стоїть тут.
 *
 * `i18n/init.ts` читається як ТЕКСТ, а не імпортується: він тягне
 * `$app/environment`, а в `vitest.config.ts` стоїть лише плагін `svelte`, не
 * `sveltekit()`. Імпорт впав би ще на розборі залежностей.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): прибрати `pl` з
 * `ALL_LANGUAGES` — червоніють дві перевірки (звірка з таблицею й звірка двох
 * переліків між собою); поміняти `DEFAULT_LOCALE` на `"en"` — червоніє типова
 * мова; додати каталог `src/routes/[[lang]]` — червоніє транспорт.
 */

const ROW = SIBLINGS.slovko;
const INIT = readFileSync("src/lib/i18n/init.ts", "utf8");

describe("рядок цього сайту в таблиці сусідів", () => {
	it("перелічує ті самі мови, що й SSoT типів", () => {
		expect([...ROW.locales].sort()).toEqual([...ALL_LANGUAGES].sort());
	});

	/*
	 * Переліків мов тут ДВА: `ALL_LANGUAGES` у типах і `SUPPORTED_LOCALES` в
	 * ініціалізації i18n. Розійшовшись, вони дають мову, яку можна обрати й для
	 * якої немає словника, — або навпаки. Таблиця сусідів робить це третім
	 * переліком, тож усі три звіряються тут.
	 */
	it("не розходиться з переліком в ініціалізації i18n", () => {
		const declared = /SUPPORTED_LOCALES: Language\[\] = \[([^\]]+)\]/.exec(
			INIT,
		);
		expect(declared, "перелік мов в init.ts більше не читається").toBeTruthy();

		const locales = [...declared![1].matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
		expect(locales.sort()).toEqual([...ALL_LANGUAGES].sort());
	});

	it("перелічує ті самі мови, словники яких зареєстровані", () => {
		const registered = [...INIT.matchAll(/register\("([\w-]+)"/g)].map(
			(m) => m[1],
		);
		expect(
			registered.length,
			"жодного register() — перевірка мертва",
		).toBeGreaterThan(0);
		expect(registered.sort()).toEqual([...ROW.locales].sort());
	});

	it("називає ту саму мову на голій адресі", () => {
		const declared = /DEFAULT_LOCALE: Language = "([\w-]+)"/.exec(INIT)?.[1];
		expect(ROW.defaultLocale).toBe(declared);
	});

	it("несе базу, з якою збирається сайт", () => {
		const config = readFileSync("svelte.config.js", "utf8");
		const declared = /BASE_PATH \|\| "([^"]+)"/.exec(config)?.[1];
		expect(declared, "svelte.config.js більше не оголошує базу").toBeTruthy();
		expect(ROW.base).toBe(declared);
	});

	it("несе той самий origin, що й генератор sitemap", () => {
		const script = readFileSync("scripts/generate-sitemap.mjs", "utf8");
		const declared = /SITE_ORIGIN = '([^']+)'/.exec(script)?.[1];
		expect(ROW.origin).toBe(declared);
	});

	it("узгоджений із макетом щодо кінцевого слеша", () => {
		const layout = readFileSync("src/routes/+layout.ts", "utf8");
		const declared = /trailingSlash = "(\w+)"/.exec(layout)?.[1];
		expect(declared, "макет більше не оголошує trailingSlash").toBeTruthy();
		expect(ROW.trailingSlash).toBe(declared === "always");
	});

	/*
	 * `transport: "query"` — не смак, а факт: мова тут не живе в адресі, тож
	 * сусід не може назвати її шляхом. Щойно зʼявиться мовний маршрут, рядок
	 * мусить стати `"path"` — інакше сусіди слатимуть параметр у сайт, який уже
	 * вміє краще.
	 */
	it("каже «параметром», бо мовного сегмента тут немає", () => {
		const language = readdirSync("src/routes", { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.filter((name) => /^\[+lang/.test(name));

		expect(
			language,
			"мовний сегмент зʼявився — транспорт має стати path",
		).toEqual([]);
		expect(ROW.transport).toBe("query");
	});
});

describe("посилання на CV несе мову, якою читають тут", () => {
	/*
	 * У CV сорок одна мова, і всі сім тутешніх серед них — жодна з них не
	 * потребує англійського мосту. Але типова мова CV — англійська, тобто саме
	 * англійська там на голій адресі; вона єдина не може бути в шляху.
	 */
	it("кладе мову в шлях, бо в CV вона не типова", () => {
		expect(siblingUrl("cv", "uk")).toBe("https://alik532ua.github.io/CV/uk/");
		expect(siblingUrl("cv", "pl")).toBe("https://alik532ua.github.io/CV/pl/");
		expect(siblingUrl("cv", "crh")).toBe("https://alik532ua.github.io/CV/crh/");
	});

	it("кладе англійську в параметр, бо шлях її назвати не може", () => {
		expect(siblingUrl("cv", "en")).toBe(
			"https://alik532ua.github.io/CV/?lang=en",
		);
	});

	it("не лишає жодної тутешньої мови без адреси в CV", () => {
		for (const language of ALL_LANGUAGES) {
			const url = new URL(siblingUrl("cv", language));
			const named = url.searchParams.get("lang") ?? url.pathname.split("/")[2];
			expect(named, `CV не відкривається мовою ${language}`).toBe(language);
		}
	});

	it("зводить en-US до en, а не вважає невідомим", () => {
		expect(resolveSiblingLocale("cv", "en-US")).toBe("en");
	});
});
