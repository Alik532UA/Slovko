// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Значкова кнопка без доступного імені — статично, по КОЖНОМУ `.svelte`
 * (ACCESSIBILITY § 10.6, `A11Y-STATIC-ICON-LABEL`, HIGH; гейт `GATE-A11Y-STATIC`).
 *
 * Друга половина цього гейта — контраст пар токенів — живе в
 * `src/contrast.test.ts`: там власний розв'язувач змінних і власна стеля, і
 * зшивати їх в один файл означало б зробити нечитабельними обидва.
 *
 * Чому це не ловив жоден із наявних гейтів:
 *
 * - `tests/e2e/a11y.spec.ts` (axe) судить про те, що НАМАЛЬОВАНО. Кнопка, яка
 *   з'являється лише в гілці `{#if}` — режим редагування аватара, крок форми
 *   відгуку після вибору теми, — на маршрут за `page.goto()` не потрапляє
 *   ніколи, тож axe її не бачить у принципі, а не «пропускає».
 * - `src/close-button-conventions.test.ts` дивиться рівно на кнопки, чий
 *   локатор закінчується на `-close-btn`. Це найчастіший порушник, але не
 *   єдиний.
 * - `src/i18n-coverage.test.ts` рахує `aria-label`, ЗАХАРДКОДЖЕНІ рядком, і
 *   тримає їх стелю. Кнопка взагалі без `aria-label` у те число не входить:
 *   нема підпису — нема й того, що звіряти зі словником.
 *
 * Тобто клас «підпису немає зовсім» лежав рівно між трьома перевірками. Прогін
 * цієї на момент її появи знайшов п'ять кнопок, і жодна не була випадковою:
 * «назад» у формі відгуку (`FeedbackModal`), «зберегти» й «скасувати» в
 * редакторі аватара (`AvatarEditor`) — усі три всередині `{#if}`, — а ще
 * «редагувати» й «видалити» в `PlaylistGrid`. Остання пара показова окремо: у
 * тому ж файлі, за двадцять рядків вище, стоїть ТАКА САМА кнопка редагування
 * для системного списку, і в неї підпис є. Тобто розійшлися дві копії одного
 * елемента в одному компоненті — те, чого не видно ні оком, ні на знімку
 * екрана, бо обидві виглядають однаково.
 */

const SKIP = new Set(["node_modules", ".svelte-kit", "build", "dist", ".temp"]);

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		if (SKIP.has(name)) return [];
		const full = join(dir, name);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

const SVELTE = walk("src").filter((f) => f.endsWith(".svelte"));

/**
 * Кінець відкривального тега шукається сканером зі станом, а не регуляркою
 * `<button[^>]*>`: у Svelte досить одного `onclick={() => close()}`, і `[^>]*`
 * спиняється на стрілці — кнопка стає для перевірки НЕВИДИМОЮ
 * (AI-AGENT-PITFALLS § 1.1). Той самий сканер і з тієї ж причини стоїть у
 * `close-button-conventions.test.ts`; спільного модуля для них немає навмисно —
 * файл, який імпортують лише перевірки, недосяжний із маршруту й валить
 * `module-reachability.test.ts`.
 */
type Tag = { file: string; tag: string; start: number; end: number };

function buttonTags(file: string, text: string): Tag[] {
	const tags: Tag[] = [];
	for (const m of text.matchAll(/<button(?=[\s/>])/g)) {
		let i = m.index + m[0].length;
		let quote: string | null = null;
		let depth = 0;
		for (; i < text.length; i++) {
			const ch = text[i];
			if (quote) {
				if (ch === quote) quote = null;
				continue;
			}
			if (ch === '"' || ch === "'" || ch === "`") quote = ch;
			else if (ch === "{") depth++;
			else if (ch === "}") depth--;
			else if (ch === ">" && depth === 0) break;
		}
		tags.push({
			file,
			tag: text.slice(m.index, i + 1),
			start: m.index,
			end: i + 1,
		});
	}
	return tags;
}

/** Вміст кнопки до найближчого `</button>`. Вкладених `<button>` у HTML не буває. */
function bodyOf(text: string, tag: Tag): string {
	const close = text.indexOf("</button>", tag.end);
	return close === -1 ? "" : text.slice(tag.end, close);
}

/**
 * Керуючі блоки Svelte (`{#if}`, `{:else}`, `{/each}`, `{@render …}`) тексту
 * НЕ дають — прибираємо їх окремо від виразів. Інакше кнопка зі значком у
 * двох гілках `{#if}` рахувалася б «кнопкою з написом» і випадала з перевірки
 * саме там, де дефект найімовірніший.
 *
 * Виняток — `{@render …}`: сніпет може намалювати що завгодно, включно з
 * написом, тож кнопка з ним не судиться зовсім (див. `RENDERS_SNIPPET`).
 */
const CONTROL_BLOCK = /\{[#:/][^}]*\}/g;

/** Видимий напис: усе, що лишилося після зняття тегів, керуючих блоків і виразів. */
function visibleText(body: string): string {
	return body
		.replace(/<[^>]*>/g, " ")
		.replace(CONTROL_BLOCK, " ")
		.replace(/\{[^}]*\}/g, " ")
		.replace(/&[a-z]+;|&#\d+;/gi, " ")
		.trim();
}

/** Вираз у тілі кнопки може віддати текст — `{count}`, `{$_("…")}`, `{label}`. */
function hasExpression(body: string): boolean {
	return /\{[^}]*\}/.test(
		body.replace(/<[^>]*>/g, " ").replace(CONTROL_BLOCK, " "),
	);
}

const RENDERS_SNIPPET = /\{@render\b/;

/** Значок: компонент `lucide-svelte`, вбудований `<svg>` або зображення. */
const HAS_ICON = /<[A-Z][\w.]*[\s/>]|<svg\b|<img\b/;

/** Доступне ім'я, задане атрибутом самої кнопки. */
const NAMED_BY_ATTR = /\s(aria-label|aria-labelledby|title)=/;

type Button = { file: string; tag: string; body: string; line: number };

const buttons: Button[] = [];
for (const file of SVELTE) {
	// script і style прибираються: рядок `<button` у коментарі чи в CSS —
	// не розмітка.
	const raw = readFileSync(file, "utf8");
	const text = raw
		.replace(/<script[\s\S]*?<\/script>/g, (m) => " ".repeat(m.length))
		.replace(/<style[\s\S]*?<\/style>/g, (m) => " ".repeat(m.length));
	for (const tag of buttonTags(file, text)) {
		buttons.push({
			file,
			tag: tag.tag,
			body: bodyOf(text, tag),
			line: text.slice(0, tag.start).split("\n").length,
		});
	}
}

/** Кнопки, у яких видимого напису немає, а значок є. Саме їм потрібне ім'я. */
const iconOnly = buttons.filter(
	(b) =>
		HAS_ICON.test(b.body) &&
		!visibleText(b.body) &&
		!hasExpression(b.body) &&
		!RENDERS_SNIPPET.test(b.body),
);

describe("значкова кнопка має доступне ім'я (A11Y-STATIC-ICON-LABEL, HIGH)", () => {
	it("перевірка жива: кнопки й значкові кнопки знайдено", () => {
		// Порожній перелік дав би «жодного порушення» на будь-якому коді.
		expect(SVELTE.length).toBeGreaterThan(10);
		expect(
			buttons.length,
			"жодного <button> не знайдено — сканер зламався",
		).toBeGreaterThan(50);
		expect(
			iconOnly.length,
			"жодної значкової кнопки не знайдено — перевіряти нема що",
		).toBeGreaterThan(5);
	});

	it("розбір відрізняє напис від значка", () => {
		// Зворотний експеримент, вбудований у гейт: якщо `visibleText` почне
		// вважати написом розмітку або керуючий блок, обидва боки цієї пари
		// зійдуться — і перевірка мовчки перестане дивитися на кнопки з написом.
		expect(visibleText("<Icon size={16} />")).toBe("");
		expect(visibleText("{#if a}<X />{:else}<Y />{/if}")).toBe("");
		expect(visibleText("<Icon /> Зберегти")).toBe("Зберегти");
		expect(hasExpression("<Icon size={16} />")).toBe(false);
		expect(hasExpression("{count}")).toBe(true);
	});

	it("кожна значкова кнопка названа — у будь-якій гілці розмітки", () => {
		const bad = iconOnly
			.filter((b) => !NAMED_BY_ATTR.test(b.tag))
			.map(
				(b) =>
					`${b.file}:${b.line} — ${b.tag.replace(/\s+/g, " ").slice(0, 90)}`,
			);

		expect(
			bad,
			"кнопка зі значком і без aria-label / aria-labelledby / title: диктор " +
				"озвучує її як «кнопка», без жодної згадки про дію. axe цього не " +
				"побачить — ці кнопки живуть у гілках, куди page.goto() не заходить:\n  " +
				bad.join("\n  "),
		).toEqual([]);
	});
});
