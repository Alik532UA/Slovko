// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Осиротілі модулі (PROJECT-STRUCTURE-v8 § 4.3).
 *
 * Правило, «якого у v7 не було і яке коштувало найдорожче»: файл, що існує,
 * читається як зроблена робота. У цьому проєкті воно спрацювало двічі. Спершу
 * знайшлися сім написаних і недосяжних файлів — їх прибрали руками, гейта не
 * додали. За два дні аудит знайшов ЩЕ ЧОТИРИ, зокрема
 * `services/firebase/types.ts` на 110 рядків, який описував схему `progress.words`
 * мапою — тобто ту, від якої база вже переїхала на шарди, — і оголошував
 * `SyncStatus` інтерфейсом там, де живий код оголошує його об'єднанням рядків.
 * Тобто осиротілий файл не просто лежав: він РОЗПОВІДАВ НЕПРАВДУ наступному
 * читачеві, і саме тому ручне прибирання без гейта не тримається.
 *
 * Що робить перевірка: будує дерево імпортів від точок входу SvelteKit і
 * вимагає, щоб кожен модуль у ньому опинився.
 *
 * Чого вона НЕ бачить: `import.meta.glob`. У проєкті всі такі виклики
 * (`wordService.ts`, `i18n/init.ts`) цілять у `*.json`, а перевірка ходить лише
 * по `.ts`/`.svelte`/`.js`, тож розбіжності немає. Щойно glob почне тягнути
 * модулі — цей коментар стане неправдою, і його треба буде переписати разом із
 * `resolveImport`.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Точки входу: те, що виконує сам фреймворк, а не інший модуль. */
const ENTRY_POINTS = [
	"src/app.d.ts",
	"src/hooks.client.ts",
	"src/hooks.server.ts",
	"src/hooks.ts",
	"src/service-worker.js",
];

const posix = (p: string) => p.split("\\").join("/");
const rel = (p: string) => posix(relative(ROOT, p));

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(ts|js|svelte)$/.test(entry)) out.push(posix(full));
	}
	return out;
}

const CANDIDATE_SUFFIXES = [
	"",
	".ts",
	".js",
	".svelte",
	".svelte.ts",
	"/index.ts",
	"/index.js",
	"/index.svelte.ts",
];

/** Специфікатор → файл на диску, або null для зовнішнього пакета. */
function resolveImport(fromFile: string, spec: string): string | null {
	let base: string | null = null;
	if (spec === "$lib") base = join(SRC, "lib");
	else if (spec.startsWith("$lib/")) base = join(SRC, "lib", spec.slice(5));
	else if (spec.startsWith("./") || spec.startsWith("../"))
		base = resolve(dirname(fromFile), spec);
	if (!base) return null;

	for (const suffix of CANDIDATE_SUFFIXES) {
		// Через posix(): walk() і resolveImport() мусять давати ОДНАКОВИЙ
		// рядок на той самий файл, інакше на Windows `…/errors\index.ts` і
		// `…/errors/index.ts` — два різні ключі, і модуль виглядає недосяжним.
		const candidate = posix(base + suffix);
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
	}
	return null;
}

const IMPORT_RE =
	/(?:from\s*|import\s*\(\s*|export\s+\*\s+from\s*)["']([^"']+)["']/g;

function importsOf(file: string): string[] {
	const text = readFileSync(file, "utf8");
	const out: string[] = [];
	for (const match of text.matchAll(IMPORT_RE)) {
		const resolved = resolveImport(file, match[1]);
		if (resolved) out.push(resolved);
	}
	return out;
}

const isCheck = (f: string) => /\.(test|spec)\.(ts|js)$/.test(f);

const allModules = walk(SRC).filter((f) => !isCheck(f));
const roots = allModules.filter(
	(f) => rel(f).startsWith("src/routes/") || ENTRY_POINTS.includes(rel(f)),
);

const reached = new Set<string>();
const stack = [...roots];
while (stack.length) {
	const file = stack.pop() as string;
	if (reached.has(file)) continue;
	reached.add(file);
	for (const dep of importsOf(file)) stack.push(dep);
}

describe("досяжність модулів (PROJECT-STRUCTURE-v8 § 4.3)", () => {
	it("перевірка жива: точки входу й модулі знайдено", () => {
		// Порожній перелік коренів дав би «жодного сироти» на будь-якому коді —
		// зелений результат, який нічого не доводить.
		expect(roots.length).toBeGreaterThan(0);
		expect(allModules.length).toBeGreaterThan(50);
		expect(reached.size).toBeGreaterThan(allModules.length / 2);
	});

	it("кожен модуль досяжний із маршруту або точки входу", () => {
		const orphans = allModules
			.filter((f) => !reached.has(f))
			.map(rel)
			.sort();
		expect(
			orphans,
			`недосяжні модулі — підключити або видалити, третього немає:\n${orphans.join("\n")}`,
		).toEqual([]);
	});
});

/**
 * Те саме правило для `static/` (PROJECT-STRUCTURE § 2.1, `PS-STATIC-ORPHANS`).
 *
 * `adapter-static` копіює вміст теки на хостинг ЦІЛКОМ і мовчки: файл, якого не
 * просить ніхто, не ламає нічого й не з'являється в жодному звіті — його просто
 * роздають назавжди. Перевірка модулів вище цього не бачить у принципі: у
 * `static/` немає імпортів, там є адреси.
 *
 * Перший прогін знайшов `svg/favicon.svg` — логотип Svelte із шаблону
 * `create-svelte`, який лежав тут із міграції структури й на який не
 * посилається ні `app.html`, ні маніфест, ні код. Файл видалено разом із
 * появою цієї перевірки.
 */
const STATIC_DIR = "static";

/**
 * Свій обхід, бо `walk()` вище лишає тільки `.ts`/`.js`/`.svelte`. У `static/`
 * таких файлів немає взагалі — з тим фільтром перелік вийшов би порожнім, а
 * перевірка зеленою на будь-якому вмісті теки.
 */
function walkAll(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walkAll(full, out);
		else out.push(posix(full));
	}
	return out;
}

/** Де взагалі можуть згадуватися адреси ресурсів. Двійкові файли не читаються. */
const REFERENCE_SOURCES = [
	// Саме `walkAll`, а не `walk`: половина адрес ресурсів живе в `app.html`,
	// який має розширення поза переліком модулів. З `walk` перевірка оголосила
	// б сиротами піктограми, значок і маніфест — усе, на що посилається шаблон.
	...walkAll(join(ROOT, "src")),
	...walkAll(join(ROOT, "scripts")),
	...walkAll(join(ROOT, "tests")),
	join(ROOT, "svelte.config.js"),
	join(ROOT, STATIC_DIR, "llms.txt"),
	join(ROOT, STATIC_DIR, "robots.txt"),
	join(ROOT, STATIC_DIR, "manifest.json"),
	join(ROOT, STATIC_DIR, "sitemap.xml"),
]
	.filter(
		(f) => existsSync(f) && !/\.(png|webp|jpg|jpeg|svg|ico|woff2?)$/i.test(f),
	)
	// Статичні гейти в `src/` називають файли В ПРОЗІ — цей серед них. Без
	// цього рядка згадка в коментарі рахувалася б посиланням, і перевірка
	// оголосила б `.nojekyll` живим саме тому, що пояснює, чому він мертвий.
	// `tests/` лишаються: e2e ходить по справжніх адресах.
	.filter((f) => !(rel(f).startsWith("src/") && isCheck(f)));

/**
 * `.nojekyll` — єдиний файл, який мусить лежати тут БЕЗ жодного посилання.
 *
 * Він і працює тим, що існує: GitHub Pages бачить його й вимикає обробку
 * Jekyll, інакше все, що починається з підкреслення (`_app/`), на хостингу не
 * віддається. Тобто це не борг, а вимога платформи — і саме тому вона названа
 * тут, а не мовчки виключена маскою.
 */
const KNOWN_UNREFERENCED = [".nojekyll"];

describe("сироти в static/ (PS-STATIC-ORPHANS, MEDIUM)", () => {
	const assets = walkAll(join(ROOT, STATIC_DIR)).map((f) =>
		rel(f).replace(`${STATIC_DIR}/`, ""),
	);
	const haystack = REFERENCE_SOURCES.map((f) => readFileSync(f, "utf8")).join(
		"\n",
	);

	/**
	 * Посилання буває трьох видів, і другий із них — причина, чому наївна
	 * перевірка тут дає хибну тривогу на восьми прапорцях: адреса складається
	 * під час рендеру (`{base}/svg/flags/{lang}.svg`), тож повного шляху в
	 * джерелах немає взагалі. Тека з інтерполяцією одразу після неї — це
	 * посилання на ВЕСЬ її вміст.
	 */
	const referenced = (asset: string) => {
		const base = asset.slice(asset.lastIndexOf("/") + 1);
		const dir = asset.includes("/")
			? asset.slice(0, asset.lastIndexOf("/") + 1)
			: "";
		return (
			haystack.includes(asset) ||
			haystack.includes(base) ||
			(dir !== "" && haystack.includes(`${dir}{`))
		);
	};

	it("перевірка жива: ресурси й джерела посилань прочитано", () => {
		expect(
			assets.length,
			"тека static/ порожня — перевіряти нема що",
		).toBeGreaterThan(5);
		expect(
			REFERENCE_SOURCES.length,
			"джерел посилань не знайдено",
		).toBeGreaterThan(50);
		// Канарка на сам спосіб пошуку: файл, який ТОЧНО згадують, мусить
		// знайтися. Інакше «жодної сироти» означало б лише зламаний пошук.
		expect(
			REFERENCE_SOURCES.some((f) => f.endsWith("src/app.html")),
			"app.html не потрапив у джерела посилань — а саме він називає піктограми",
		).toBe(true);
		expect(referenced("manifest.json"), "розбір посилань зламався").toBe(true);
		expect(
			referenced("svg/flags/uk.svg"),
			"інтерпольована адреса не розпізнається",
		).toBe(true);
	});

	it("перелік ресурсів без жодного посилання збігається із записаним", () => {
		const orphans = assets.filter((a) => !referenced(a)).sort();
		expect(
			orphans,
			"файл у static/, якого не просить ніхто: adapter-static однаково " +
				"скопіює його на хостинг, і про нього не дізнається жоден звіт. " +
				"Або підключити, або видалити — або назвати причину в " +
				"KNOWN_UNREFERENCED, як це зроблено для .nojekyll",
		).toEqual([...KNOWN_UNREFERENCED].sort());
	});
});
