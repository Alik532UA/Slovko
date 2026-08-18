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

const IMPORT_RE = /(?:from\s*|import\s*\(\s*|export\s+\*\s+from\s*)["']([^"']+)["']/g;

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
		const orphans = allModules.filter((f) => !reached.has(f)).map(rel).sort();
		expect(
			orphans,
			`недосяжні модулі — підключити або видалити, третього немає:\n${orphans.join("\n")}`,
		).toEqual([]);
	});
});
