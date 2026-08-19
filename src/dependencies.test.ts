// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Ланцюг постачання (DEPENDENCIES-v8 § 6, гейт GATE-DEPS).
 *
 * Канон називає цей гейт blocking, і в проєкті його не було: три правила з
 * чотирьох трималися на тому, що ніхто не помилився. `npm audit --omit=dev` у
 * CI був — але саме `--omit=dev` і робить поділ на `dependencies` та
 * `devDependencies` частиною БЕЗПЕКИ, а не смаку: інструмент, помилково
 * записаний у рантайм, потрапляє під аудит і тягне за собою власне дерево
 * транзитивних пакетів у прод.
 *
 * Знайдено при заведенні цього файлу: `glob` лежав у `dependencies`, хоч
 * імпортує його рівно один скрипт обслуговування (`build_translation_map.js`),
 * а застосунок — жодного разу.
 */

const ROOT = process.cwd().replace(/\\/g, "/");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	overrides?: Record<string, string>;
};

const runtime = Object.keys(pkg.dependencies ?? {});
const all = { ...pkg.dependencies, ...pkg.devDependencies };

describe("залежності", () => {
	it("перевірка жива: package.json розібрано", () => {
		expect(runtime.length, "жодної рантайм-залежності — сканер читає не той файл").toBeGreaterThan(
			0
		);
	});

	/**
	 * Два lockfile означають два різні дерева залежностей, і яке з них поїде в
	 * CI, залежить від того, який менеджер там викличуть. `npm ci` при цьому
	 * лишається зеленим.
	 */
	it("один менеджер пакетів — один lockfile", () => {
		const locks = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"].filter((f) =>
			existsSync(join(ROOT, f))
		);
		expect(locks, `знайдено кілька lockfile: ${locks.join(", ")}`).toHaveLength(1);
	});

	it("немає плаваючих версій — збірка відтворювана", () => {
		const floating = Object.entries(all)
			.filter(([, range]) => range === "*" || range === "latest" || range === "")
			.map(([name]) => name);
		expect(floating, `невідтворювані версії: ${floating.join(", ")}`).toEqual([]);
	});

	/**
	 * Інструменти в `dependencies`. Перелік за іменами з канону — плюс те, що
	 * канонічний регекс не ловить: пакет, який імпортують ЛИШЕ скрипти й тести.
	 * Саме так `glob` і прожив у рантаймі.
	 */
	it("інструменти збірки не в dependencies (§ 6)", () => {
		const buildOnly = runtime.filter((dep) =>
			/^(vite|vitest|typescript|svelte-check|@sveltejs\/(kit|adapter|vite-plugin)|eslint|prettier|@playwright|husky|@axe-core)/.test(
				dep
			)
		);
		expect(buildOnly, `мають бути у devDependencies: ${buildOnly.join(", ")}`).toEqual([]);
	});

	/**
	 * Пакет у `dependencies`, якого застосунок не імпортує, — це `devDependencies`
	 * з іншою назвою. Різниця не косметична: `npm audit --omit=dev` у CI дивиться
	 * саме на рантайм-дерево, тобто зайвий пакет там додає шум, а зі шумом
	 * швидко піднімають поріг аудиту.
	 *
	 * Перевірка вимагала двох правок ще до першого коміту, і обидві варто
	 * назвати — це рівно ті способи, якими сканер бреше (AI-AGENT-PITFALLS-v8
	 * § 1.1):
	 *
	 *   1. Вона знаходила `glob` у ВЛАСНОМУ докблоці — у цьому файлі назва
	 *      пакета згадана як приклад. Тому файли перевірок зі сканування
	 *      виключені, а коментарі відрізані.
	 *   2. Вона знаходила `firebase` у списку СЛІВ усередині іншої перевірки
	 *      (`"firestore", "firebase", "rtdb"`). Тому шукається не лапки навколо
	 *      назви, а справжня форма імпорту.
	 *
	 * Реверс-експеримент після правок: `glob`, повернутий у `dependencies`,
	 * валить саме цю перевірку.
	 */
	it("кожна рантайм-залежність справді імпортується з src/", () => {
		const sources = walk(join(ROOT, "src"))
			.filter((f) => /\.(ts|js|svelte)$/.test(f))
			.filter((f) => !/\.(test|spec)\.(ts|js)$/.test(f));
		expect(sources.length, "джерел не знайдено — сканер шукає не там").toBeGreaterThan(20);

		const text = sources
			.map((f) => readFileSync(f, "utf8"))
			.join("\n")
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/^[ \t]*\/\/.*$/gm, "");

		const unused = runtime.filter((dep) => {
			const escaped = dep.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");
			// `from "pkg"`, `from "pkg/subpath"`, `import("pkg")`, `require("pkg")`.
			const specifier = `["'\`]${escaped}(/[^"'\`]*)?["'\`]`;
			return !new RegExp(`(?:from|import|require)\\s*\\(?\\s*${specifier}`).test(text);
		});
		expect(
			unused,
			`у dependencies, але застосунок їх не імпортує — місце цим пакетам у devDependencies: ${unused.join(", ")}`
		).toEqual([]);
	});

	/**
	 * `overrides` — це заявка на те, що транзитивна версія небезпечна або
	 * зламана. Заявка без причини за півроку читається як «щось тут було»: її не
	 * знімають, бо невідомо, що зламається.
	 */
	it("кожен override пояснений у PROJECT-CONTEXT.md або package.json", () => {
		const names = Object.keys(pkg.overrides ?? {});
		if (names.length === 0) return;

		const context = readFileSync(join(ROOT, "PROJECT-CONTEXT.md"), "utf8");
		const raw = readFileSync(join(ROOT, "package.json"), "utf8");
		const unexplained = names.filter((name) => !context.includes(name) && !raw.includes(`// ${name}`));
		expect(
			unexplained,
			`override без причини — його неможливо зняти, бо невідомо, чому він з'явився: ${unexplained.join(", ")}`
		).toEqual([]);
	});
});

function walk(dir: string, out: string[] = []): string[] {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else out.push(full.replace(/\\/g, "/"));
	}
	return out;
}
