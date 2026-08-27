// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Числа в документації звіряються з кодом, а не з пам'яттю
 * (AI-AGENT-PITFALLS-v8 § 5.5).
 *
 * `PROJECT-CONTEXT.md` уже несе цей висновок словами: «Число тут і в розділі
 * „стан правил доступу" мусить бути ОДНЕ — доти вони розходилися (39 проти
 * 36)». Висновок записали, перевірку — ні, і за два дні розійшлися вже інші
 * копії: у коментарі `deploy.yml` лишилося «36 випадків: 14 і 22», тоді як
 * гейт виконує 55 (20 і 35). Читач CI бачив число, менше за справжнє на
 * третину, і не мав жодного способу це помітити.
 *
 * Перевіряються ЛИШЕ ті числа, які не змінюються від кожного коміту: склад
 * випадків гейта правил доступу. Кількість юніт-тестів навмисно не звіряється
 * і в документації більше не називається — число, яке треба оновлювати щоразу,
 * коли додано перевірку, розійдеться знову, і гейт над ним лише перетворив би
 * дрейф документації на червоний CI без жодної користі.
 */

const ROOT = process.cwd();

const gate = readFileSync(join(ROOT, "scripts/check-rules.mjs"), "utf-8");

/**
 * Рахуються самі випадки, а не рядки з «allowed»: коментарі в тому файлі
 * ці слова теж містять.
 */
const cases = [...gate.matchAll(/^\s*\{\s*name:\s*['"][^'"]+['"],\s*allowed:\s*(true|false)/gm)];
const allowed = cases.filter((m) => m[1] === "true").length;
const denied = cases.filter((m) => m[1] === "false").length;
const total = cases.length;

/** Кожен документ, що взагалі згадує склад гейта правил. */
const DOCS = [
	"AGENTS.md",
	"PROJECT-CONTEXT.md",
	".github/workflows/deploy.yml",
];

describe("числа в документації (AI-AGENT-PITFALLS-v8 § 5.5)", () => {
	it("перевірка жива: випадки гейта правил розібрано", () => {
		// Нуль означав би, що змінилася форма запису випадків, а не що гейт
		// спорожнів, — і мовчазний зелений на будь-яких числах у документації.
		expect(total).toBeGreaterThan(20);
		expect(allowed).toBeGreaterThan(0);
		expect(denied).toBeGreaterThan(0);
		expect(allowed + denied).toBe(total);
	});

	for (const doc of DOCS) {
		it(`«${doc}» називає склад гейта правил правильно`, () => {
			const text = readFileSync(join(ROOT, doc), "utf-8");

			/*
			 * Шукаються всі числа поруч зі словами «випадк»/«перевірок»,
			 * «дозволено» й «заборонено» — і кожне мусить збігтися з тим, що
			 * справді виконує `check-rules.mjs`. Документ, який гейт не
			 * згадує, перевірку проходить: правило про НЕПРАВДУ, а не про
			 * обов'язок згадувати.
			 */
			const claims: { what: string; said: number; real: number }[] = [];
			for (const m of text.matchAll(/(\d+)\s+випадк\w*/g)) {
				claims.push({ what: m[0], said: Number(m[1]), real: total });
			}
			for (const m of text.matchAll(/(\d+)\s+перевір\w*(?::| правил| доступу| над емулятором)/g)) {
				claims.push({ what: m[0], said: Number(m[1]), real: total });
			}
			for (const m of text.matchAll(/(\d+)\s+дозволено/g)) {
				claims.push({ what: m[0], said: Number(m[1]), real: allowed });
			}
			for (const m of text.matchAll(/(\d+)\s+заборонено/g)) {
				claims.push({ what: m[0], said: Number(m[1]), real: denied });
			}
			for (const m of text.matchAll(/(\d+)\s+«застосунок мусить це вміти»/g)) {
				claims.push({ what: m[0], said: Number(m[1]), real: allowed });
			}
			for (const m of text.matchAll(/(\d+)\s+«сторонній не мусить/g)) {
				claims.push({ what: m[0], said: Number(m[1]), real: denied });
			}

			const wrong = claims
				.filter((c) => c.said !== c.real)
				.map((c) => `«${c.what.trim()}» — насправді ${c.real}`);

			expect(
				wrong,
				`число в документі розійшлося з check-rules.mjs (${total}: ${allowed} дозволено, ${denied} заборонено):\n${wrong.join("\n")}`,
			).toEqual([]);
		});
	}
});

/**
 * Стелі гейтів, названі в документації, — числа СТАБІЛЬНІ, і тому їх звіряють.
 *
 * Різниця з попереднім розділом не в темі, а у виді числа. Стеля змінюється
 * рідко й навмисно — коли борг скоротили й опустили запис. ЗАМІРЯНЕ значення
 * рухається від кожного коміту, і саме тому виміряного в документації бути не
 * має (шапка цього файлу каже це про кількість тестів; бюджет бандла під те
 * саме правило доти не потрапив).
 *
 * Це не гіпотеза, а перелік знайденого одним прогоном:
 *
 *   | документ казав          | у гейті стояло |
 *   |-------------------------|---------------:|
 *   | «стеля 21» (мертві ключі) |             20 |
 *   | «стеля 15» (aria-label)   |              1 |
 *   | «не більше 34» (розмір)   |             25 |
 *   | «стеля 240 при заміряних 214» | 240 — вірно, 214 давно ні |
 *
 * Тобто розходилися саме ті числа, які ніхто не мав причини перечитувати:
 * борг скорочували, стелю в тесті опускали, а рядок у таблиці лишався.
 *
 * Зворотний експеримент: змінити будь-яку константу нижче, не чіпаючи
 * документів, — перевірка мусить назвати саме її.
 */
const CEILINGS: { what: string; from: string; pattern: RegExp; inDoc: RegExp }[] = [
	{
		what: "бюджет критичного шляху",
		from: "scripts/check-bundle.mjs",
		pattern: /const LIMIT_KB = (\d+)/,
		inDoc: /[Сс]теля\D{0,4}(\d+)\s*КБ/g,
	},
	{
		what: "ключі словника без ужитку",
		from: "src/i18n-coverage.test.ts",
		pattern: /const KNOWN_UNUSED_KEYS = (\d+)/,
		inDoc: /без ужитку\*\* \(стеля (\d+)\)/g,
	},
	{
		what: "aria-label без i18n",
		from: "src/i18n-coverage.test.ts",
		pattern: /const KNOWN_HARDCODED_LABELS = (\d+)/,
		inDoc: /без i18n\*\* \(стеля (\d+)\)/g,
	},
	{
		what: "перевищення орієнтира розміру файлу",
		from: "src/file-size.test.ts",
		pattern: /const KNOWN_OVERSIZE = (\d+)/,
		inDoc: /перевищень орієнтира розміру не більше (\d+)/g,
	},
];

/** Документ, що взагалі згадує стелі. Гейт про НЕПРАВДУ, а не про обов'язок згадувати. */
const CEILING_DOCS = ["PROJECT-CONTEXT.md", ".github/workflows/deploy.yml"];

describe("стелі гейтів у документації", () => {
	const real = new Map<string, number>();
	for (const c of CEILINGS) {
		real.set(c.what, Number(c.pattern.exec(readFileSync(join(ROOT, c.from), "utf-8"))?.[1]));
	}

	it("перевірка жива: кожну стелю прочитано з її гейта", () => {
		const unread = CEILINGS.filter((c) => !Number.isFinite(real.get(c.what))).map(
			(c) => `${c.what} — форма запису в ${c.from} змінилася`,
		);
		expect(unread, unread.join("\n")).toEqual([]);
	});

	it("перевірка жива: кожну стелю справді згадано хоч в одному документі", () => {
		// Без цього переписаний рядок таблиці зробив би гейт мовчазно зеленим:
		// нема збігу — нема й розбіжності.
		const text = CEILING_DOCS.map((d) => readFileSync(join(ROOT, d), "utf-8")).join("\n");
		const missing = CEILINGS.filter((c) => ![...text.matchAll(c.inDoc)].length).map(
			(c) => `${c.what} — жоден документ не називає це число, і перевіряти нічого`,
		);
		expect(missing, missing.join("\n")).toEqual([]);
	});

	for (const doc of CEILING_DOCS) {
		it(`«${doc}» називає стелі правильно`, () => {
			const text = readFileSync(join(ROOT, doc), "utf-8");
			const wrong: string[] = [];
			for (const c of CEILINGS) {
				for (const m of text.matchAll(c.inDoc)) {
					const said = Number(m[1]);
					if (said !== real.get(c.what)) {
						wrong.push(`«${m[0].trim()}» — ${c.what}: у ${c.from} стоїть ${real.get(c.what)}`);
					}
				}
			}
			expect(wrong, `стеля в документі розійшлася з гейтом:\n${wrong.join("\n")}`).toEqual([]);
		});
	}
});
