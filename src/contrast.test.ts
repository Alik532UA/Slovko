// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Контраст тексту й тла в КОЖНІЙ із чотирьох тем (ACCESSIBILITY-v8 § 10.1,
 * UI-UX-v8 `UIUX-LIGHT-DARK-WHOLE-PAIR`).
 *
 * ## Навіщо ще одна перевірка поруч із axe
 *
 * `a11y.spec.ts` міряє контраст у браузері — і бачить рівно ту тему, що
 * активна під час прогону (типово `dark-gray`), і рівно той стан, що
 * намальований одразу після переходу. Тобто три чверті палітри проєкту axe не
 * бачить у принципі, а `:hover` не розкриває взагалі. Це не здогад: у
 * `PROJECT-CONTEXT.md` рядок «контраст тем» стояв у таблиці «що не
 * перевіряється автоматично» з планом перенести цю перевірку — вона й
 * переноситься.
 *
 * ## Чому по джерелах, а не в браузері
 *
 * Спроба зробити те саме через Playwright у сусідньому проєкті дала два набори
 * хибних дефектів: напівпрозорі шари склеювалися в порядку, якого немає, а
 * частина елементів мала `opacity: 0` у момент заміру. Тут немає ні
 * прозорості, ні порядку шарів: беруться пари «тло+текст», обидва боки яких —
 * токени тем, і граф `var()` розв'язується арифметично.
 *
 * ## Що ця перевірка НЕ покриває — і це сказано числом
 *
 * Напівпрозоре тло (`rgba` з альфою, `--glass-bg`), `color-mix`, градієнти,
 * тло-картинки, а також текст, що успадковує колір від батька або лежить на
 * тлі, заданому в іншому компоненті. Для них потрібен рантайм. Кількість таких
 * випадків друкується у звіті поруч із кількістю перевірених пар — мовчання
 * тут читалося б як «таких випадків немає».
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): поставити в будь-якому
 * компоненті `color: var(--bg-secondary)` поруч із `background:
 * var(--bg-secondary)` — перевірка мусить назвати цей селектор із
 * коефіцієнтом 1.00 у всіх чотирьох темах.
 */

const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3;

/**
 * Теми проєкту. Порядок — як у `app.css`.
 *
 * `light-gray` і `dark-gray` — це ОДИН блок оголошень із `light-dark(світле,
 * темне)`; різницю робить `pickLightDark()` нижче, а не окремий блок.
 */
const THEMES = ["light-gray", "dark-gray", "orange", "green"] as const;
type Theme = (typeof THEMES)[number];

/**
 * Схема, за якою браузер обирає аргумент `light-dark()`.
 *
 * Узято не з назв, а з `app.css`: там `html[data-theme="dark-gray"],
 * html[data-theme="orange"] { color-scheme: dark }` і
 * `html[data-theme="light-gray"], html[data-theme="green"] { color-scheme:
 * light }`. Зв'язок «orange → темна схема» неочевидний саме тому й винесений
 * у видиму карту.
 */
const THEME_SCHEME: Record<Theme, "light" | "dark"> = {
	"light-gray": "light",
	"dark-gray": "dark",
	orange: "dark",
	green: "light",
};

/**
 * Пари «текст на тлі», що НЕ дотягують до AA, — з виміряним числом і причиною.
 *
 * Одиниця тут — пара кольорів, а не селектор, і це головне рішення цього
 * файлу. Заміряно 2026-09-02: 193 місця, але **162 з них — одна й та сама
 * пара** «білий текст на акценті» у чотирьох темах. Перелік із 193 рядків
 * читався б як 193 дефекти, тоді як рішення тут одне, і воно про айдентику:
 * акцент цього проєкту — помаранчевий `#e95420` (і `#059669` у зеленій темі),
 * білий текст на ньому дає 3,65 і 3,77 при потрібних 4,5. Зробити пару
 * прохідною означає перефарбувати кожну головну кнопку застосунку —
 * це рішення власника продукту, а не аудиту, і воно записане боргом у
 * `PROJECT-CONTEXT.md`.
 *
 * Правило супроводу те саме, що в базі axe: перелік пар звіряється НА
 * РІВНІСТЬ (нова пара валить прогін навіть якщо стара тим часом зникла), а
 * кількість місць може лише спадати.
 *
 * Кожне поле під гейтом, і це навмисно: таблиця, у якій числа не звіряються,
 * старіє мовчки. `ratio` — найгірше значення саме цієї пари, звіряється до
 * сотих; `places` — скільки правил CSS × тем її дають, і рядок не має права
 * ЗАНИЖУВАТИ це число; `why` мусить бути написане словами. Сума `places`
 * дорівнює `KNOWN_TOTAL`, тож зникла пара змушує перерахувати й стелю.
 */
const KNOWN_PAIRS: {
	pair: string;
	ratio: number;
	places: number;
	why: string;
}[] = [
	{
		pair: "#ffffff on #e95420",
		ratio: 3.65,
		places: 120,
		why: "фірмовий помаранчевий на кожній головній кнопці, три теми з чотирьох. Рішення про айдентику",
	},
	{
		pair: "#ffffff on #059669",
		ratio: 3.77,
		places: 42,
		why: "те саме в темі `green`: акцент теми — власний зелений",
	},
	{
		pair: "#059669 on #dcfce7",
		ratio: 3.43,
		places: 5,
		why: "зелений текст на світло-зеленому: мітка «взаємно» й активні перемикачі в темі `green`",
	},
	{
		pair: "#ffffff on #4a9fe6",
		ratio: 2.84,
		places: 4,
		why: "`.wave-btn:hover` — блакитний вписаний числом повз токени, тобто однаковий у всіх темах",
	},
	{
		pair: "#16a34a on #dcfce7",
		ratio: 3.0,
		places: 3,
		why: "той самий випадок, що `#059669 on #dcfce7`, у світлій темі",
	},
	{
		pair: "#ffffff on #2ecc71",
		ratio: 2.1,
		places: 2,
		why: "`.skip-all-btn` на `--status-success` теми `orange` — найгірша пара проєкту",
	},
	{
		pair: "#ffffff on #22c55e",
		ratio: 2.28,
		places: 2,
		why: "та сама кнопка в темі `dark-gray`",
	},
	{
		pair: "#ffffff on #16a34a",
		ratio: 3.3,
		places: 2,
		why: "та сама кнопка у світлій темі",
	},
	{
		pair: "#e95420 on #77216f",
		ratio: 2.58,
		places: 2,
		why: "акцент на пурпуровому `--selected-bg` теми `orange`",
	},
	{
		pair: "#eaeaea on #e95420",
		ratio: 3.03,
		places: 1,
		why: "`::selection` у темі `dark-gray`",
	},
	{
		pair: "#1f2937 on #e95420",
		ratio: 4.02,
		places: 1,
		why: "`::selection` у світлій темі",
	},
	{
		pair: "#064e3b on #059669",
		ratio: 2.58,
		places: 1,
		why: "`::selection` у темі `green`",
	},
	{
		pair: "#e95420 on #ffffff",
		ratio: 3.65,
		places: 1,
		why: "`.icon-btn.active` у темі `orange`: та сама пара, що й перша, тільки навпаки",
	},
	{
		pair: "#a0a0a0 on #43464e",
		ratio: 3.61,
		places: 4,
		why: "`--text-secondary` на картці в темній темі — саме її бачить і axe у трьох станах",
	},
	{
		pair: "#a0a0a0 on #565a63",
		ratio: 2.64,
		places: 1,
		why: "`--text-secondary` на `--border`: `.icon-action-btn.cancel:hover`",
	},
	{
		pair: "#dc2626 on #fee2e2",
		ratio: 3.95,
		places: 1,
		why: "`.action-btn.unfollow:hover` у світлій темі",
	},
	{
		pair: "#b91c1c on #fecaca",
		ratio: 4.47,
		places: 1,
		why: "та сама кнопка в темі `green`; не дотягує трьох сотих",
	},
];

/**
 * Сума `places`. Може лише СПАДАТИ — і опускається тим самим комітом, яким
 * пару виправили.
 */
const KNOWN_TOTAL = 193;

type Decl = {
	color?: string;
	background?: string;
	fontSize?: string;
	fontWeight?: string;
};

/**
 * Дві константи, а не одна. Регулярка з прапорцем `g` зберігає `lastIndex` між
 * викликами `.test()`, тож одна й та сама на перевірку і на заміну давала б то
 * `true`, то `false` на однакових селекторах — і базовий стан збирався б із
 * правил `:hover`.
 */
const IS_STATE = /:hover|:focus-visible|:focus|:active/;
const STRIP_STATE = /:hover|:focus-visible|:focus|:active/g;

const SKIP_DIRS = new Set(["data", "translations"]);

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(svelte|css)$/.test(entry)) out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

/**
 * Текст БЕЗ коментарів.
 *
 * Прибирати обов'язково, і не з косметичних причин: коментарі в `app.css`
 * описують токени, тобто містять рядки виду `--text-secondary:`. Без цього
 * кроку регулярка оголошень бачить коментар як справжнє оголошення й тягне
 * значення до наступної `;` у файлі — токен стає нерозв'язним, пара
 * рахується «непокритою», і перевірка МОВЧКИ пропускає саме те, що шукала.
 */
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** `<style>` компонента. Розмітка тут не потрібна. */
const styleBlock = (source: string) =>
	source.match(/<style[^>]*>([\s\S]*)<\/style>/)?.[1] ?? "";

const value = (raw: string) => raw.replace(/!important/g, "").trim();

/**
 * Плоскі правила `селектор { … }`.
 *
 * Блоки `@media`/`@supports`/`@keyframes` пропускаються цілком: усередині них
 * ті самі пари «тло+текст», а нам потрібні саме пари, не каскад. У цьому
 * проєкті всередині медіазапитів палітри немає — там розміри й відступи.
 */
function rules(css: string): { selector: string; decl: Decl }[] {
	const out: { selector: string; decl: Decl }[] = [];
	const clean = withoutComments(css);
	for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const selector = m[1].trim().replace(/\s+/g, " ");
		if (!selector || selector.startsWith("@") || selector.startsWith("%"))
			continue;
		const decl: Decl = {};
		for (const d of m[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);?/g)) {
			const prop = d[1];
			if (prop === "color") decl.color = value(d[2]);
			else if (prop === "background" || prop === "background-color")
				decl.background = value(d[2]);
			else if (prop === "font-size") decl.fontSize = value(d[2]);
			else if (prop === "font-weight") decl.fontWeight = value(d[2]);
		}
		if (decl.color || decl.background) out.push({ selector, decl });
	}
	return out;
}

type Rgb = [number, number, number];

/**
 * `transparent` тут НЕ колір і не чорний.
 *
 * Прочитаний як `[0, 0, 0]`, він робить `background: transparent` «чорним
 * тлом», і будь-який темний текст на ньому стає «нечитним» — у сусідньому
 * проєкті це дало близько двадцяти хибних дефектів. Насправді він означає «те,
 * що під ним», а це статично невідомо: отже НЕПОКРИТО, а не дефект.
 */
const NAMED: Record<string, Rgb> = {
	white: [255, 255, 255],
	black: [0, 0, 0],
};

/** `#abc`, `#aabbcc`, `rgb(...)`, `white`. Інше — `null`. */
function parseColor(raw: string): Rgb | null {
	const v = raw.trim().toLowerCase();
	if (v in NAMED) return NAMED[v];
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
	if (hex) {
		const h = hex[1];
		const full =
			h.length === 3
				? h
						.split("")
						.map((c) => c + c)
						.join("")
				: h;
		return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
	}
	const rgb = /^rgba?\(([^)]+)\)$/.exec(v);
	if (rgb) {
		const parts = rgb[1]
			.split(/[\s,/]+/)
			.filter(Boolean)
			.map(Number);
		// Напівпрозоре не розв'язується без знання того, що під ним.
		if (parts.length >= 4 && parts[3] < 0.999) return null;
		if (parts.slice(0, 3).some(Number.isNaN)) return null;
		return parts.slice(0, 3) as Rgb;
	}
	return null;
}

/**
 * `light-dark(A, B)` → `A` для світлої схеми, `B` для темної.
 *
 * Кома тут НЕ розділювач: аргументом буває `rgba(var(--accent-rgb), 0.15)`,
 * тобто сам містить коми. Ділиться підрахунком дужок — `split(",")` обірвав би
 * перший аргумент на `rgba(var(--accent-rgb)`, той не розібрався б як колір, і
 * пара мовчки стала б «непокритою».
 */
function pickLightDark(raw: string, theme: Theme): string {
	const v = raw.trim();
	if (v.toLowerCase().indexOf("light-dark(") !== 0) return v;

	let depth = 0;
	const args: string[] = [];
	let current = "";
	for (let i = "light-dark(".length - 1; i < v.length; i += 1) {
		const ch = v[i];
		if (ch === "(") {
			depth += 1;
			if (depth === 1) continue;
		} else if (ch === ")") {
			depth -= 1;
			if (depth === 0) {
				args.push(current);
				break;
			}
		} else if (ch === "," && depth === 1) {
			args.push(current);
			current = "";
			continue;
		}
		current += ch;
	}
	if (args.length !== 2) return v;
	return (THEME_SCHEME[theme] === "light" ? args[0] : args[1]).trim();
}

/**
 * Розв'язувач токенів: ім'я змінної + тема → конкретний колір.
 *
 * Джерела беруться з `app.css` по СЕЛЕКТОРАХ, а не по іменах файлів: уся
 * палітра проєкту лежить в одному файлі. Для теми беруться всі блоки, чий
 * список селекторів містить `:root` (база й аліаси сумісності) або
 * `[data-theme="<тема>"]`, у порядку появи — пізніший перекриває раніший, як
 * це робить каскад при однаковій вазі.
 */
class TokenResolver {
	private readonly perTheme = new Map<Theme, Map<string, string>>();

	constructor(css: string) {
		const clean = withoutComments(css);
		const blocks: { selectors: string[]; body: string }[] = [];
		for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
			const selectors = m[1]
				.trim()
				.split(",")
				.map((s) => s.trim());
			if (selectors.some((s) => s.startsWith("@"))) continue;
			blocks.push({ selectors, body: m[2] });
		}

		for (const theme of THEMES) {
			const merged = new Map<string, string>();
			for (const { selectors, body } of blocks) {
				const applies = selectors.some(
					(s) =>
						/(^|[^-\w])?:root$/.test(s) ||
						s.includes(`[data-theme="${theme}"]`),
				);
				if (!applies) continue;
				for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
					merged.set(d[1], d[2].trim());
				}
			}
			this.perTheme.set(theme, merged);
		}
	}

	raw(name: string, theme: Theme): string | undefined {
		return this.perTheme.get(theme)?.get(name);
	}

	/** Токен → колір у межах теми. `null` = «не колір або не розв'язується». */
	resolve(name: string, theme: Theme, depth = 0): Rgb | null {
		if (depth > 10) return null;
		const raw = this.raw(name, theme);
		if (raw === undefined) return null;
		return this.resolveValue(raw, theme, depth);
	}

	/** Те саме для довільного значення властивості, а не лише для токена. */
	resolveValue(raw: string, theme: Theme, depth = 0): Rgb | null {
		if (depth > 10) return null;
		// `light-dark()` знімається ПЕРЕД усім іншим: усередині нього стоїть і
		// `var()`, і літерал — тобто те, що розбирає решта методу.
		const v = pickLightDark(raw, theme);
		const direct = parseColor(v);
		if (direct) return direct;
		const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(v);
		if (!m) return null;
		const resolved = this.resolve(m[1], theme, depth + 1);
		if (resolved) return resolved;
		return m[2] ? this.resolveValue(m[2], theme, depth + 1) : null;
	}
}

/** Відносна яскравість за WCAG 2.x. */
function luminance([r, g, b]: Rgb): number {
	const f = (v: number) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Коефіцієнт контрасту за WCAG 2.x, від 1 до 21. */
function contrast(a: Rgb, b: Rgb): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** Великий текст за WCAG: ≥24px, або ≥18.66px і жирний. */
function isLarge(decl: Decl): boolean {
	const size = decl.fontSize;
	if (!size) return false;
	const rem = /^([\d.]+)rem$/.exec(size);
	const px = /^([\d.]+)px$/.exec(size);
	const parsed = rem ? parseFloat(rem[1]) * 16 : px ? parseFloat(px[1]) : NaN;
	if (Number.isNaN(parsed)) return false;
	const bold = (parseInt(decl.fontWeight ?? "400", 10) || 400) >= 700;
	return parsed >= 24 || (parsed >= 18.66 && bold);
}

type Finding = {
	file: string;
	selector: string;
	state: string;
	theme: Theme;
	ratio: number;
	need: number;
	fg: Rgb;
	bg: Rgb;
};

const APP_CSS = "src/app.css";
const resolver = new TokenResolver(readFileSync(APP_CSS, "utf8"));
const files = walk("src");

let pairsChecked = 0;
let uncovered = 0;
const findings: Finding[] = [];

for (const file of files) {
	const source = readFileSync(file, "utf8");
	const css = file.endsWith(".css") ? source : styleBlock(source);
	if (!css) continue;

	const parsed = rules(css);
	// Базовий стан селектора: те саме без `:hover`/`:focus`/`:active`.
	const base = new Map<string, Decl>();
	for (const { selector, decl } of parsed) {
		if (IS_STATE.test(selector)) continue;
		base.set(selector, { ...(base.get(selector) ?? {}), ...decl });
	}

	for (const { selector, decl } of parsed) {
		const isState = IS_STATE.test(selector);
		const root = selector.replace(STRIP_STATE, "").trim();
		const effective: Decl = { ...(base.get(root) ?? {}), ...decl };

		// Пара має сенс лише коли ВІДОМІ обидва боки. Текст без тла — це
		// успадкування, а воно статично не розв'язується.
		if (!effective.color || !effective.background) {
			uncovered += 1;
			continue;
		}

		const need = isLarge(effective) ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
		for (const theme of THEMES) {
			const fg = resolver.resolveValue(effective.color, theme);
			const bg = resolver.resolveValue(effective.background, theme);
			if (!fg || !bg) {
				uncovered += 1;
				continue;
			}
			pairsChecked += 1;
			const ratio = contrast(fg, bg);
			if (ratio >= need) continue;

			findings.push({
				file,
				selector,
				state: isState ? "наведення/фокус" : "спокій",
				theme,
				ratio,
				need,
				fg,
				bg,
			});
		}
	}
}

const hex = (c: Rgb) =>
	"#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

/** Повний звіт — у повідомленні про падіння, а не в консолі при зеленому. */
const report = () =>
	[...findings]
		.sort((a, b) => a.ratio - b.ratio)
		.map(
			(f) =>
				`${f.ratio.toFixed(2)}:1 (треба ${f.need})  ${f.theme}/${f.state}  ${f.file}\n` +
				`      ${f.selector}  текст ${hex(f.fg)} на ${hex(f.bg)}`,
		)
		.join("\n");

describe("контраст тексту й тла в чотирьох темах", () => {
	it("перевірка жива: файли й пари знайдено", () => {
		expect(files.length, "сканер не знайшов стилів").toBeGreaterThan(40);
		// Число не з голови: стільки пар «тло+текст» розв'язується в токени.
		expect(
			pairsChecked,
			"жодної розв'язаної пари — резолвер мертвий",
		).toBeGreaterThan(200);
	});

	it("граф токенів розв'язується в кожній темі", () => {
		// Канарка на сам розв'язувач: якщо селектори блоків у `app.css`
		// зміняться, він почне повертати `null` на всьому — і перевірка вище
		// стане зеленою на нулі знахідок.
		for (const theme of THEMES) {
			// `--card-bg`, а не `--bg-secondary`: остання в темі `orange`
			// напівпрозора (`rgba(255,255,255,0.1)`), і `null` для неї —
			// правильна відповідь, а не збій розв'язувача.
			expect(resolver.resolve("--card-bg", theme), theme).not.toBeNull();
			expect(resolver.resolve("--text-primary", theme), theme).not.toBeNull();
			expect(resolver.resolve("--accent", theme), theme).not.toBeNull();
			// Аліас сумісності: він оголошений в іншому блоці `:root`, ніж
			// палітра, і мусить розв'язуватися крізь `var()` до теми.
			expect(resolver.resolve("--text-muted", theme), theme).not.toBeNull();
		}
	});

	it("`light-dark()` дає різні кольори світлій і темній парі", () => {
		// Без цього обидві теми пари читалися б як одна, і половина палітри
		// мовчки не перевірялася б.
		expect(resolver.resolve("--text-primary", "light-gray")).not.toEqual(
			resolver.resolve("--text-primary", "dark-gray"),
		);
	});

	it("числа й причини в KNOWN_PAIRS не застаріли", () => {
		/*
		 * Таблиця, у якій числа не звіряються, старіє мовчки й саме тоді, коли
		 * робота йде добре (AI-AGENT-PITFALLS-v8 § 5.5.1). Тому:
		 *
		 *   * `ratio` — чиста функція від двох кольорів, тож звіряється НА
		 *     РІВНІСТЬ до сотих: змінили відтінок — оновіть рядок;
		 *   * `places` — стеля: рядок не має права ЗАНИЖУВАТИ кількість місць,
		 *     інакше сума `KNOWN_TOTAL` виглядає меншою за дійсність;
		 *   * `why` — причина словами. Без неї перелік за пів року стане
		 *     місцем, куди зсипають незручне (той самий аргумент, що для
		 *     `RUNTIME_DECLARED` у `css-variables.test.ts`).
		 */
		const drift: string[] = [];
		for (const known of KNOWN_PAIRS) {
			const mine = findings.filter(
				(f) => `${hex(f.fg)} on ${hex(f.bg)}` === known.pair,
			);
			if (mine.length === 0) continue; // пара зникла — це ловить перевірка нижче
			const worst = Math.min(...mine.map((f) => f.ratio));
			if (Math.abs(worst - known.ratio) >= 0.005) {
				drift.push(
					`${known.pair}: записано ${known.ratio.toFixed(2)}, заміряно ${worst.toFixed(2)}`,
				);
			}
			if (mine.length > known.places) {
				drift.push(
					`${known.pair}: місць ${mine.length}, а записано ${known.places} — ` +
						"рядок занижує дійсність",
				);
			}
			if (known.why.length < 20)
				drift.push(`${known.pair}: причина не написана`);
		}
		expect(drift, drift.join("\n")).toEqual([]);
	});

	it("жодної НОВОЇ пари «текст на тлі» нижче AA", () => {
		const seen = [
			...new Set(findings.map((f) => `${hex(f.fg)} on ${hex(f.bg)}`)),
		].sort();
		const known = [...new Set(KNOWN_PAIRS.map((p) => p.pair))].sort();
		expect(
			seen,
			"перелік звіряється на РІВНІСТЬ: нова пара мусить упасти навіть тоді, коли " +
				`стара тим часом зникла.\n\n${report()}\n`,
		).toEqual(known);
	});

	it(`місць нижче AA не більше за ${KNOWN_TOTAL}`, () => {
		// Сума `places` мусить збігатися з переліком — інакше довідкові числа
		// в `KNOWN_PAIRS` розійдуться з гейтом, і читач звіту побачить
		// неправду (AI-AGENT-PITFALLS-v8 § 5.5).
		const declared = KNOWN_PAIRS.reduce((sum, p) => sum + p.places, 0);
		expect(declared, "сума places у KNOWN_PAIRS розійшлася з KNOWN_TOTAL").toBe(
			KNOWN_TOTAL,
		);
		expect(
			findings.length,
			`стеля може лише знижуватися; перевірено пар: ${pairsChecked}, ` +
				`непокрито (прозоре, градієнти, успадкування): ${uncovered}.\n\n${report()}\n`,
		).toBeLessThanOrEqual(KNOWN_TOTAL);
	});
});
