// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { BETA_TABS, ALL_CHECKS } from "./lib/data/beta/checks";
import { COVERAGE_ORDER } from "./lib/data/beta/types";
import { APP_STATES, STATES_WITHOUT_CHECKLIST } from "./lib/config/appStates";
import { HIDDEN_ROUTES } from "./lib/config/hiddenRoutes";

/**
 * Інваріанти чеклиста бета-тестування (BETA-CHECKLIST-v8 § 5).
 *
 * Найдорожча пастка чеклистів — не помилка в пункті, а ВІДСТАВАННЯ: код
 * змінився, пункт лишився, і людина ставить «перевірено» на тому, чого вже
 * немає. Правило в документі помічає це тоді, коли документ хтось перечитає;
 * інваріант — на кожному прогоні.
 *
 * Проєкт уже мав чеклист саме в тій формі, проти якої написано документ:
 * чотири markdown-файли в `.private/` (поза Git, тобто поза код-рев'ю й поза
 * CI) із датою оновлення піврічної давнини. У них, зокрема, стояло «всі
 * переклади мають UTF-8 BOM» — неправда для семи словників інтерфейсу, і
 * неправда давня. Ніщо не могло цього побачити.
 */

const ROOT = process.cwd();

function walkSvelte(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walkSvelte(full, out);
		else if (entry.endsWith(".svelte")) out.push(full);
	}
	return out;
}

const svelteSources = walkSvelte(join(ROOT, "src")).map((f) => readFileSync(f, "utf8"));
const allSvelte = svelteSources.join("\n");

/**
 * Локатори збираються так, як їх збирає БРАУЗЕР, а не так, як вони записані.
 *
 * У SvelteKit локатор буває складений із двох файлів: `testid="about-modal"` в
 * одному, `data-testid="{testid}-panel"` — в іншому; рядка `about-modal-panel`
 * немає ніде. Без цього кроку перевірка бракувала б правильні назви — і автор
 * пункта, не знайшовши локатора, прибрав би поле, а пункт став би
 * неперевірним. Саме так це й ламалося в тому проєкті, звідки правило (§ 5.3).
 */
function collectLocators(): { literals: Set<string>; patterns: RegExp[] } {
	const literals = new Set<string>();
	const patterns: RegExp[] = [];

	// Значення, які передають пропом `testid`/`testId` у складені компоненти.
	const propValues = new Set<string>();
	for (const m of allSvelte.matchAll(/\btest[iI]d="([^"{]+)"/g)) propValues.add(m[1]);

	const raw = new Set<string>();
	for (const m of allSvelte.matchAll(/data-testid=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
		raw.add(m[1] ?? m[2]);
	}

	for (const id of raw) {
		if (!id.includes("{")) {
			literals.add(id);
			continue;
		}
		// Шаблон, що ПОЧИНАЄТЬСЯ з пропа testid → розкривається всіма його
		// значеннями. Без цього кроку `*-panel` підійшло б до будь-чого, і
		// перевірка приймала б вигадані назви.
		const composed = id.match(/^\{test[iI]d\}(.+)$/);
		if (composed) {
			for (const value of propValues) literals.add(`${value}${composed[1]}`);
			continue;
		}
		// Динаміка не на початку → шаблон із зіркою: `word-left-item-*`.
		if (!id.startsWith("{")) {
			const source = id.split(/\$?\{[^}]*\}/).map(escapeRe).join(".+");
			patterns.push(new RegExp(`^${source}$`));
			continue;
		}
		// Шаблон, що починається з динаміки, яка НЕ є пропом testid
		// (`{mode}-list`), розкрити нічим — такі не приймаються як локатори
		// пунктів, і це чесніше, ніж приймати `.*-list`.
	}

	return { literals, patterns };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const { literals, patterns } = collectLocators();

function locatorExists(testid: string): boolean {
	if (literals.has(testid)) return true;
	if (testid.includes("*")) {
		const re = new RegExp(`^${testid.split("*").map(escapeRe).join(".+")}$`);
		return [...literals].some((l) => re.test(l)) || patterns.some((p) => p.source === re.source);
	}
	return patterns.some((p) => p.test(testid));
}

/** Внутрішні назви, яких людина, що згодилася потикати сайт, не знає. */
const INTERNAL_WORDS = [
	"testid",
	"localstorage",
	"sessionstorage",
	"firestore",
	"firebase",
	"rtdb",
	"$state",
	".svelte",
	".ts",
	"синглтон",
	"локатор",
	"сховищ",
];

describe("чеклист бета-тестування (BETA-CHECKLIST-v8 § 5)", () => {
	it("перевірка жива: вкладки, пункти й локатори зібрано", () => {
		// Порожній набір локаторів зробив би § 5.3 тотожним «завжди так».
		expect(BETA_TABS.length).toBeGreaterThan(0);
		expect(ALL_CHECKS.length).toBeGreaterThan(10);
		expect(literals.size).toBeGreaterThan(100);
		expect(patterns.length).toBeGreaterThan(0);
		// Складені локатори справді розкрилися: цього рядка немає в жодному файлі.
		expect(literals.has("about-modal-panel")).toBe(true);
	});

	it("кожен стан застосунку заявлений рівно однією вкладкою (§ 5.1)", () => {
		const claimed = new Map<string, string[]>();
		for (const tab of BETA_TABS) {
			for (const state of tab.states) {
				claimed.set(state, [...(claimed.get(state) ?? []), tab.id]);
			}
		}

		const known = new Set(APP_STATES.map((s) => s.id));
		const unknown = [...claimed.keys()].filter((s) => !known.has(s));
		expect(unknown, `вкладка заявляє неіснуючий екран: ${unknown.join(", ")}`).toEqual([]);

		const uncovered = APP_STATES.map((s) => s.id)
			.filter((s) => !claimed.has(s))
			.filter((s) => !STATES_WITHOUT_CHECKLIST.includes(s));
		expect(uncovered, `екран є, а перевіряти його нічим: ${uncovered.join(", ")}`).toEqual([]);

		const twice = [...claimed].filter(([, tabs]) => tabs.length > 1);
		expect(twice.map(([s]) => s), "екран заявлено двічі").toEqual([]);
	});

	it("«covered» називає файл тесту, і файл існує (§ 5.2)", () => {
		const missing = ALL_CHECKS.filter((c) => c.test && !existsSync(join(ROOT, c.test))).map(
			(c) => `${c.id} → ${c.test}`,
		);
		expect(missing, `файлу тесту немає на диску: ${missing.join(", ")}`).toEqual([]);

		const coveredWithoutTest = ALL_CHECKS.filter((c) => c.coverage === "covered" && !c.test);
		expect(
			coveredWithoutTest.map((c) => c.id),
			"твердження про покриття без назви файлу гниє швидше за сам чеклист",
		).toEqual([]);

		const testWithoutCovered = ALL_CHECKS.filter((c) => c.test && c.coverage !== "covered");
		expect(
			testWithoutCovered.map((c) => c.id),
			"пункт називає тест, але оголошений непокритим — одне з двох неправда",
		).toEqual([]);
	});

	it("пункт, що просить натиснути, називає ІСНУЮЧИЙ локатор (§ 5.3)", () => {
		const naked = ALL_CHECKS.filter((c) => /натисн/i.test(c.text.uk)).filter((c) => !c.testid);
		expect(naked.map((c) => c.id), "неперевірний за побудовою").toEqual([]);

		const ghosts = ALL_CHECKS.filter((c) => c.testid && !locatorExists(c.testid)).map(
			(c) => `${c.id} → ${c.testid}`,
		);
		expect(ghosts, `локатора немає в жодному компоненті: ${ghosts.join(", ")}`).toEqual([]);
	});

	it("id унікальні й мають форму {вкладка}_{номер} (§ 5.4)", () => {
		const seen = new Set<string>();
		const dupes = ALL_CHECKS.filter((c) => (seen.has(c.id) ? true : (seen.add(c.id), false)));
		expect(dupes.map((c) => c.id), "id — ключ прогресу людини, він мусить бути один").toEqual([]);

		const wrongShape = BETA_TABS.flatMap((tab) =>
			tab.checks.filter((c) => !new RegExp(`^${tab.id}_\\d+$`).test(c.id)).map((c) => c.id),
		);
		expect(wrongShape).toEqual([]);
	});

	it("обидві мови непорожні, і в англійській немає кирилиці (§ 5.4)", () => {
		const bad: string[] = [];
		for (const c of ALL_CHECKS) {
			for (const [field, value] of [
				["text", c.text],
				["category", c.category],
			] as const) {
				if (!value.uk.trim() || !value.en.trim()) bad.push(`${c.id}.${field}: порожньо`);
				// Забутий переклад тип не бачить: скопійований український
				// рядок цілком задовольняє `en: string`.
				if (/[Ѐ-ӿ]/.test(value.en)) bad.push(`${c.id}.${field}.en: кирилиця`);
				if (!/[Ѐ-ӿ]/.test(value.uk)) bad.push(`${c.id}.${field}.uk: не українська`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("у кожної вкладки є пункт для людини і пункт-межа (§ 5.4, § 2.3)", () => {
		const noManual = BETA_TABS.filter(
			(t) => !t.checks.some((c) => c.coverage === "manual"),
		).map((t) => t.id);
		expect(noManual, "вкладка, де все покрито машиною, марнує час людини").toEqual([]);

		const noNegative = BETA_TABS.filter((t) => !t.checks.some((c) => c.negative)).map((t) => t.id);
		// Ліміт, що перестав діяти, виглядає точно так само, як ліміт, що діє.
		expect(noNegative, "немає пункта «не мусить» — тихий дефект нікому не помітити").toEqual([]);
	});

	it("текст написано для людини: без номера на початку й без внутрішніх назв", () => {
		const numbered = ALL_CHECKS.filter((c) => /^\s*\d+[.)]/.test(c.text.uk)).map((c) => c.id);
		// Номер малює сторінка з позиції; вписаний розійдеться з нею на першій
		// же вставці нового пункта (§ 2.2).
		expect(numbered).toEqual([]);

		const internal: string[] = [];
		for (const c of ALL_CHECKS) {
			const lower = `${c.text.uk} ${c.text.en}`.toLowerCase();
			for (const word of INTERNAL_WORDS) {
				if (lower.includes(word)) internal.push(`${c.id}: «${word}»`);
			}
		}
		expect(internal).toEqual([]);
	});

	it("в українському тексті один вид апострофа", () => {
		// Два різні апострофи ламають пошук по чеклисту — а шукати доводиться
		// щоразу, коли зі звіту треба знайти пункт за словом.
		const curly = ALL_CHECKS.filter((c) => /[’ʼ`]/.test(c.text.uk)).map((c) => c.id);
		expect(curly, "апостроф мусить бути один і той самий").toEqual([]);
	});

	it("порядок рівнів покриття саме manual → testable → covered (§ 3)", () => {
		expect([...COVERAGE_ORDER]).toEqual(["manual", "testable", "covered"]);
	});

	it("сторінка чеклиста прихована в трьох місцях, і слаг лише ASCII (§ 4)", () => {
		for (const route of HIDDEN_ROUTES) {
			// Кириличний гомогліф дає адресу, яка виглядає правильною й не
			// працює: у шляху вона percent-кодується, а в diff різниці не видно.
			expect(/^[a-z0-9-]+$/.test(route), `слаг не ASCII: ${route}`).toBe(true);

			expect(existsSync(join(ROOT, "src/routes", route, "+page.svelte"))).toBe(true);

			/*
			 * `noindex` малює кореневий layout, а не сама сторінка: сторінка
			 * рендериться нижче за гейт готовності, і під час пререндеру її
			 * `svelte:head` не потрапляє в HTML узагалі. Перелік маршрутів у
			 * layout той самий — з `hiddenRoutes.ts`.
			 */
			const layout = readFileSync(join(ROOT, "src/routes/+layout.svelte"), "utf8");
			expect(/name="robots"[^>]*noindex/.test(layout), "немає noindex").toBe(true);
			expect(layout.includes("isHiddenRoute"), "layout не звіряється з переліком").toBe(true);

			const robots = readFileSync(join(ROOT, "static/robots.txt"), "utf8");
			expect(robots.includes(`Disallow: /Slovko/${route}/`), "немає Disallow").toBe(true);

			const sitemap = readFileSync(join(ROOT, "static/sitemap.xml"), "utf8");
			expect(sitemap.includes(route), "службова сторінка потрапила в sitemap").toBe(false);
		}
	});
});
