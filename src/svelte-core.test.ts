// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Інваріанти `SVELTE-CORE` по джерелах (гейт `GATE-SVELTE-SOURCES`).
 *
 * Канон збирає в цей гейт чотири пункти. Четвертий — аксесор контексту (§ 3.3) —
 * тут уже стоїть, у `architecture.test.ts`, і переносити його сюди означало б
 * розірвати надвоє його власний набір перевірок. Решта три не мали перевірки
 * взагалі:
 *
 * - **§ 1.6, межа серіалізації (HIGH).** Проксі `$state` не переходить у
 *   `structuredClone`, `postMessage` чи `JSON.stringify` без `$state.snapshot`.
 *   `structuredClone` на проксі кидає `DataCloneError`; `JSON.stringify`
 *   серіалізує, але без вкладених `Map`/`Set`; сторонній SDK бачить об'єкт, що
 *   змінюється під ним уже після виклику.
 * - **§ 3.2.1, підключена підписка (HIGH).** Метод сервісу `subscribe*`, `init`,
 *   `start*` чи `listen*`, якого не кличе ніхто поза сервісним шаром, — не
 *   запас, а відсутня функція. Компілятор мовчить: публічний метод без викликів
 *   для нього норма. Юніт-тест сервісу теж зелений: він перевіряє метод, а не
 *   те, що метод підключено. У сусідньому проєкті так не працювали злиття
 *   рекорду з хмарним і жива підписка на профіль, а скарга звучала як «список
 *   оновлюється лише кнопкою».
 * - **§ 2.2.2, парне зняття слухача (MEDIUM).** Евристика файлова й груба
 *   навмисно: вона не доводить, що знято правильний слухач, — вона знаходить
 *   файл, де про зняття не думали взагалі. Виняток закривається не мовчанням, а
 *   рядком у `KNOWN_PAGE_LIFETIME` із причиною.
 *
 * Кожен пункт починається з канарки «джерела знайдено»: без неї перевірка
 * зелена на порожньому переліку (AI-AGENT-PITFALLS § 1).
 */

const SKIP = new Set(["node_modules", ".svelte-kit", "build", "dist", ".temp"]);

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		if (SKIP.has(name)) return [];
		const full = join(dir, name);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

const posix = (p: string) => p.split(String.fromCharCode(92)).join("/");
const isCheck = (f: string) => /\.(test|spec)\.(ts|js)$/.test(f);

const SOURCES = walk("src")
	.map(posix)
	.filter((f) => /\.(ts|svelte)$/.test(f) && !isCheck(f));

const text = new Map(SOURCES.map((f) => [f, readFileSync(f, "utf8")]));
const srcOf = (f: string) => text.get(f) as string;

/* ────────────────────────────── § 1.6 ────────────────────────────── */

/** Виклики, за межею яких проксі перестає бути проксі. */
const BOUNDARY =
	/(JSON\.stringify|structuredClone|postMessage)\s*\(\s*([A-Za-z_$][\w$.]*)/g;

/** Імена, оголошені руною `$state` у цьому ж файлі (включно з полями класу). */
function stateNames(src: string): Set<string> {
	const names = new Set<string>();
	for (const m of src.matchAll(
		/([A-Za-z_$][\w$]*)\s*(?::\s*[^=;\n]+?)?\s*=\s*\$state[.(<]/g,
	)) {
		names.add(m[1]);
	}
	return names;
}

describe("межа серіалізації: проксі $state за неї не переходить (SC-SNAPSHOT-BOUNDARY, HIGH)", () => {
	const withState = SOURCES.filter((f) => stateNames(srcOf(f)).size > 0);
	const boundaryCalls = SOURCES.reduce(
		(n, f) => n + [...srcOf(f).matchAll(BOUNDARY)].length,
		0,
	);

	it("перевірка жива: і руни, і виклики на межі знайдено", () => {
		expect(
			withState.length,
			"жодного $state не знайдено — розбір зламався",
		).toBeGreaterThan(20);
		expect(
			boundaryCalls,
			"жодного виклику на межі серіалізації не знайдено",
		).toBeGreaterThan(5);
	});

	it("розбір бачить проксі саме там, де воно є", () => {
		// Зворотний бік канарки: якщо `stateNames` почне повертати порожню
		// множину, перевірка нижче стане зеленою на будь-якому коді.
		expect([...stateNames("let draft = $state({ a: 1 });")]).toEqual(["draft"]);
		expect([...stateNames("private _rows = $state<Row[]>([]);")]).toEqual([
			"_rows",
		]);
		expect([...stateNames("const plain = { a: 1 };")]).toEqual([]);
	});

	it("кожен перехід межі бере $state.snapshot", () => {
		const bad: string[] = [];
		for (const file of SOURCES) {
			const src = srcOf(file);
			const names = stateNames(src);
			if (!names.size) continue;
			for (const m of src.matchAll(BOUNDARY)) {
				const root = m[2].replace(/^this\./, "").split(".")[0];
				if (!names.has(root)) continue;
				const line = src.slice(0, m.index).split("\n").length;
				const statement = src.split("\n")[line - 1];
				if (/\$state\.snapshot/.test(statement)) continue;
				bad.push(`${file}:${line} — ${statement.trim().slice(0, 100)}`);
			}
		}
		expect(
			bad,
			"проксі $state їде за межу серіалізації як є. structuredClone на ньому " +
				"кидає DataCloneError, а сторонній SDK отримує об'єкт, який змінюється " +
				`під ним уже після виклику — беріть $state.snapshot(...):\n  ${bad.join("\n  ")}`,
		).toEqual([]);
	});
});

/* ───────────────────────────── § 3.2.1 ───────────────────────────── */

const SERVICE_LAYER = "src/lib/services/";
const SUBSCRIPTION_NAME = /^(subscribe|init|start|listen)/;
const NOT_A_MEMBER =
	/^(if|for|while|switch|catch|return|constructor|function|super|await|typeof|new)$/;

type Subscription = { file: string; name: string; needle: string };

/** Публічні підписки сервісного шару та рядок, яким шукається їхній виклик. */
function subscriptions(): Subscription[] {
	const found: Subscription[] = [];
	for (const file of SOURCES.filter((f) => f.startsWith(SERVICE_LAYER))) {
		const src = srcOf(file);

		// Псевдоніми в тому ж файлі: `export const initGA = initAnalytics;`.
		// Без них жива підписка виглядає мертвою — саме так тут стоїть аналітика.
		const aliases = new Map<string, string[]>();
		for (const m of src.matchAll(
			/^export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/gm,
		)) {
			aliases.set(m[2], [...(aliases.get(m[2]) ?? []), m[1]]);
		}

		for (const m of src.matchAll(
			/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
		)) {
			if (!SUBSCRIPTION_NAME.test(m[1])) continue;
			for (const name of [m[1], ...(aliases.get(m[1]) ?? [])]) {
				found.push({ file, name: m[1], needle: `${name}(` });
			}
		}

		// Носій методів: `export const PresenceService = new PresenceServiceClass()`
		// або об'єкт-літерал `export const AuthService = { … }`.
		const holders = [
			...src.matchAll(
				/^export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:new\s|\{)/gm,
			),
		].map((m) => m[1]);
		if (!holders.length) continue;

		for (const line of src.split(/\r?\n/)) {
			// Оголошення члена стоїть на одному відступі й закінчується `{`;
			// виклик на тому ж рівні закінчується `;`. Приватні методи — не
			// підписки назовні: їх кличе сам сервіс, і це нормально.
			const m = /^\t(?:public\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/.exec(
				line,
			);
			if (!m || NOT_A_MEMBER.test(m[1]) || !SUBSCRIPTION_NAME.test(m[1]))
				continue;
			if (/^\t(?:private|protected|#)/.test(line)) continue;
			if (!line.trimEnd().endsWith("{")) continue;
			for (const holder of holders)
				found.push({ file, name: m[1], needle: `${holder}.${m[1]}(` });
		}
	}
	return found;
}

describe("підписка сервісу підключена (SC-SUBSCRIPTION-WIRED, HIGH)", () => {
	const subs = subscriptions();

	it("перевірка жива: підписки в сервісному шарі знайдено", () => {
		expect(
			SOURCES.filter((f) => f.startsWith(SERVICE_LAYER)).length,
			"сервісного шару не знайдено",
		).toBeGreaterThan(5);
		expect(
			subs.length,
			"жодної підписки не знайдено — розбір зламався",
		).toBeGreaterThan(3);
	});

	it("кожну кличе хтось поза сервісним шаром", () => {
		// «Поза сервісним шаром» — контролер, компонент або макет. Виклик
		// сервіс → сервіс не рахується: підписка, зшита лише всередині шару,
		// однаково не доходить до жодного екрана.
		const dead = new Map<string, string>();
		for (const s of subs) {
			const wired = SOURCES.some(
				(f) => !f.startsWith(SERVICE_LAYER) && srcOf(f).includes(s.needle),
			);
			const key = `${s.file} :: ${s.name}()`;
			if (wired) dead.delete(key);
			else if (!dead.has(key)) dead.set(key, `${key} — шукали «${s.needle}»`);
		}
		const bad = [...dead.values()].sort();
		expect(
			bad,
			"підписка написана й нікому не потрібна: компілятор мовчить, тест " +
				"сервісу зелений, а на екрані її просто немає. Або підключити, або " +
				`видалити — третього немає:\n  ${bad.join("\n  ")}`,
		).toEqual([]);
	});
});

/* ───────────────────────────── § 2.2.2 ───────────────────────────── */

const LISTENS = /addEventListener\s*\(|\.observe\s*\(|setInterval\s*\(/;
const RELEASES =
	/removeEventListener|\.disconnect\s*\(|\.unobserve\s*\(|clearInterval\s*\(|once:\s*true|signal:\s*/;

/**
 * Файли, де слухач навмисно живе стільки ж, скільки сторінка.
 *
 * Усі п'ять — модульні одинаки: об'єкт створюється один раз на імпорті
 * (`export const … = new …Class()`), і знімати слухача нема коли — модуль не
 * знищується до перезавантаження. Витоку на SPA-навігації, проти якого
 * написане правило, тут не буває: другого примірника не з'являється.
 *
 * Перелік лише СКОРОЧУЄТЬСЯ. Новий файл сюди не дописується «щоб позеленіло»:
 * саме тому перевірка звіряє множини на РІВНІСТЬ, а не на входження — запис
 * про файл, який уже прибрали за собою, теж робить її червоною.
 */
const KNOWN_PAGE_LIFETIME = [
	"src/lib/controllers/NetworkState.svelte.ts",
	"src/lib/controllers/PlaylistStore.svelte.ts",
	"src/lib/controllers/ProgressStore.svelte.ts",
	"src/lib/controllers/PwaStore.svelte.ts",
	"src/lib/controllers/SettingsStore.svelte.ts",
];

describe("слухач знімається там, де ставиться (SC-LISTENER-CLEANUP, MEDIUM)", () => {
	const listening = SOURCES.filter((f) => LISTENS.test(srcOf(f)));
	const unpaired = listening.filter((f) => !RELEASES.test(srcOf(f))).sort();

	it("перевірка жива: файли зі слухачами знайдено", () => {
		expect(
			listening.length,
			"жодного addEventListener/observe/setInterval",
		).toBeGreaterThan(5);
	});

	it("перелік файлів без парного зняття збігається із записаним", () => {
		expect(
			unpaired,
			"файл ставить слухача й ніде його не знімає. На SPA-навігації такий " +
				"модуль лишає обробник на window при кожному переході, і кожен тримає " +
				"свій компонент у пам'яті. Якщо це навмисно — рядок у " +
				"KNOWN_PAGE_LIFETIME з причиною, а не мовчання",
		).toEqual([...KNOWN_PAGE_LIFETIME].sort());
	});
});
