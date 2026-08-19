// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Продуктивність — те, що видно в джерелах (PERFORMANCE-v8 § 10.2).
 *
 * Бюджет бандла живе окремо, у `scripts/check-bundle.mjs`: він міряє `build/`, а
 * цей файл дивиться в `src/`. Розділені навмисно — бандл без збірки перевіряти
 * нічим, і змішаний гейт довелося б або запускати після `build`, або мовчки
 * пропускати половину.
 *
 * Знайдено при заведенні файлу: три `<img>` у `AvatarEditor.svelte` без
 * `width`/`height`. Чотири інші в проєкті їх мали — тобто конвенція існувала й
 * тримала три файли з чотирьох.
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

const all = walk(join(ROOT, "src"));
const svelteFiles = all.filter((f) => f.endsWith(".svelte"));
const styleFiles = all.filter((f) => /\.(css|svelte)$/.test(f));

describe("продуктивність", () => {
	it("перевірка жива: компоненти знайдено", () => {
		expect(svelteFiles.length, "жодного .svelte — сканер шукає не там").toBeGreaterThan(20);
	});

	/**
	 * `<img>` без розмірів — це стрибок розкладки (CLS) у момент, коли картинка
	 * доїхала: браузер до того не знає, скільки місця під неї тримати. У
	 * розмітці Svelte цього не видно ніяк, бо розміри зазвичай стоять у CSS — а
	 * CSS застосовується вже після того, як місце розподілене.
	 */
	it("кожен <img> має width і height (CLS)", () => {
		const bad: string[] = [];
		let total = 0;

		for (const file of svelteFiles) {
			const text = readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
			for (const tag of text.matchAll(/<img\b[\s\S]*?\/?>/g)) {
				total += 1;
				if (!/\bwidth=/.test(tag[0]) || !/\bheight=/.test(tag[0])) {
					bad.push(`${file.slice(ROOT.length + 1)}: ${tag[0].replace(/\s+/g, " ").slice(0, 70)}`);
				}
			}
		}

		expect(total, "жодного <img> не знайдено — перевірка мертва").toBeGreaterThan(0);
		expect(bad, `без width/height — стрибок розкладки на завантаженні:\n${bad.join("\n")}`).toEqual(
			[]
		);
	});

	/**
	 * `@font-face` без `font-display` дає невидимий текст на час завантаження
	 * шрифта (FOIT). Своїх шрифтів у проєкті сьогодні НЕМА — перевірка стоїть
	 * на майбутнє й свідомо порожня; вона не вдає, ніби щось міряє.
	 */
	it("кожен @font-face має font-display", () => {
		const bad: string[] = [];
		for (const file of styleFiles) {
			const text = readFileSync(file, "utf8");
			for (const block of text.matchAll(/@font-face\s*\{[^}]*\}/g)) {
				if (!/font-display\s*:/.test(block[0])) bad.push(file.slice(ROOT.length + 1));
			}
		}
		expect(bad, `@font-face без font-display — текст буде невидимий:\n${bad.join("\n")}`).toEqual(
			[]
		);
	});

	/**
	 * Бюджет бандла мусить бути КРОКОМ, а не файлом. Скрипт, який ніхто не
	 * кличе, — це та сама тест-заглушка, лише в іншій теці
	 * (AI-AGENT-PITFALLS-v8 § 1.3).
	 */
	it("бюджет бандла має скрипт, npm-команду і крок у CI (§ 10.1)", () => {
		expect(existsSync(join(ROOT, "scripts/check-bundle.mjs")), "немає скрипта бюджету").toBe(true);

		const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
			scripts?: Record<string, string>;
		};
		const script = pkg.scripts?.["check:bundle"];
		expect(script, "немає npm-скрипта check:bundle").toBeDefined();
		expect(script).toContain("check-bundle.mjs");

		const workflows = join(ROOT, ".github/workflows");
		const ci = readdirSync(workflows)
			.filter((f) => /\.ya?ml$/.test(f))
			.map((f) => readFileSync(join(workflows, f), "utf8"))
			.join("\n")
			.replace(/^\s*#.*$/gm, "");
		expect(
			/npm run check:bundle/.test(ci),
			"бюджет не стоїть у CI — скрипт, якого ніхто не кличе, нічого не тримає"
		).toBe(true);
	});
});
