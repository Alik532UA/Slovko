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
	/**
	 * Гейт аудиту в CI дивиться на РАНТАЙМНЕ дерево (`GATE-AUDIT`).
	 *
	 * Докблок вище пояснює перевірку «зайвий пакет у dependencies» через те, що
	 * «`npm audit --omit=dev` у CI дивиться саме на рантайм-дерево». Прапорця в
	 * команді при цьому не було — тобто документ описував гейт, якого не було, а
	 * читач цього файлу мав підставу вважати шум у `dependencies` дорогим.
	 * Тепер обидва боки під гейтом.
	 *
	 * Ціна відсутнього прапорця не теоретична. 2026-09-11 крок був червоний на
	 * трьох `high` у ланцюжку інструментів (browserslist, fast-uri, js-yaml) —
	 * при НУЛІ вразливостей у рантаймних залежностях на будь-якому рівні. Крок
	 * стоїть перед `Build`, тож червоний тут скасовує і збірку, і викладення:
	 * сайт не оновлюється через уразливість у тому, що на сайт не потрапляє.
	 *
	 * І головне — база порад живе ЗОВНІ репозиторію, тобто такий гейт червоніє
	 * без жодного коміту, у випадковий день. Гейт, колір якого не залежить від
	 * коду, зупиняє реліз тоді, коли його ніхто не ламав, і саме такі вимикають.
	 *
	 * Зворотний експеримент виконано: прибраний `--omit=dev` у `deploy.yml` —
	 * червоне з назвою файлу й кроку.
	 */
	it("крок аудиту в CI звужений до рантайму (--omit=dev)", () => {
		// З ревізії 9.5 канону CI кличе ОБГОРТКУ, а не `npm audit` напряму
		// (CI-CD-AND-TOOLS-v9 § 1.15, `CI-THIRD-PARTY-OUTAGE`): голий крок падає й
		// тоді, коли ліг реєстр npm. Область звуження від цього не змінилася — вона
		// просто переїхала в скрипт, і саме там її тепер і видно.
		const workflows = ["deploy.yml", "deploy-dev.yml"]
			.map((file) => readFileSync(join(ROOT, ".github/workflows", file), "utf-8"))
			.join("\n");
		expect(
			/run:\s*npm run audit:ci/.test(workflows),
			"у workflow немає кроку audit:ci — аудиту в CI не лишилося",
		).toBe(true);
		expect(
			/run:\s*npm audit\b/.test(workflows),
			"голий `npm audit` у workflow: збій реєстру заблокує викладення",
		).toBe(false);

		const wrapper = readFileSync(join(ROOT, "scripts/check-audit.mjs"), "utf-8");
		const steps = wrapper
			.split("\n")
			.map((line, i) => ({ file: "scripts/check-audit.mjs", line: line.trim(), at: i + 1 }))
			.filter(({ line }) => /'npm audit\b/.test(line));

		// Порожній перелік означав би, що аудиту в CI немає зовсім, — і тоді
		// «порушень немає» правдиве за побудовою.
		expect(
			steps.length,
			"жодної команди `npm audit` в обгортці — або аудиту немає, або розбір зламався",
		).toBeGreaterThan(0);

		const wide = steps
			.filter(({ line }) => !line.includes("--omit=dev"))
			.map(({ file, at, line }) => `${file}:${at} — ${line}`);

		expect(
			wide,
			"без `--omit=dev` гейт дивиться на все дерево розробки: він червоніє від " +
				"поради, опублікованої зовні, без жодного коміту — і скасовує викладення " +
				"через уразливість у тому, що на сайт не потрапляє:\n  " + wide.join("\n  "),
		).toEqual([]);
	});

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
