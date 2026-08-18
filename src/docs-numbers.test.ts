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
