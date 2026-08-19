// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	LocalStorageProvider,
	SessionStorageProvider,
	localStorageProvider,
	sessionStorageProvider,
	type StorageProvider,
} from "./storageProvider";

/**
 * Фасад сховища — критичний сервіс, і доти в нього не було ЖОДНОГО тесту
 * (STORAGE-NAMESPACE-v8 § «Автоматична перевірка», де тести названі
 * обов'язковими).
 *
 * Ціна саме тут не абстрактна. `alik532ua.github.io` — спільний origin шести
 * застосунків (реєстр префіксів у `PROJECT-CONTEXT.md`), тобто в них ОДНЕ
 * `localStorage` на всіх. Один `clear()` без фільтра за префіксом — і
 * налаштування, прогрес і плейлісти сусіднього застосунку зникають назавжди.
 * Це не «незручно», це втрата даних користувача, і зворотного ходу в неї немає.
 *
 * Фільтр у `clear()` написаний правильно. Перевірки не було — тобто правильність
 * трималася на тому, що ніхто не спростив цикл до `localStorage.clear()`. Тепер
 * тримається прогоном.
 *
 * Реверс-експеримент виконано (AI-AGENT-PITFALLS-v8 § 1.1): `clear()`, зведений
 * до `localStorage.clear()`, валить обидві перевірки § 2 — і в `localStorage`, і
 * в `sessionStorage`.
 */

/** Мінімальний Storage, який ще й ВИДНО: тест дивиться в `data` напряму. */
function makeStorage(overrides: Partial<Storage> = {}) {
	const data = new Map<string, string>();
	const storage = {
		get length() {
			return data.size;
		},
		key: (i: number) => [...data.keys()][i] ?? null,
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v),
		removeItem: (k: string) => void data.delete(k),
		clear: () => data.clear(),
		...overrides,
	} as Storage;
	return { storage, data };
}

/**
 * `window`, а не лише `localStorage`: усі методи фасаду виходять на
 * `typeof window === "undefined"`. Без цієї заглушки кожен тест перевіряв би
 * рівно SSR-гілку — тобто зелень означала б «нічого не сталося».
 */
function inBrowser(kind: "localStorage" | "sessionStorage", overrides: Partial<Storage> = {}) {
	const { storage, data } = makeStorage(overrides);
	vi.stubGlobal("window", { [kind]: storage });
	vi.stubGlobal(kind, storage);
	return { storage, data };
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/** Обидві реалізації однакові за контрактом, тож і перевіряються однаково. */
const IMPLEMENTATIONS: Array<{
	name: string;
	kind: "localStorage" | "sessionStorage";
	make: (prefix?: string) => StorageProvider;
}> = [
	{ name: "LocalStorageProvider", kind: "localStorage", make: (p) => new LocalStorageProvider(p) },
	{
		name: "SessionStorageProvider",
		kind: "sessionStorage",
		make: (p) => new SessionStorageProvider(p),
	},
];

describe.each(IMPLEMENTATIONS)("$name", ({ kind, make }) => {
	it("перевірка жива: заглушка справді підставляється", () => {
		const { data } = inBrowser(kind);
		make().setItem("canary", "1");
		expect(data.size, "запис не дійшов до сховища — тест перевіряє SSR-гілку").toBe(1);
	});

	it("усі ключі отримують префікс (§ Крок 1)", () => {
		const { data } = inBrowser(kind);
		const provider = make();

		provider.setItem("theme", "dark");
		provider.setJson("settings", { a: 1 });

		expect([...data.keys()].sort()).toEqual(["slovko_settings", "slovko_theme"]);
		expect(data.get("theme"), "ключ без префікса не має існувати").toBeUndefined();
	});

	it("читання й видалення теж ідуть за префіксом", () => {
		const { storage, data } = inBrowser(kind);
		const provider = make();

		// Значення, покладене «сирим» ключем, фасад бачити НЕ мусить.
		storage.setItem("theme", "light");
		expect(provider.getItem("theme")).toBeNull();

		provider.setItem("theme", "dark");
		expect(provider.getItem("theme")).toBe("dark");

		provider.removeItem("theme");
		expect(data.get("slovko_theme")).toBeUndefined();
		expect(data.get("theme"), "видалення зачепило чужий сирий ключ").toBe("light");
	});

	/**
	 * Найдорожча перевірка файлу. Саме її відсутність робила решту декоративною:
	 * без неї `clear()` можна було спростити до одного рядка, і всі інші тести
	 * лишилися б зеленими.
	 */
	it("clear() не чіпає дані сусідніх застосунків на спільному origin (§ CRITICAL)", () => {
		const { storage, data } = inBrowser(kind);
		const provider = make();

		// Реальні префікси сусідів із реєстру PROJECT-CONTEXT.md.
		storage.setItem("mindstep_settings", "{}");
		storage.setItem("cv-svelte_theme", "dark");
		storage.setItem("vetcrewgames_progress", "42");
		// І ключ узагалі без префікса — такі теж бувають на спільному origin.
		storage.setItem("legacy_key", "keep");
		provider.setItem("theme", "dark");
		provider.setItem("progress", "7");

		provider.clear();

		expect([...data.keys()].sort(), "знищено дані сусіднього застосунку").toEqual([
			"cv-svelte_theme",
			"legacy_key",
			"mindstep_settings",
			"vetcrewgames_progress",
		]);
	});

	it("clear() прибирає ВСЕ своє, а не лише перший ключ", () => {
		const { data } = inBrowser(kind);
		const provider = make();

		// Не менш ніж три: цикл `for (i < length)` із видаленням усередині
		// пропускав би кожен другий, і на двох ключах це ще виглядало б правильно.
		for (const key of ["a", "b", "c", "d", "e"]) provider.setItem(key, "1");
		expect(data.size).toBe(5);

		provider.clear();

		expect([...data.keys()], "частина власних ключів пережила clear()").toEqual([]);
	});

	it("переповнена квота повертає false і не валить застосунок (§ Крок 1)", () => {
		inBrowser(kind, {
			setItem: () => {
				throw new DOMException("quota", "QuotaExceededError");
			},
		});
		// Фасад повідомляє про відмову в консоль — це його єдиний канал.
		vi.spyOn(console, "error").mockImplementation(() => {});
		const provider = make();

		expect(() => provider.setItem("k", "v")).not.toThrow();
		expect(provider.setItem("k", "v"), "невдале збереження мусить повертати false").toBe(false);
		expect(provider.setJson("k", { a: 1 }), "setJson мусить нести ту саму відмову").toBe(false);
	});

	it("зіпсований JSON дорівнює відсутньому, а не винятку", () => {
		inBrowser(kind);
		const provider = make();

		provider.setItem("cfg", "{зламано");

		expect(() => provider.getJson("cfg")).not.toThrow();
		expect(provider.getJson("cfg")).toBeNull();
		expect(provider.getJson("ніколи-не-записаний")).toBeNull();
	});

	/**
	 * Поведінка без браузера. Пререндер виконує модулі в Node, і сховища там
	 * немає взагалі — звернення до нього кидає `ReferenceError` і валить збірку
	 * сторінки цілком.
	 */
	it("без window усе повертає «порожньо» і не звертається до сховища", () => {
		const { storage } = makeStorage();
		const touched = vi.spyOn(storage, "getItem");
		vi.stubGlobal("window", undefined);
		vi.stubGlobal(kind, storage);
		const provider = make();

		expect(provider.getItem("theme")).toBeNull();
		expect(provider.getJson("theme")).toBeNull();
		expect(provider.setItem("theme", "dark")).toBe(false);
		expect(provider.setJson("theme", {})).toBe(false);
		expect(() => provider.removeItem("theme")).not.toThrow();
		expect(() => provider.clear()).not.toThrow();

		expect(touched, "у SSR фасад не мусить торкатися сховища").not.toHaveBeenCalled();
	});

	it("власний префікс поважається — ізоляція не прошита в код", () => {
		const { data } = inBrowser(kind);
		const provider = make("other_");

		provider.setItem("theme", "dark");

		expect([...data.keys()]).toEqual(["other_theme"]);
	});
});

/**
 * Префікс — не деталь реалізації, а запис у реєстрі спільного origin. Розбіжність
 * між кодом і реєстром означає, що документ описує чужу ізоляцію: наступний
 * агент прочитає `PROJECT-CONTEXT.md` і побудує на ньому висновок про чистоту
 * сусідніх застосунків.
 */
describe("префікс проєкту", () => {
	const PROJECT_PREFIX = "slovko_";

	it("збігається з реєстром у PROJECT-CONTEXT.md", () => {
		const context = readFileSync("PROJECT-CONTEXT.md", "utf8");
		const declared = /\|\s*PROJECT_PREFIX\s*\|\s*`([^`]+)`\s*\|/.exec(context)?.[1];

		expect(declared, "у PROJECT-CONTEXT.md немає рядка PROJECT_PREFIX").toBeDefined();
		expect(declared).toBe(PROJECT_PREFIX);
	});

	it("непорожній і завершується підкресленням", () => {
		expect(PROJECT_PREFIX).toMatch(/^[a-z0-9-]+_$/);
	});

	it("типові синглтони фасаду використовують саме його", () => {
		for (const [kind, provider] of [
			["localStorage", localStorageProvider],
			["sessionStorage", sessionStorageProvider],
		] as const) {
			const { data } = inBrowser(kind);
			provider.setItem("theme", "dark");
			expect([...data.keys()]).toEqual([`${PROJECT_PREFIX}theme`]);
			vi.unstubAllGlobals();
		}
	});
});
