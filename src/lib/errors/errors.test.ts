// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import * as errors from "./index";
import { ALL_ERROR_CODES, ALL_MESSAGE_KEYS } from "./errorToMessageKey";

/**
 * Інваріант обробки помилок (ERROR-HANDLING-v8 § 7).
 *
 * Перевіряє рівно те, від чого проєкт уже постраждав, а не «наявність файлу»:
 *
 * 1. Сирий текст помилки не доходить до екрана. Доти `ProfileModal` писав
 *    `errorMessage = err.message` — форма входу показувала англійський рядок
 *    Firebase, а форма відгуку — слово `AUTH_REQUIRED`.
 * 2. Кожен ключ, який може повернути `errorToMessageKey`, існує в словнику.
 *    Ключа, якого немає, `svelte-i18n` не пропускає мовчки — він показує сам
 *    ідентифікатор, тобто дефект знову виглядає як текст на екрані.
 * 3. Код Firebase записаний у своїй справжній формі. `auth()/…` замість
 *    `auth/…` (слід автозаміни `auth.` → `auth()`) не збігався НІ З ЧИМ, тож
 *    обидві гілки обробки не спрацьовували жодного разу.
 *
 * Зворотний експеримент (PIT-REVERSE-EXPERIMENT), прогін 2026-08-19: кожна з
 * трьох перевірок була показана червоною на навмисно поверненому дефекті —
 * `err.message` у `ProfileModal`, вигаданий ключ у переліку, `auth()/` у коді.
 */

const ROOT = process.cwd();
const DICT = join(ROOT, "src/lib/i18n/translations/uk.json");

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(ts|svelte)$/.test(entry)) out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

function flatten(value: unknown, prefix = ""): string[] {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return [prefix];
	return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
		flatten(v, prefix ? `${prefix}.${k}` : k),
	);
}

const sources = walk(join(ROOT, "src")).filter(
	(f) => !/\.(test|spec)\.ts$/.test(f),
);
const dictionaryKeys = new Set(
	flatten(JSON.parse(readFileSync(DICT, "utf-8"))),
);

describe("обробка помилок", () => {
	it("перевірка жива: джерела й словник знайдено", () => {
		expect(sources.length).toBeGreaterThan(50);
		expect(dictionaryKeys.size).toBeGreaterThan(100);
	});

	it("немає throw рядком (§ анти-патерн HIGH)", () => {
		const bad = sources.filter((f) => /throw\s+['"`]/.test(readFileSync(f, "utf8")));
		expect(bad, `throw 'рядок': ${bad.join(", ")}`).toEqual([]);
	});

	it("немає мовчазного catch (§ анти-патерн HIGH)", () => {
		const bad = sources.filter((f) =>
			/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(readFileSync(f, "utf8")),
		);
		expect(bad, `порожній catch: ${bad.join(", ")}`).toEqual([]);
	});

	it("кожен клас помилки успадковує AppError і несе ключ i18n", () => {
		const subclasses = Object.values(errors).filter(
			(v) =>
				typeof v === "function" &&
				(v as { prototype?: unknown }).prototype instanceof errors.AppError,
		) as unknown as (new () => errors.AppError)[];
		expect(subclasses.length).toBeGreaterThan(0);

		const withoutKey = subclasses
			.map((C) => new C())
			.filter((e) => !dictionaryKeys.has(e.messageKey))
			.map((e) => `${e.name} → ${e.messageKey}`);

		expect(withoutKey, `ключа немає у словнику: ${withoutKey.join(", ")}`).toEqual(
			[],
		);
	});

	it("кожен ключ із відображення існує у словнику (§ 4.1)", () => {
		const missing = [...new Set(ALL_MESSAGE_KEYS)].filter(
			(k) => !dictionaryKeys.has(k),
		);
		expect(missing, `ключів немає у словнику: ${missing.join(", ")}`).toEqual([]);
	});

	it("коди Firebase записані у справжній формі, а не «auth()/…»", () => {
		const broken = ALL_ERROR_CODES.filter((c) => /\(\)/.test(c));
		expect(broken, `код зі слідом автозаміни: ${broken.join(", ")}`).toEqual([]);

		// Літера після скісної риски обов'язкова: інакше під шаблон підпадає
		// сам опис дефекту в коментарі («доти тут стояло `auth()/…`»), і
		// перевірка починає ловити текст про себе замість коду.
		const inSources = sources
			.filter((f) => /["'`]auth\(\)\/[a-z]/.test(readFileSync(f, "utf8")))
			.map((f) => f.replace(`${ROOT.replace(/\\/g, "/")}/`, ""));
		expect(inSources, `«auth()/» у джерелах: ${inSources.join(", ")}`).toEqual([]);
	});

	it("сире повідомлення помилки не потрапляє в UI-стан (§ анти-патерн CRITICAL)", () => {
		/*
		 * Ловиться саме ПРИСВОЄННЯ `щось = ….message` у .svelte — тобто випадок,
		 * коли текст помилки стає повідомленням форми. Показ через
		 * `errorToMessageKey()` цієї форми не має, журнал
		 * (`logService.error(..., err)`) — теж: там немає присвоєння.
		 *
		 * Аварійні екрани (`+error.svelte`, `ErrorBoundary`, `ErrorFallback`)
		 * навмисно поза правилом: там технічне повідомлення — це і є те, заради
		 * чого екран існує, і воно не має присвоєння у стан форми.
		 */
		const bad: string[] = [];
		for (const file of sources.filter((f) => f.endsWith(".svelte"))) {
			const text = readFileSync(file, "utf8");
			for (const [i, line] of text.split("\n").entries()) {
				if (
					/(?:^|[^=!<>])=\s*[(\w][^;]*\.message\b/.test(line) &&
					!/errorToMessageKey/.test(line)
				) {
					bad.push(`${file.replace(`${ROOT.replace(/\\/g, "/")}/`, "")}:${i + 1}`);
				}
			}
		}
		expect(bad, `сире повідомлення на екран:\n${bad.join("\n")}`).toEqual([]);
	});
});
