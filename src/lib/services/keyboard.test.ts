import { describe, expect, it } from "vitest";
import { acceptsShortcut, isPlainKey, isTypingTarget } from "./keyboard";

/**
 * Захист полів вводу — головне, що тут перевіряється.
 *
 * Причина конкретна: у цьому проєкті серія `R` довго рахувалася ВИЩЕ за перевірку
 * фокуса, тож затиснута `R` у полі пошуку витирала всі локальні дані. Тест на
 * `closest` і на модифікатори — це тест на те, що така поведінка не повернеться
 * тихо.
 */

/** Мінімальний фейк події: справжній `KeyboardEvent` тут не потрібен. */
function stroke(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
	return {
		code: "KeyT",
		repeat: false,
		target: null,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		...overrides,
	} as unknown as KeyboardEvent;
}

describe("isTypingTarget", () => {
	it("бачить поле, коли ним є сама ціль", () => {
		const input = {
			closest: (selector: string) =>
				selector.includes("input") ? input : null,
		};
		expect(isTypingTarget(input as unknown as EventTarget)).toBe(true);
	});

	it("бачить поле, коли ціль — вкладений вузол contenteditable", () => {
		// Саме той випадок, який перевірка за `tagName` пропускає: фокус стоїть на
		// `SPAN` усередині редагованого блоку.
		const span = { closest: () => ({}) };
		expect(isTypingTarget(span as unknown as EventTarget)).toBe(true);
	});

	it("не бачить поля там, де його немає", () => {
		const div = { closest: () => null };
		expect(isTypingTarget(div as unknown as EventTarget)).toBe(false);
	});

	it("не кидає на цілі без closest", () => {
		expect(isTypingTarget(null)).toBe(false);
		expect(isTypingTarget(undefined)).toBe(false);
		expect(isTypingTarget({} as unknown as EventTarget)).toBe(false);
	});
});

describe("isPlainKey", () => {
	it("пропускає одиночну клавішу", () => {
		expect(isPlainKey(stroke())).toBe(true);
	});

	it.each(["ctrlKey", "metaKey", "altKey"] as const)(
		"відкидає %s",
		(modifier) => {
			expect(isPlainKey(stroke({ [modifier]: true }))).toBe(false);
		},
	);

	it("НЕ відкидає Shift: він не змінює code", () => {
		expect(isPlainKey(stroke({ shiftKey: true }))).toBe(true);
	});
});

describe("acceptsShortcut", () => {
	it("пропускає звичайну клавішу поза полем", () => {
		expect(
			acceptsShortcut(
				stroke({ target: { closest: () => null } as unknown as EventTarget }),
			),
		).toBe(true);
	});

	it("НЕ пропускає літеру, коли фокус у полі", () => {
		const input = { closest: () => ({}) } as unknown as EventTarget;
		expect(acceptsShortcut(stroke({ target: input }))).toBe(false);
	});

	it("пропускає Escape навіть із поля: закрити панель більше нічим", () => {
		const input = { closest: () => ({}) } as unknown as EventTarget;
		expect(acceptsShortcut(stroke({ code: "Escape", target: input }))).toBe(
			true,
		);
	});

	it("НЕ пропускає Ctrl+Escape: комбінація належить системі", () => {
		expect(acceptsShortcut(stroke({ code: "Escape", ctrlKey: true }))).toBe(
			false,
		);
	});
});
