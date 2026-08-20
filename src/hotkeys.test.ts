// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Гарячі клавіші — інваріанти по джерелах (HOTKEYS-v8 § 6, гейт GATE-HOTKEYS).
 *
 * Юніт-тести на самі захисти вже є — `services/keyboard.test.ts` і
 * `services/keySequence.test.ts` перевіряють `isTypingTarget`, `isPlainKey`,
 * `acceptsShortcut` і всі чотири обмеження серії натискань. Чого вони не
 * бачать: чи хтось ними КОРИСТУЄТЬСЯ. Новий обробник на вікні, написаний без
 * `acceptsShortcut`, проходить і lint, і `svelte-check`, і всі наявні тести —
 * рівно так у сусідніх проєктах і з'явилася панель мов, у полі пошуку якої
 * літера `t` закриває саму панель (§ вступ).
 *
 * Тому цей файл дивиться не на функції, а на місця виклику.
 */

const ROOT = process.cwd().replace(/\\/g, "/");

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

const sources = walk(join(ROOT, "src"))
	.filter((f) => /\.(ts|svelte)$/.test(f))
	.filter((f) => !/\.(test|spec)\.ts$/.test(f));

const short = (file: string) => file.slice(ROOT.length + 1);
/** Коментарі відрізаються: цей файл і `keyboard.ts` цитують заборонені форми. */
const code = (file: string) =>
	readFileSync(file, "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/^[ \t]*\/\/.*$/gm, "");

/** Обробники, повішені на ВІКНО або документ, — саме вони перехоплюють набір тексту. */
const GLOBAL_HANDLER =
	/<svelte:window[^>]*\bonkey(?:down|up|press)=|<svelte:document[^>]*\bonkey(?:down|up|press)=|(?:window|document)\s*\.\s*addEventListener\s*\(\s*["'`]key(?:down|up|press)/;

const globalHandlers = sources.filter((f) => GLOBAL_HANDLER.test(code(f)));

describe("гарячі клавіші", () => {
	it("перевірка жива: обробники на вікні знайдено", () => {
		expect(
			globalHandlers.length,
			"жодного глобального обробника — сканер шукає не там, і решта перевірок нічого не доводить"
		).toBeGreaterThan(0);
	});

	/**
	 * CRITICAL (HK-TEXT-ENTRY-GUARD). Обробник на вікні мусить виходити, коли
	 * фокус у полі вводу — інакше набір тексту виконує команди застосунку.
	 *
	 * Захистом вважається `acceptsShortcut`/`isTypingTarget` (спільний модуль),
	 * `isContentEditable`, `closest` по полях — або делегування в
	 * `createKeySequence`, у якому та сама перевірка стоїть усередині й покрита
	 * власними тестами.
	 */
	it("кожен обробник на вікні захищений від набору тексту (CRITICAL)", () => {
		/*
		 * Захист мусить бути ВИКЛИКАНИЙ, а не згаданий. Перша редакція шукала
		 * саме ім'я — і збігалася з рядком `import { acceptsShortcut }`, тобто
		 * прибраний виклик лишав перевірку зеленою, доки імпорт стояв на місці.
		 * Знайдено реверс-експериментом: прибраний `if (!acceptsShortcut(event))`
		 * у `BottomBar` давав 8 passed.
		 */
		const GUARD =
			/(?:acceptsShortcut|isTypingTarget|createKeySequence)\s*\(|\.isContentEditable\b|closest\(\s*["'`][^"'`]*(?:textarea|input)/i;

		/*
		 * `Escape` — єдиний законний виняток (§ 2.2). Її неможливо набрати в
		 * полі: вона не друкує символ, тож обробник, який реагує ЛИШЕ на неї,
		 * захисту не потребує — а панель, відкриту клавішею, закрити більше
		 * нічим. Виняток вузький навмисно: `Enter`, `Space` і стрілки в полі
		 * мають власне значення, тож на них він не поширюється.
		 */
		const onlyEscape = (text: string) => {
			const keys = [...text.matchAll(/\.(?:key|code)\s*===\s*["'`]([^"'`]+)["'`]/g)].map(
				(m) => m[1]
			);
			return keys.length > 0 && keys.every((k) => k === "Escape" || k === "Esc");
		};

		const unguarded = globalHandlers.filter((f) => {
			const text = code(f);
			return !GUARD.test(text) && !onlyEscape(text);
		});
		expect(
			unguarded.map(short),
			`клавіші перехоплюються в полях вводу — набір тексту виконуватиме команди:\n${unguarded
				.map(short)
				.join("\n")}`
		).toEqual([]);
	});

	/**
	 * HIGH (HK-EVENT-CODE). Літерні скорочення читаються з `event.code`.
	 * На українській розкладці `KeyT` віддає `key === "е"` — скорочення просто
	 * зникає, і саме для цієї мови застосунок і зроблений.
	 *
	 * Іменовані клавіші (`Escape`, `Enter`, `ArrowLeft`) через `key` — законно:
	 * вони не залежать від розкладки. Тому шукаються рівно ОДНОСИМВОЛЬНІ
	 * порівняння.
	 */
	it("літерні скорочення не залежать від розкладки (HIGH)", () => {
		const bad: string[] = [];
		for (const file of sources) {
			for (const m of code(file).matchAll(/\.key\s*===\s*["'`](\p{L})["'`]/gu)) {
				bad.push(`${short(file)}: .key === "${m[1]}"`);
			}
		}
		expect(bad, `скорочення за символом, а не за клавішею:\n${bad.join("\n")}`).toEqual([]);
	});

	/**
	 * HIGH (HK-HANDLER-GUARDS, § 2.4). `preventDefault()` лише ПІСЛЯ того, як
	 * дія відбулася: викликаний першим рядком, він відбирає типову поведінку
	 * браузера й у тих випадках, коли застосунок нічого не зробив.
	 */
	it("preventDefault не стоїть першим рядком обробника (HIGH)", () => {
		const bad: string[] = [];
		for (const file of globalHandlers) {
			const text = code(file);
			for (const m of text.matchAll(
				/function\s+\w*[Kk]ey\w*\s*\([^)]*\)\s*\{([\s\S]{0,120})/g
			)) {
				if (/^\s*event\s*\.\s*preventDefault\s*\(/.test(m[1])) {
					bad.push(short(file));
				}
			}
		}
		expect(bad, `preventDefault до дії:\n${bad.join("\n")}`).toEqual([]);
	});

	/**
	 * MEDIUM (HK-CANONICAL-MAP). Літера означає те саме, що в каноні: `T` —
	 * тема, `L` — мова. Розбіжність між сусідніми проєктами того самого автора —
	 * не педантизм: `T` уже означав тему в одному й мову в іншому.
	 */
	it("літери означають те саме, що в канонічній карті (MEDIUM)", () => {
		const CANON: Array<[string, RegExp, string]> = [
			["KeyT", /theme|тема/i, "тема"],
			["KeyL", /lang|мов/i, "мова"],
			["KeyM", /sound|audio|mute|звук/i, "звук"],
		];
		const problems: string[] = [];

		for (const file of globalHandlers) {
			const text = code(file);
			for (const [key, expected, what] of CANON) {
				const at = text.indexOf(key);
				if (at < 0) continue; // клавіша не використана — це нормально
				const branch = text.slice(at, at + 300);
				if (!expected.test(branch)) problems.push(`${short(file)}: ${key} робить не «${what}»`);
			}
		}
		expect(problems, problems.join("\n")).toEqual([]);
	});

	/**
	 * MEDIUM (HK-SERVICE-GESTURES). `V` і `R` зарезервовані під СЕРІЇ натискань
	 * (табло версії та аварійне скидання). Одиночна дія на них означає, що
	 * службовий жест перестав працювати — і дізнаються про це тоді, коли він
	 * знадобиться.
	 */
	it("V і R зайняті лише службовими жестами (MEDIUM)", () => {
		const problems: string[] = [];
		for (const file of globalHandlers) {
			const text = code(file);
			for (const key of ["KeyV", "KeyR"]) {
				const at = text.indexOf(key);
				if (at < 0) continue;
				const around = text.slice(Math.max(0, at - 300), at + 300);
				if (!/createKeySequence|Sequence/.test(around)) {
					problems.push(`${short(file)}: ${key} поза серією натискань`);
				}
			}
		}
		expect(problems, problems.join("\n")).toEqual([]);
	});

	/**
	 * CRITICAL (HK-WCAG-CHARACTER-KEY). Одиночне літерне скорочення мусить мати
	 * спосіб вимкнути, перепризначити або діяти лише у фокусі — і обраний шлях
	 * записаний у `PROJECT-CONTEXT.md`.
	 *
	 * Тут перевіряються обидві половини: і механізм у коді, і запис у документі.
	 * Механізм без запису наступний агент не знайде, а запис без механізму — це
	 * просто неправда в документі.
	 */
	it("одиночні літери можна вимкнути, і шлях записано (CRITICAL)", () => {
		const layout = code(join(ROOT, "src/routes/+layout.svelte"));
		expect(
			/enableHotkeys/.test(layout),
			"обробник не звіряється з прапорцем — вимкнути скорочення нічим"
		).toBe(true);

		const schemas = readFileSync(join(ROOT, "src/lib/data/schemas.ts"), "utf8");
		expect(
			/enableHotkeys:\s*z\.boolean\(\)/.test(schemas),
			"прапорця немає в схемі налаштувань — він не зберігається"
		).toBe(true);

		const about = readFileSync(join(ROOT, "src/lib/components/settings/AboutModal.svelte"), "utf8");
		expect(
			/about-hotkeys-toggle-btn/.test(about),
			"перемикача немає в UI — «спосіб вимкнути» недосяжний для користувача"
		).toBe(true);

		const context = readFileSync(join(ROOT, "PROJECT-CONTEXT.md"), "utf8");
		expect(
			/2\.1\.4/.test(context),
			"обраний шлях WCAG SC 2.1.4 не записаний — наступний агент почне з нуля"
		).toBe(true);
	});

	/**
	 * MEDIUM (HK-DISCOVERABILITY). Скорочення, про яке ніде не написано, існує
	 * лише для автора. Досить одного з трьох; тут узято два — `aria-keyshortcuts`
	 * на кнопках меню й перелік у «Про проєкт».
	 */
	it("скорочення виявні: aria-keyshortcuts на кнопках дії (MEDIUM)", () => {
		const declared = new Set<string>();
		for (const file of sources.filter((f) => f.endsWith(".svelte"))) {
			for (const m of readFileSync(file, "utf8").matchAll(/aria-keyshortcuts="([^"]+)"/g)) {
				declared.add(m[1]);
			}
		}
		expect(
			[...declared].sort(),
			"скорочення T і L мусять бути оголошені для читалки"
		).toEqual(["L", "T"]);
	});
});
