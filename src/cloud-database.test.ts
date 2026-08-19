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

	it("у чужій скриньці можна писати лише СВІЙ слот (§ 4.2, § 12.1)", () => {
		/*
		 * Доти властивість була «лише створити» (`!data.exists()`) плюс звірка поля
		 * `from` з `auth.uid`. Обидві половини не працювали: код пише `fromUid`, а не
		 * `from`, тож умова не виконувалася НІКОЛИ — і `sendWave` відкидався цілком.
		 *
		 * Тепер властивість інша й сильніша: ключ у скриньці дорівнює uid
		 * відправника, а правило звіряє `fromUid` і з `auth.uid`, і з ключем. Звідси
		 * одразу три речі: відправника не підробити, чужий слот не зайняти, і обсяг
		 * гілки обмежений — один слот на людину, бо примітива «не більше N дітей» у
		 * RTDB не існує.
		 *
		 * «Лише створити» при цьому НЕ потрібне: повторний сигнал від тієї самої
		 * людини має право перезаписати свій же слот, і для «помахати» це правильна
		 * поведінка.
		 */
		const signals = databaseRules.slice(databaseRules.indexOf('"$from"'));
		expect(signals, "правил для signals/$to/$from не знайдено").not.toBe("");
		expect(signals, "відправник мусить писати лише свій слот").toMatch(
			/\$from === auth\.uid/,
		);
		expect(signals, "поле відправника мусить звірятися з auth.uid").toMatch(
			/newData\.val\(\) === auth\.uid/,
		);
		expect(signals, "поле відправника мусить звірятися з КЛЮЧЕМ").toMatch(
			/newData\.val\(\) === \$from/,
		);
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
		 * `PresenceService` розділено 2026-08-18: усі 28 викликів SDK пішли в чистий
		 * `presenceRtdb.ts`, а в реактивному сховищі лишилися стан і рішення. Це
		 * було видно з самого файлу: 534 рядки, 28 звернень до бази й РІВНО ДВІ
		 * руни.
		 *
		 * `SyncService` лишається в переліку — це записаний борг, а не дозвіл: 814
		 * рядків, у яких злиті мережа, злиття місцевого з хмарним, повтори й
		 * міграція схеми, і жоден із цих шляхів не має тесту. Розділяти його без
		 * тестів на видобутий шар означало б переставити код, задовольнити регекс і
		 * додати риску, не додавши тієї перевірності, задля якої правило й існує.
		 *
		 * Перелік може лише СКОРОЧУВАТИСЯ: новий файл у ньому не з'явиться
		 * непоміченим.
		 */
		const KNOWN_DEBT = ["src/lib/services/firebase/SyncService.svelte.ts"];

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

	it("файл індексів прив’язаний і існує (§ 2.4)", () => {
		/*
		 * Індекси — той самий клас дефекту, що правила лише в консолі (§ 2.1), і
		 * гірший: складений запит без індексу дає ГОТОВЕ посилання на створення,
		 * тож дефект зникає за десять секунд і назавжди лишається поза
		 * репозиторієм. Проєкт, розгорнутий у новому Firebase, ламається на запиті,
		 * який «працює вже пів року».
		 */
		const config = JSON.parse(readFileSync("firebase.json", "utf8"));
		const indexes = config.firestore?.indexes;
		expect(indexes, "firebase.json не вказує firestore.indexes").toBeTruthy();
		expect(existsSync(indexes), `${indexes} немає`).toBe(true);
		expect(JSON.parse(readFileSync(indexes, "utf8")).indexes).toBeInstanceOf(Array);
	});

	it("кожен orderByChild має \".indexOn\" на своїй гілці (§ 7.4)", () => {
		/*
		 * RTDB не відмовляє без індексу — вона віддає ГІЛКУ ЦІЛКОМ і сортує на
		 * клієнті, лишивши попередження в консолі браузера, якого в продакшні не
		 * читає ніхто. Тобто це тихо зростаючий рахунок, а не помилка, і побачити
		 * його можна лише отак.
		 */
		const bad: string[] = [];
		for (const file of sources) {
			for (const match of readFileSync(file, "utf8").matchAll(
				/orderByChild\s*\(\s*['"]([\w.]+)['"]/g,
			)) {
				const pattern = new RegExp(
					`"\\.indexOn"\\s*:\\s*(?:"${match[1]}"|\\[[^\\]]*"${match[1]}")`,
				);
				if (!pattern.test(databaseRules)) {
					bad.push(`${file}: orderByChild('${match[1]}') без ".indexOn"`);
				}
			}
		}
		expect(bad, `RTDB віддасть гілку цілком:\n${bad.join("\n")}`).toEqual([]);
	});

	it("невідомі поля відкидаються, а не ігноруються (§ 4.6)", () => {
		/*
		 * `.validate` перевіряє лише НАЗВАНІ поля, тож без `$other` розсинхрон імені
		 * поля між кодом і правилом лишається тихим. Тут таких було ДВА, і кожен
		 * означав не «слабший захист», а зламану функцію: правило валідувало
		 * `last_changed`, код писав `lastChanged`; правило вимагало `from`, код
		 * писав `fromUid` — і `sendWave` відкидався ЗАВЖДИ.
		 */
		const validates = [...databaseRules.matchAll(/"\.validate"/g)].length;
		expect(validates, "форма записів ніде не перевіряється").toBeGreaterThan(0);
		const others = [
			...databaseRules.matchAll(/"\$other"\s*:\s*\{\s*"\.validate"\s*:\s*false/g),
		].length;
		// По одному на кожен вузол із відомою формою: status, discovery, signals.
		expect(others, "вузли з відомою формою не закриті \"$other\"").toBeGreaterThanOrEqual(3);
	});

	it("імена полів у правилах збігаються з кодом (§ 4.6)", () => {
		// Пряма перевірка на той самий клас дефекту: не «є $other», а «названі поля
		// справді ті». Обидва імені колись розходилися, і гейт цього не бачив, бо
		// писав ту саму форму, що й правила.
		const presence = readFileSync("src/lib/services/firebase/presenceRtdb.ts", "utf8");
		expect(presence, "код пише lastChanged").toMatch(/lastChanged:\s*serverTimestamp\(\)/);
		expect(databaseRules, "правила мусять валідувати саме lastChanged").toMatch(/"lastChanged"/);
		expect(databaseRules, "старе імʼя last_changed не має лишитися").not.toMatch(/"last_changed"/);

		// Скорочений запис властивості в тілі `set()`: поле називається `fromUid`.
		expect(presence, "код пише fromUid").toMatch(/^		fromUid,$/m);
		expect(databaseRules, "правила мусять валідувати саме fromUid").toMatch(/"fromUid"/);
	});

	it("обсяг чужого запису обмежений формою ключа (§ 12.1)", () => {
		/*
		 * Скринька сигналів — єдина гілка, у яку пише СТОРОННІЙ. Примітива «не
		 * більше N дітей» у RTDB немає, тож стеля будується ключем: `signals/{to}/
		 * {from}` дає один слот на відправника, `signals/{to}/{autoId}` — скільки
		 * завгодно.
		 */
		const rtdbLayer = readFileSync("src/lib/services/firebase/presenceRtdb.ts", "utf8");
		expect(rtdbLayer, "ключ сигналу мусить бути uid відправника").toMatch(
			/signals\/\$\{targetUid\}\/\$\{fromUid\}/,
		);
		/*
		 * `push()` дав би одному відправникові скільком завгодно записів.
		 *
		 * Тут стояв регекс, який НЕ МІГ спрацювати: замість `\b` у ньому лежав
		 * байт U+0008 (навчальний слід від якогось heredoc), а такого символу в
		 * джерелах не буває — тобто перевірка була зелена за побудовою
		 * (AI-AGENT-PITFALLS-v8 § 1.1). Реверс-експеримент показав обидва боки:
		 * зі зламаним регексом впроваджений `push()` дав 21 passed, з правильним
		 * — падіння саме на цьому рядку.
		 *
		 * Негативний lookbehind, а не `\b`: у цьому ж файлі є `users.push({` —
		 * звичайний масив, і `\bpush\(` дає на ньому хибну знахідку. Заборонений
		 * тут саме `push` як функція RTDB, тобто виклик без приймача.
		 */
		expect(rtdbLayer, "push() у скриньці сигналів знімає стелю").not.toMatch(
			/(?<![.\w])push\s*\(/,
		);
		expect(databaseRules, "правило мусить звіряти ключ із fromUid").toMatch(
			/newData\.val\(\) === \$from/,
		);
	});

	it("кожен шлях із коду має випадок у гейті (§ 3.5)", () => {
		/*
		 * Напрямок зворотний до § 3.3, і саме він ловить шлях, у який пише код, а
		 * правил для нього немає: такий шлях забирає catch-all, тобто функція тихо
		 * не працює. Так тут пролежали `feedback` і `feedback_anonymous` — форма
		 * відгуку й скарга на слово відмовляли, а UI показував «увійдіть».
		 */
		const gate = readFileSync("scripts/check-rules.mjs", "utf8");
		const paths = new Set<string>();
		for (const file of sources) {
			const text = readFileSync(file, "utf8");
			for (const match of text.matchAll(
				/\b(?:collection|doc)\s*\(\s*[^,)]+,\s*['"]([a-z_][\w-]*)['"]/gi,
			)) {
				paths.add(match[1]);
			}
			for (const match of text.matchAll(/\bref\s*\(\s*[^,)]+,\s*[`'"]\/?([a-z_][\w-]*)/gi)) {
				paths.add(match[1]);
			}
			// Колекція, зібрана з префікса (`dev_feedback` / `feedback_anonymous`),
			// у виклик літералом не потрапляє — її треба ловити окремо.
			for (const match of text.matchAll(/["'`](feedback(?:_anonymous)?)["'`]/g)) {
				paths.add(match[1]);
			}
		}
		expect(paths.size, "шляхів до бази не знайдено — перевірка мертва").toBeGreaterThan(0);
		const uncovered = [...paths].filter((path) => !gate.includes(path));
		expect(uncovered, `шлях без випадку в гейті:\n${uncovered.join("\n")}`).toEqual([]);
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
