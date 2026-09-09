// @vitest-environment node
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Закінчення рядків — стан ІНДЕКСУ й РОБОЧОГО ДЕРЕВА, а не наявність файлу
 * (AI-AGENT-PITFALLS § 1.5, `PIT-EOL-GATE`, HIGH; гейт `GATE-EOL`).
 *
 * `.gitattributes` тут є з серпня, і причина в ньому описана докладно. Опису
 * без перевірки виявилося замало рівно з тієї ж причини, з якої опис не
 * замінює гейта ніде: атрибут діє **при видачі**. Дерево, викачане до появи
 * правила, лишається з CRLF назавжди — а документ поруч стверджує протилежне.
 *
 * Чому це дорожче, ніж виглядає. Більшість перевірок цього проєкту читають
 * власні джерела ТЕКСТОМ; різниця в один символ на рядок означає для них інший
 * вердикт, і найгірший прояв — не червоний тест, а мовчазний нуль: регулярка з
 * `$` без прапорця `m` перестає збігатися через `\r`, гейт звітує «нічого не
 * знайдено» й виглядає зеленим.
 *
 * У цьому репозиторії клас уже стріляв: хеш інлайн-скрипта в CSP обчислювався
 * над CRLF і вимикав заставку цілком — про це написаний `csp-hash.test.ts`.
 * Тобто наслідок полагодили, а причину лишили без гейта.
 *
 * Зворотний експеримент при постановці: тимчасовий файл із CRLF робить червоними
 * і перевірку індексу, і перевірку вмісту, і кожна називає саме його.
 */

const ROOT = process.cwd();

/** Виклик git. Код виходу 1 у `grep` означає «нічого не знайдено», а не збій. */
function git(args: string[]): { ok: boolean; out: string } {
	try {
		const out = execFileSync("git", args, {
			cwd: ROOT,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		});
		return { ok: true, out };
	} catch (e) {
		const err = e as { status?: number; stdout?: string };
		if (err.status === 1) return { ok: true, out: err.stdout ?? "" };
		return { ok: false, out: "" };
	}
}

const eolReport = git(["ls-files", "--eol"]);

/** Рядок `git ls-files --eol`: `i/lf    w/lf    attr/text=auto eol=lf   path`. */
type Entry = { index: string; work: string; path: string };

const entries: Entry[] = eolReport.out
	.split("\n")
	.filter(Boolean)
	.map((line) => {
		const m = /^i\/(\S+)\s+w\/(\S+)\s+attr\/\S*\s+(.+)$/.exec(line);
		return m ? { index: m[1], work: m[2], path: m[3].trim() } : null;
	})
	.filter((e): e is Entry => e !== null);

const ATTRS = join(ROOT, ".gitattributes");
const attrs = existsSync(ATTRS) ? readFileSync(ATTRS, "utf8") : "";

/** Розширення, оголошені двійковими в `.gitattributes`. */
const declaredBinary = new Set(
	[...attrs.matchAll(/^\s*\*\.([A-Za-z0-9]+)\s+binary\s*$/gm)].map((m) =>
		m[1].toLowerCase(),
	),
);

const extOf = (p: string) =>
	(/\.([A-Za-z0-9]+)$/.exec(p)?.[1] ?? "").toLowerCase();

const CHECK_GLOBS = ["*.test.ts", "*.spec.ts"];

/**
 * Скільки перевірок читають ВЛАСНІ джерела текстом — тобто скільки з них
 * змінили б вердикт від CRLF. Число ГЕНЕРУЄТЬСЯ й стоїть у назві канарки, а не
 * в прозі: воно росте від кожної доданої перевірки, і записане одного разу
 * розходиться мовчки (AI-AGENT-PITFALLS § 5.5, `PIT-NUMBER-UNDER-GATE`).
 * Саме так у цьому файлі колись з'явилося «25 із 34» при інших справжніх.
 */
const readers = git(["grep", "-l", "-F", "readFileSync", "--", ...CHECK_GLOBS])
	.out.split("\n")
	.filter(Boolean).length;
const checks = git(["ls-files", ...CHECK_GLOBS])
	.out.split("\n")
	.filter(Boolean).length;

describe("закінчення рядків однакові локально й у CI (PIT-EOL-GATE, HIGH)", () => {
	it(`перевірка жива: git відповів, і джерела текстом читають ${readers} перевірок із ${checks}`, () => {
		// Порожній перелік дав би «жодного порушення» на будь-якому стані дерева
		// — рівно та мовчазна зелена перевірка, проти якої написаний § 1.
		expect(
			eolReport.ok,
			"git ls-files --eol не виконався — перевіряти нічого",
		).toBe(true);
		expect(
			entries.length,
			"жодного відстежуваного файлу не розібрано",
		).toBeGreaterThan(100);
		expect(
			readers,
			"жодна перевірка не читає джерела текстом — правило ні про що",
		).toBeGreaterThan(0);
		expect(checks).toBeGreaterThanOrEqual(readers);
	});

	it(".gitattributes фіксує LF для всього дерева", () => {
		expect(
			attrs,
			".gitattributes відсутній: форма файлів залежить від core.autocrlf машини",
		).not.toBe("");
		expect(
			/^\s*\*\s+text=auto\s+eol=lf\s*$/m.test(attrs),
			"немає рядка `* text=auto eol=lf` — правило або звужене, або записане інакше",
		).toBe(true);
	});

	it("ні в індексі, ні в робочому дереві немає CRLF", () => {
		const bad = entries
			.filter((e) => /crlf|mixed/.test(e.index) || /crlf|mixed/.test(e.work))
			.map((e) => `i/${e.index} w/${e.work}  ${e.path}`);

		expect(
			bad,
			"локальний прогін і CI читають РІЗНИЙ текст цих файлів. Вирівнюється " +
				"`git add --renormalize .`, далі видалити файли з w/crlf і " +
				`\`git checkout-index -f -- <файли>\`:\n  ${bad.join("\n  ")}`,
		).toEqual([]);
	});

	it("жодного символу CR у відстежуваному тексті", () => {
		// Окремо від попередньої перевірки, і не заради надійності:
		// `--renormalize` МОВЧКИ пропускає файл із самотнім `\r` (CR без `\n`) —
		// git вважає такий вміст двійковим, команда виходить із кодом 0 і не
		// робить нічого. `ls-files --eol` такий файл теж не називає.
		const found = git(["grep", "-I", "-l", "-F", "\r", "--", "."])
			.out.split("\n")
			.filter(Boolean);
		expect(
			found,
			`символ CR у тексті, який гейти читають рядками:\n  ${found.join("\n  ")}`,
		).toEqual([]);
	});

	it("кожен двійковий тип, що лежить у репозиторії, оголошений явно", () => {
		// Нове розширення (`.jpg`, `.woff2`) git визначить двійковим сам — і
		// саме тому воно тут і з'явиться: евристика вгадала, а правило про це
		// не знає. Файл із самотнім CR потрапляє сюди з тієї ж причини.
		const undeclared = [
			...new Set(
				entries
					.filter((e) => e.index === "-text" || e.work === "-text")
					.map((e) => extOf(e.path))
					.filter((ext) => ext && !declaredBinary.has(ext)),
			),
		].sort();

		expect(
			declaredBinary.size,
			"у .gitattributes не оголошено жодного двійкового типу",
		).toBeGreaterThan(0);
		expect(
			undeclared,
			"git читає ці типи як двійкові, а .gitattributes про них мовчить — " +
				`евристика вирішує замість правила: ${undeclared.join(", ")}`,
		).toEqual([]);
	});
});
