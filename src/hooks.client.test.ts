import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ERROR-HANDLING-v8 § 2.4 — гачок неперехоплених помилок клієнта.
 *
 * Перевіряється ПОВЕДІНКА, і насамперед та її частина, яку в сусідніх
 * репозиторіях уже одного разу зняли мовчки: `if (status === 404) return`. Без
 * нього кожна помилкова адреса крутить лічильник помилок і фарбує службове
 * табло червоним — тобто сигнал «щось зламалося» починає означати «хтось
 * помилився посиланням», і помітити це можна лише за скаргою.
 *
 * Зворотний експеримент: прибрати той рядок із гачка — падає перша перевірка.
 *
 * Другий розділ — запасний шар над застарілою вкладкою (VERSIONING § 4.5,
 * `VER-OPEN-TAB-SURVIVES`, HIGH). Перевіряється саме поведінка, бо помилка
 * тут була б не в наявності коду, а в його кількості: перезавантаження, яке
 * повторюється, — це вже не лікування, а цикл.
 */

const handle = vi.fn();
vi.mock("$lib/services/errorHandler", () => ({
	errorHandler: { handle: (...args: unknown[]) => handle(...args) },
}));

const event = { url: new URL("https://example.com/Slovko/") } as never;

/**
 * Середовище тут `node` (див. `vitest.config.ts`), тож ні `window`, ні
 * `sessionStorage` немає. Обидва підставляються навмисно мінімальними: гачок
 * має право розраховувати рівно на `location.reload()` і на фасад сховища.
 */
function stubBrowser() {
	const reload = vi.fn();
	const store = new Map<string, string>();
	vi.stubGlobal("window", { location: { reload } });
	vi.stubGlobal("sessionStorage", {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k),
		key: (i: number) => [...store.keys()][i] ?? null,
		get length() {
			return store.size;
		},
	});
	return { reload, store };
}

describe("handleError клієнта", () => {
	beforeEach(() => {
		handle.mockClear();
	});

	const call = async (status: number, error: unknown) => {
		const { handleError } = await import("./hooks.client");
		return handleError({ error, event, status, message: String(status) });
	};

	it("404 НЕ потрапляє ні в журнал, ні в лічильник помилок", async () => {
		const result = await call(404, new Error("Not Found"));

		expect(
			handle,
			"помилкова адреса — не збій застосунку",
		).not.toHaveBeenCalled();
		expect(
			result,
			"повернення значення намалювало б сторінку помилки як збій",
		).toBeUndefined();
	});

	it("справжня помилка потрапляє в журнал разом зі шляхом", async () => {
		const boom = new Error("boom");
		await call(500, boom);

		expect(handle).toHaveBeenCalledTimes(1);
		const [passed, context, options] = handle.mock.calls[0] as [
			unknown,
			string,
			Record<string, unknown>,
		];
		expect(passed).toBe(boom);
		expect(context).toContain("/Slovko/");
		expect(
			options.showToast,
			"тост поверх сторінки помилки — друге повідомлення про те саме",
		).toBe(false);
	});

	it("відвідувачу віддається узагальнений текст, а не повідомлення рантайму", async () => {
		const result = await call(
			500,
			new Error("Cannot read properties of undefined"),
		);

		expect(result?.message).toBeTruthy();
		expect(
			result?.message,
			"текст рантайму нічого не пояснює відвідувачу, зате показує нутрощі застосунку",
		).not.toContain("Cannot read properties");
	});
});

describe("вкладка, відкрита до деплою (VER-OPEN-TAB-SURVIVES, HIGH)", () => {
	beforeEach(() => {
		handle.mockClear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const call = async (error: unknown) => {
		const { handleError } = await import("./hooks.client");
		return handleError({ error, event, status: 500, message: "500" });
	};

	/**
	 * Кожна збірка перейменовує чанки за хешем вмісту, тож вкладка, відкрита до
	 * деплою, тримає перелік адрес, яких на сервері вже немає. Перший же лінивий
	 * імпорт отримує 404, і людина бачить зламаний застосунок — хоча зламана
	 * лише вкладка.
	 */
	it("помилка завантаження чанка перезавантажує сторінку", async () => {
		const { reload } = stubBrowser();

		const result = await call(
			new Error(
				"Failed to fetch dynamically imported module: /Slovko/_app/immutable/nodes/2.W34Pfrl5.js",
			),
		);

		expect(
			reload,
			"застаріла вкладка лікується перезавантаженням",
		).toHaveBeenCalledTimes(1);
		expect(
			handle,
			"подія «вкладка пережила деплой» мусить бути в журналі",
		).toHaveBeenCalledTimes(1);
		expect(result?.message).toBeTruthy();
	});

	/**
	 * Найдорожча помилка в цьому місці — не відсутність перезавантаження, а
	 * друге поспіль: сторінка крутиться, і причини не видно ніде.
	 */
	it("друга така сама помилка НЕ перезавантажує — це був би цикл", async () => {
		const { reload } = stubBrowser();
		const boom = new Error("Failed to fetch dynamically imported module");

		await call(boom);
		await call(boom);

		expect(
			reload,
			"маркер у сховищі мусить зупинити другу спробу",
		).toHaveBeenCalledTimes(1);
	});

	it("текст рушія не має значення: Firefox і Safari кажуть інше", async () => {
		for (const message of [
			"error loading dynamically imported module",
			"Importing a module script failed.",
		]) {
			const { reload } = stubBrowser();
			await call(new Error(message));
			expect(
				reload,
				`«${message}» не розпізнано як застарілий чанк`,
			).toHaveBeenCalledTimes(1);
			vi.unstubAllGlobals();
		}
	});

	it("звичайна помилка сторінку не перезавантажує", async () => {
		const { reload } = stubBrowser();

		await call(new Error("Cannot read properties of undefined"));

		expect(
			reload,
			"перезавантаження на будь-якій помилці ховало б справжні збої за миготінням сторінки",
		).not.toHaveBeenCalled();
	});
});
