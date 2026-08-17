// @vitest-environment node
// Перевірка лише читає файли — DOM їй не потрібен.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Інваріанти роботи з хмарною базою за CLOUD-DATABASE-v8 § 14.
 *
 * **Чого ці перевірки НЕ роблять.** Вони не перевіряють самі правила доступу —
 * ті виконуються на боці Firebase, і побачити їхній стан можна лише запитом до
 * емулятора. Це робить `npm run check:rules`, і він стоїть окремим джобом у CI.
 *
 * Тут — форма коду й форма файлів правил: те, що видно з джерел і що можна
 * зламати правкою, не торкаючись бази. Жодна половина не заміняє іншу: гейт над
 * емулятором не побачить статичного імпорту SDK, а ці інваріанти не побачать
 * дозволу, який забули звузити.
 */

const IGNORED_DIRS = new Set(["node_modules", ".svelte-kit", "build", "dist", ".temp"]);

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (IGNORED_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

const sources = walk("src").filter((f) => /\.(ts|svelte)$/.test(f));
const firestoreRules = readFileSync("firestore.rules", "utf8");
/** Коментарі не рахуються: у них `if true` цитують саме як опис дефекту. */
const rulesCode = firestoreRules.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const databaseRules = readFileSync("database.rules.json", "utf8").replace(/^\s*\/\/.*$/gm, "");

describe("хмарна база", () => {
	it("знаходить джерела — перевірка жива", () => {
		expect(sources.length).toBeGreaterThan(0);
		expect(rulesCode).toContain("service cloud.firestore");
	});

	it("обидва файли правил прив’язані через firebase.json (§ 2.2)", () => {
		const config = JSON.parse(readFileSync("firebase.json", "utf8"));
		for (const key of ["firestore", "database"] as const) {
			const path = config[key]?.rules;
			expect(path, `firebase.json не вказує правила для ${key}`).toBeTruthy();
			expect(existsSync(path), `${path} немає`).toBe(true);
		}
	});

	it("гейт правил існує, кличе емулятор і закріплює проєкт (§ 3)", () => {
		const pkg = JSON.parse(readFileSync("package.json", "utf8"));
		const script = pkg.scripts["check:rules"];
		expect(script, "немає скрипта check:rules").toMatch(/emulators:exec/);
		/*
		 * `--project` обовʼязковий. Без нього емулятор RTDB бере інший простір
		 * імен, ніж припускає скрипт, — пише в НОВИЙ простір із типовими
		 * відкритими правилами, і гейт зеленіє на правилах, яких не читав.
		 * Знайдено прогоном у сусідньому проєкті 2026-08-18.
		 */
		expect(script, "без --project гейт перевіряє не ті правила").toMatch(/--project\s+\S+/);
		expect(existsSync("scripts/check-rules.mjs")).toBe(true);
	});

	it("гейт правил стоїть у CI (§ 3.4)", () => {
		const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
		expect(workflow, "джоба з check:rules немає").toMatch(/check:rules/);
		expect(workflow, "емулятору потрібна Java, кроку setup-java немає").toMatch(/setup-java/);
	});

	it("перевірка правил містить обидві полярності (§ 3.1)", () => {
		const script = readFileSync("scripts/check-rules.mjs", "utf8");
		const positives = [...script.matchAll(/allowed:\s*true/g)].length;
		const negatives = [...script.matchAll(/allowed:\s*false/g)].length;
		expect(positives, "немає випадків «застосунок мусить це вміти»").toBeGreaterThan(0);
		expect(negatives, "немає випадків «сторонній не мусить цього могти»").toBeGreaterThan(0);
	});

	it("у правилах немає безумовного дозволу (§ 1.3)", () => {
		// У цьому проєкті публічних даних немає взагалі: усе, що читається,
		// читається авторизованим. Тому винятків тут теж немає — і поява
		// будь-якого `if true` мусить впасти.
		const open = [...rulesCode.matchAll(/allow\s+[a-z, ]+:\s*if\s+true\s*;/g)].map((m) => m[0]);
		expect(open, `безумовний дозвіл:\n${open.join("\n")}`).toEqual([]);
	});

	it("останнє правило Firestore — заборона (§ 1.3)", () => {
		expect(rulesCode).toMatch(
			/match\s+\/\{document=\*\*\}\s*\{[^}]*allow\s+read,\s*write:\s*if\s+false/,
		);
	});

	it("RTDB не має безумовного дозволу (§ 1.3)", () => {
		const open = [...databaseRules.matchAll(/"\.(?:read|write)"\s*:\s*(?:true|"true")\s*[,}]/g)];
		expect(
			open.map((m) => m[0]),
			"відкрита гілка в RTDB",
		).toEqual([]);
	});

	it("особисті дані читає лише власник (§ 4)", () => {
		// Прогрес, історія, плейлісти й шарди слів — усе через `isOwner`.
		for (const path of ["/users/{uid}", "/history/{day}", "/playlists_v2/{playlistId}", "/words/{shard}"]) {
			const block = rulesCode.slice(rulesCode.indexOf(`match ${path}`));
			expect(block.slice(0, 200), `${path} без isOwner`).toMatch(/isOwner\(/);
		}
	});

	it("сигнал у чужу гілку можна лише СТВОРИТИ й лише від себе (§ 4.2)", () => {
		// Скринька адресата: написати може будь-хто, але переписати чуже або
		// підробити відправника — ні.
		const signals = databaseRules.slice(databaseRules.indexOf('"$signalKey"'));
		expect(signals).toMatch(/!data\.exists\(\)/);
		expect(signals).toMatch(/newData\.child\('from'\)\.val\(\)\s*===\s*auth\.uid/);
	});

	/**
	 * Пошта користувача НІКОЛИ не потрапляє в публічну колекцію.
	 *
	 * Правил рівня поля у Firestore не існує: дозвіл читати документ означає
	 * дозвіл читати всі його поля. Доти `profiles/{uid}` містила адресу відкритим
	 * текстом, а приватність трималася на умові в клієнтському запиті — тобто на
	 * фільтрі, а не на контролі доступу (CLOUD-DATABASE-v8 § 4.4, § 4.5).
	 */
	it("у публічний профіль не пишеться пошта, лише її хеш", () => {
		const offenders: string[] = [];
		for (const file of sources) {
			// Сам файл перевірки називає поле в тексті — інакше він звинувачував би себе.
			if (file.endsWith("cloud-database.test.ts")) continue;
			for (const line of readFileSync(file, "utf8").split("\n")) {
				// `searchableEmail` без `Hash` — саме те поле, яке прибрано.
				if (!/\bsearchableEmail\b(?!Hash)/.test(line)) continue;
				// Видалення старого поля — це і є міграція, а не запис адреси.
				if (line.includes("deleteField()")) continue;
				offenders.push(`${file}: ${line.trim()}`);
			}
		}
		expect(offenders, `відкрита пошта в профілі:\n${offenders.join("\n")}`).toEqual([]);
	});

	it("кожен запит колекції має limit() (§ 7.1)", () => {
		/*
		 * Тіло `query(...)` з урахуванням вкладених дужок. Регулярним виразом це
		 * не робиться: `[\s\S]*?\)` зупиняється на першій закритій дужці, тобто на
		 * `orderBy(...)`, і `limit()` за нею «зникає».
		 */
		function queryBodies(text: string): string[] {
			const bodies: string[] = [];
			const call = /\bquery\s*\(/g;
			let match: RegExpExecArray | null;
			while ((match = call.exec(text)) !== null) {
				let depth = 1;
				let i = match.index + match[0].length;
				const start = i;
				while (i < text.length && depth > 0) {
					if (text[i] === "(") depth++;
					else if (text[i] === ")") depth--;
					i++;
				}
				bodies.push(text.slice(start, i - 1));
			}
			return bodies;
		}

		const bad: string[] = [];
		for (const file of sources) {
			if (file.endsWith("cloud-database.test.ts")) continue;
			for (const body of queryBodies(readFileSync(file, "utf8"))) {
				// Запит поверх іншого (`query(q, …)`) успадковує межу зовнішнього.
				const isDerived = /^\s*q\s*,/.test(body);
				if (!/\blimit(?:ToLast)?\s*\(/.test(body) && !isDerived && !/unbounded-query/.test(body)) {
					bad.push(`${file}: query(${body.slice(0, 60).replace(/\s+/g, " ")}…)`);
				}
			}
		}
		expect(bad, `запит без limit():\n${bad.join("\n")}`).toEqual([]);
	});

	it("SDK не ініціалізується в тілі модуля (§ 10.1)", () => {
		/*
		 * Ознака саме «в тілі модуля» — НУЛЬОВИЙ ВІДСТУП: виклик усередині функції
		 * виконується тоді, коли функцію покличуть, а на нульовому — на імпорті.
		 *
		 * Доти `config.ts` робив саме так, і його тягнуть сім сервісів і два
		 * стори: будь-який тест, що дістає їх транзитивно, вимагав би бойових
		 * ключів, щоб узагалі зібратися.
		 */
		const bad = sources.filter((file) =>
			/^(?:(?:const|let|var)\s+\w+\s*=\s*)?initializeApp\s*\(/m.test(readFileSync(file, "utf8")),
		);
		expect(bad, `initializeApp у тілі модуля:\n${bad.join("\n")}`).toEqual([]);
	});

	it("SDK не імпортується у .svelte.ts (§ 10.4)", () => {
		/*
		 * Мережа, зрощена з реактивністю, не підміняється в тесті й не виноситься.
		 *
		 * Два файли поки лишаються в переліку — це записаний борг, а не дозвіл:
		 * `PresenceService` і `SyncService` тримають і стан, і мережу, і їх треба
		 * розділити на чистий `.ts`-шар та тонке реактивне сховище. Перелік може
		 * лише СКОРОЧУВАТИСЯ: новий файл у ньому не з'явиться непоміченим.
		 */
		const KNOWN_DEBT = [
			"src/lib/services/firebase/PresenceService.svelte.ts",
			"src/lib/services/firebase/SyncService.svelte.ts",
		];

		const offenders = sources
			.filter((file) => file.endsWith(".svelte.ts"))
			.filter((file) => {
				const text = readFileSync(file, "utf8");
				// Імпорт ТИПУ зникає при компіляції — це не мережа в модулі.
				return /^\s*import\s+(?!type\b)[^;]*from\s+["']firebase\//m.test(text);
			});

		const unexpected = offenders.filter((file) => !KNOWN_DEBT.includes(file));
		expect(unexpected, `новий Firebase у реактивному модулі:\n${unexpected.join("\n")}`).toEqual([]);

		const fixed = KNOWN_DEBT.filter((file) => !offenders.includes(file));
		expect(fixed, `борг закрито — прибрати зі списку:\n${fixed.join("\n")}`).toEqual([]);
	});

	it("прогрес по словах не лежить полем головного документа (§ 6.2)", () => {
		// Мапа росла з кожним вивченим словом і впиралася б у межу 1 МіБ.
		// Тепер вона живе шардами в підколекції `words`.
		const sync = readFileSync("src/lib/services/firebase/SyncService.svelte.ts", "utf8");
		expect(sync, "слова мусять іти в шарди").toMatch(/splitIntoShards/);
		expect(sync, "стара мапа мусить видалятися з головного документа").toMatch(
			/progress:\s*\{\s*words:\s*deleteField\(\)/,
		);
	});
});
