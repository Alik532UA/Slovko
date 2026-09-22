// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { BETA_TABS, ALL_CHECKS } from "./lib/data/beta/checks";
import { COVERAGE_ORDER } from "./lib/data/beta/types";
import { APP_STATES, STATES_WITHOUT_CHECKLIST } from "./lib/config/appStates";
import { HIDDEN_ROUTES } from "./lib/config/hiddenRoutes";
import { betaChecklistStore } from "./lib/controllers/BetaChecklistStore.svelte";
import { versionStore } from "./lib/controllers/VersionStore.svelte";

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

	/**
	 * § 3.4 `BETA-LEVEL-BALANCE` — сильніша умова, ніж «хоч один manual».
	 *
	 * Контрольна група корисна доти, доки лишається групою, а не списком: кожен
	 * `covered` витрачає час живої людини там, де автотест уже дивиться. У
	 * сусідньому проєкті набору перекіс дійшов до 26 `covered` проти 15 `manual`,
	 * тобто половина чеклиста була контрольною групою.
	 */
	it("у вкладці covered не переважає manual (§ 3.4)", () => {
		const skewed = BETA_TABS.map((tab) => {
			const n = (level: string) => tab.checks.filter((c) => c.coverage === level).length;
			return { id: tab.id, manual: n("manual"), covered: n("covered") };
		}).filter((row) => row.covered > row.manual);

		expect(
			skewed.map((r) => `${r.id}: covered ${r.covered} > manual ${r.manual}`),
			"контрольна група більша за роботу — час людини йде туди, де тест уже дивиться",
		).toEqual([]);
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

			/*
			 * ПЕРЕВІРЯЄТЬСЯ ПРОТИЛЕЖНЕ (§ 4.0, `BETA-NOINDEX-OVER-DISALLOW`).
			 *
			 * Доти тут вимагався `Disallow`, і це було неправильно рівно
			 * навпаки: заборона обходу означає, що краулер сторінку не
			 * ЗАВАНТАЖУЄ — отже й `noindex` у ній не читає ніколи, а адреса, на
			 * яку хтось послався ззовні, лягає в індекс голим URL. Прибрати його
			 * потім нічим: прибирає рівно той тег, до якого краулер не дійшов.
			 */
			const robots = readFileSync(join(ROOT, "static/robots.txt"), "utf8");
			const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
			expect(
				disallowed.filter((rule) => rule.includes(route)),
				"Disallow забирає в краулера запит, у відповіді на який лежить noindex"
			).toEqual([]);

			const sitemap = readFileSync(join(ROOT, "static/sitemap.xml"), "utf8");
			expect(sitemap.includes(route), "службова сторінка потрапила в sitemap").toBe(false);
		}
	});

	/**
	 * § 5.6 `BETA-LOCATOR-PER-CHECK` + TESTID-AND-NAMING § 1.2.
	 *
	 * Обидва правила стояли в каноні, і не падало жодне: за форму `id`
	 * (`{вкладка}_{номер}`) і за форму локатора (без підкреслень) відповідали
	 * різні перевірки в різних проєктах, а місце, де одне переходить у друге,
	 * не перевіряв ніхто. Розмітка підставляла `check.id` як є й давала
	 * `beta-check-game_1-item`.
	 */
	it("локатор пункта виходить із id чистим, без підкреслень (§ 5.6)", () => {
		const raw = [...allSvelte.matchAll(/data-testid="(beta-[^"]*)"/g)].map((m) => m[1]);
		expect(raw.length, "перевірка мертва: локаторів чеклиста не знайдено").toBeGreaterThan(0);

		// Шаблон `{check.id}` у розмітці — це підкреслення, яке ще не видно:
		// `id` пункта має форму `{вкладка}_{номер}` (§ 2.2) й сам по собі в
		// локатор не годиться.
		expect(
			raw.filter((id) => /\{\s*check\.id\s*\}/.test(id)),
			"локатор бере check.id без переведення в kebab-case"
		).toEqual([]);

		// Решта підстановок (`tab.id`, `state.id`) законні рівно доти, доки самі
		// ці id підкреслень не мають: інакше вони дають ту саму назву іншим шляхом.
		const templateSources = [
			...BETA_TABS.map((tab) => tab.id),
			...APP_STATES.map((state) => state.id),
		];
		expect(
			templateSources.filter((id) => id.includes("_")),
			"id, який підставляється в локатор, містить підкреслення"
		).toEqual([]);

		// І сам результат: жодного `_` у назві, яка потрапить у DOM.
		expect(
			raw.filter((id) => id.includes("_")),
			"підкреслення в локаторі"
		).toEqual([]);
	});

	/**
	 * § 6.2.1 `BETA-REPORT-HINT-SPLIT`.
	 *
	 * Доти `beta-report-hint` висів на ВІДМОВІ буфера, а на успіху підказки не
	 * було зовсім, — і сценарій e2e «підказка видима» доводив протилежне тому,
	 * що мав. Тепер їх дві, і перевірка нижче не дає їм знову злитися.
	 */
	it("успіх копіювання й відмова буфера мають різні локатори (§ 6.2.1)", () => {
		expect(allSvelte, "немає локатора успіху").toContain('data-testid="beta-report-hint"');
		expect(allSvelte, "немає локатора відмови").toContain(
			'data-testid="beta-report-failed-hint"'
		);
	});

	/** § 8.4 `BETA-SCREEN-LINKS`: зі службової сторінки мусить бути вихід. */
	it("зі сторінки чеклиста є вихід на головну (§ 8.4)", () => {
		expect(allSvelte, "тестувальник приходить за прямим посиланням і лишається в пастці").toContain(
			'data-testid="beta-home-link"'
		);
	});
});

/**
 * Поведінка позначки (§ 3.3 `BETA-VOTE-UNDO`, § 6.3.1 `BETA-CLEAR-DISARM`).
 *
 * Сховища під `node` немає: `LocalStorageProvider` віддає `null` і мовчки не
 * пише, коли `window` не визначений. Для цих сценаріїв це саме те, що треба —
 * перевіряється перехід СТАНУ, а не збереження (його перевіряє e2e).
 */
describe("позначка чеклиста", () => {
	beforeEach(() => {
		betaChecklistStore.clear();
		versionStore.setVersion("1.0.0");
	});

	it("повторне натискання того самого стану знімає позначку (§ 3.3)", () => {
		betaChecklistStore.setVote("game_1", "ok");
		expect(betaChecklistStore.voteOf("game_1")).toBe("ok");

		betaChecklistStore.setVote("game_1", "ok");
		expect(betaChecklistStore.voteOf("game_1"), "клік не скасувався").toBeNull();
	});

	/**
	 * ЦЕ БУВ СПРАВЖНІЙ ДЕФЕКТ, а не профілактика.
	 *
	 * Умова читала лише `?.vote === vote`, тож на позначці З ІНШОЇ ЗБІРКИ
	 * повторне натискання її СТИРАЛО. Людина, яка прийшла підтвердити торішнє
	 * «працює» на новій версії, натомість його втрачала: поступ не ріс (позначка
	 * зникла), а підказка «позначено на іншій збірці» зникала разом із нею, тож
	 * і сліду від втрати не лишалося.
	 */
	it("повторне натискання на СТАРІЙ позначці перепоставляє її на цій збірці (§ 3.3)", () => {
		betaChecklistStore.setVote("game_1", "ok");
		versionStore.setVersion("2.0.0");
		expect(betaChecklistStore.isStale("game_1"), "позначка мала стати застарілою").toBe(true);

		betaChecklistStore.setVote("game_1", "ok");

		expect(betaChecklistStore.voteOf("game_1"), "підтвердження стерло позначку").toBe("ok");
		expect(betaChecklistStore.isStale("game_1"), "позначка лишилася на старій версії").toBe(false);
	});

	it("зведена кнопка стирання розводиться сама (§ 6.3.1)", () => {
		vi.useFakeTimers();
		try {
			betaChecklistStore.setVote("game_1", "ok");

			expect(betaChecklistStore.requestClear(), "перше натискання стерло").toBe(false);
			expect(betaChecklistStore.clearArmed).toBe(true);

			vi.advanceTimersByTime(5000);

			expect(
				betaChecklistStore.clearArmed,
				"кнопка лишилася зведеною — наступний прихід за крок від знесення роботи"
			).toBe(false);
			expect(betaChecklistStore.voteOf("game_1"), "розведення стерло позначки").toBe("ok");
		} finally {
			vi.useRealTimers();
		}
	});
});
