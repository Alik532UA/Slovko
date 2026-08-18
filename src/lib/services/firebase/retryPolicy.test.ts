// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isRetryable, NON_RETRYABLE_CODES } from "./retryPolicy";

/**
 * Канон називає цю перевірку прямо (ERROR-HANDLING-v8 § 7): «404 не
 * повторюється, 503 повторюється, скасований запит не повторюється». Тут
 * замість кодів HTTP — коди Firestore, бо саме вони приходять у `catch`
 * `SyncService`.
 */
describe("політика повторів синхронізації (ERROR-HANDLING-v8 § 3.1)", () => {
	it("відмова правил доступу не повторюється", () => {
		// Найдорожчий випадок: повтор ховає прогалину в правилах за трьома
		// тихими спробами й показує ту саму помилку на сім секунд пізніше.
		expect(isRetryable({ code: "permission-denied" })).toBe(false);
	});

	it("відсутній сеанс і неприйнятні дані не повторюються", () => {
		expect(isRetryable({ code: "unauthenticated" })).toBe(false);
		expect(isRetryable({ code: "invalid-argument" })).toBe(false);
		expect(isRetryable({ code: "failed-precondition" })).toBe(false);
		expect(isRetryable({ code: "not-found" })).toBe(false);
	});

	it("тимчасова недоступність і збій мережі повторюються", () => {
		expect(isRetryable({ code: "unavailable" })).toBe(true);
		expect(isRetryable({ code: "deadline-exceeded" })).toBe(true);
		expect(isRetryable({ code: "resource-exhausted" })).toBe(true);
	});

	it("помилка без коду вважається такою, що можна повторити", () => {
		// Інакше перша ж незнайома форма помилки тихо вимикала б синхронізацію.
		expect(isRetryable(new Error("зв'язок обірвався"))).toBe(true);
		expect(isRetryable(null)).toBe(true);
		expect(isRetryable(undefined)).toBe(true);
		expect(isRetryable("рядок")).toBe(true);
	});

	it("перевірка жива: перелік не порожній", () => {
		// Порожній перелік зробив би `isRetryable` тотожним `true`, і всі
		// перевірки вище, крім негативних, лишилися б зеленими.
		expect(NON_RETRYABLE_CODES.size).toBeGreaterThan(0);
	});
});
