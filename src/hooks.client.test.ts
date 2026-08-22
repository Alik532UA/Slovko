import { beforeEach, describe, expect, it, vi } from "vitest";

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
 */

const handle = vi.fn();
vi.mock("$lib/services/errorHandler", () => ({
	errorHandler: { handle: (...args: unknown[]) => handle(...args) },
}));

const event = { url: new URL("https://example.com/Slovko/") } as never;

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
