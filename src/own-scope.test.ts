// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * НА СПІЛЬНОМУ ORIGIN «СТЕРТИ ВСЕ» ОЗНАЧАЄ «СТЕРТИ ЧУЖЕ»
 * (STORAGE-NAMESPACE § 1, DEBUGGING § `DBG-HARD-RESET`, CRITICAL).
 *
 * ## Що саме тут було зламане
 *
 * Прибирання в цьому проєкті живе в ЧОТИРЬОХ місцях, і фільтр стояв рівно в
 * одному — `resetService.hardReset()`, ще й із докблоком на пів екрана про те,
 * чому фільтр обов'язковий. Решта три ходили по всьому origin:
 *
 *   1. `versionService.applyUpdate()` → `clearCaches()` — знімав УСІ
 *      реєстрації. Виконується на кожному застосуванні оновлення, включно з
 *      примусовим за `minVersion`, тобто без жодного натискання;
 *   2. кнопка «Очищення» на екрані падіння в `app.html` — те саме, з
 *      коментарем «Slovko only», який стосувався лише рядка про кеші;
 *   3. зняття застряглих воркерів у dev-гілці `+layout.svelte` — на
 *      `localhost` origin спільний так само.
 *
 * `getRegistrations()` і `caches.keys()` не знають про підшлях нічого: на
 * `alik532ua.github.io` вони віддають реєстрації й кеші ВСІХ проєктів акаунта.
 * Тобто одне оновлення Slovko знімало service worker у `MindStep`,
 * `AudioRemote` і решти — а симптом («сайт перестав працювати офлайн») з'являвся
 * в сусіда, і шукати причину довелося б у чужому репозиторії.
 *
 * ## Чому перевірка по джерелах, а не тест поведінки
 *
 * Дефект — у ВІДСУТНОСТІ фільтра, а не в його логіці. Тест поведінки довелося б
 * писати на кожен виклик окремо, і п'ятий виклик, доданий завтра, він не
 * побачив би. Тут перевіряється саме те, що ламалося: виклик є, фільтра немає.
 *
 * ## Зворотний експеримент — прогнано
 *
 * Повернути `registrations.map((reg) => reg.unregister())` у `versionService.ts`
 * → «getRegistrations() без фільтра» червоніє й називає файл. Те саме з
 * `caches.keys()` і з поверненням множини в `app.html`.
 */

const ROOT = "src";

/** Єдиний модуль, якому дозволено знати, як виглядає межа «своє». */
const FILTER_MODULE = "src/lib/services/ownScope.ts";

/**
 * Екран падіння — чистий HTML до гідрації, імпортувати туди нічого не можна.
 * Тому для нього правило інше й перевіряється окремо нижче: однина
 * `getRegistration()` замість множини, і фільтр кешів двома ознаками текстом.
 */
const CRASH_SCREEN = "src/app.html";

function sources(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry).replace(/\\/g, "/");
		if (statSync(full).isDirectory()) sources(full, out);
		else if (/\.(ts|svelte)$/.test(entry) && !/\.test\.ts$/.test(entry))
			out.push(full);
	}
	return out;
}

/**
 * Код без коментарів — інакше перевірка ловить САМУ СЕБЕ.
 *
 * Це не теорія: перший прогін цього файлу впав на `app.html`, де код уже був
 * правильний, а заборонений `getRegistrations()` лишався у поясненні, ЧОМУ
 * його тут не можна. Гейт, який читає джерела текстом, мусить читати рівно
 * той текст, що виконується, — інакше докблок стає причиною червоного, а
 * прибрати докблок дешевше, ніж розібратися (AI-AGENT-PITFALLS § 1.3).
 *
 * Гірший бік того самого — хибно ЗЕЛЕНИЙ: файл із порушенням проходить, бо
 * поруч у коментарі згадана назва фільтра. Саме так і проходить зараз
 * сусідній `MindStep`, де ця перевірка стоїть без зняття коментарів.
 *
 * Знімаються блокові коментарі цілком і рядки, які ПОЧИНАЮТЬСЯ з `//`.
 * Кінцеві `// …` лишаються навмисно: наївне різання по `//` розсікало б
 * `https://` всередині рядків, тобто ховало б від перевірки справжній код.
 */
function withoutComments(code: string): string {
	return code
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

const files = [...sources(ROOT), CRASH_SCREEN].map((path) => ({
	path,
	code: withoutComments(readFileSync(path, "utf8")),
}));

describe("перевірка жива", () => {
	it("джерела знайдено", () => {
		expect(
			files.length,
			"сканер не знайшов джерел — порівнювати нема з чим",
		).toBeGreaterThan(50);
	});

	it("модуль із фільтрами існує й експортує обидва", () => {
		const filter = files.find((f) => f.path === FILTER_MODULE);
		expect(
			filter,
			`${FILTER_MODULE} зник — усі перевірки нижче стали б порожніми`,
		).toBeDefined();
		expect(filter?.code).toMatch(/export function ownRegistrations/);
		expect(filter?.code).toMatch(/export function ownCacheNames/);
	});

	it("виклики, які перевіряються, у проєкті справді є", () => {
		const callers = files.filter((f) =>
			/getRegistrations?\(\)|caches\.keys\(\)/.test(f.code),
		);
		expect(
			callers.length,
			"жодного виклику getRegistrations()/caches.keys() — перевірка дивиться не туди",
		).toBeGreaterThan(1);
	});
});

describe("аварійне скидання стирає лише своє (DBG-HARD-RESET)", () => {
	/**
	 * Вимога сильніша за «є фільтр поруч»: виклику тут немає ВЗАГАЛІ.
	 *
	 * Слабша форма («є `getRegistrations()` — має бути й `ownRegistrations(`»)
	 * дивиться на файл цілком, тож проходить і той, у якому два виклики, а
	 * фільтр лише в одного. Саме так і було: `resetService` мав обидва, а поруч
	 * із ним у тому ж проєкті жили два виклики без фільтра. Відколи зняття
	 * реєстрацій робить `unregisterOwnServiceWorkers()`, писати цей виклик на
	 * місці немає жодної причини — отже й дозволу немає.
	 */
	it("getRegistrations() не викликається поза модулем межі", () => {
		const offenders = files
			.filter((f) => f.path !== FILTER_MODULE)
			.filter((f) => /getRegistrations\(\)/.test(f.code))
			.map((f) => f.path);
		expect(
			offenders,
			"getRegistrations() віддає реєстрації ВСЬОГО origin. Знімати свої треба " +
				`через unregisterOwnServiceWorkers() з ${FILTER_MODULE}:\n${offenders.join("\n")}`,
		).toEqual([]);
	});

	it("зняття реєстрацій справді проходить через модуль межі", () => {
		const filter = files.find((f) => f.path === FILTER_MODULE);
		expect(filter?.code).toMatch(
			/export async function unregisterOwnServiceWorkers/,
		);

		const callers = files.filter((f) =>
			/unregisterOwnServiceWorkers\s*\(/.test(f.code),
		);
		expect(
			callers.length,
			"ніхто не кличе unregisterOwnServiceWorkers() — або прибирання зникло, " +
				"або його знову написали на місці в обхід межі",
		).toBeGreaterThan(1);
	});

	it("caches.keys() ніде не обходиться без ownCacheNames()", () => {
		const offenders = files
			.filter((f) => f.path !== FILTER_MODULE && f.path !== CRASH_SCREEN)
			.filter((f) => /caches\.keys\(\)/.test(f.code))
			.filter((f) => !/ownCacheNames\s*\(/.test(f.code))
			.map((f) => f.path);
		expect(
			offenders,
			"caches.keys() віддає імена кешів ВСЬОГО origin — без фільтра за префіксом " +
				`тут витирається офлайн-кеш сусіднього проєкту:\n${offenders.join("\n")}`,
		).toEqual([]);
	});

	it("localStorage.clear() і sessionStorage.clear() не викликаються в застосунку", () => {
		const offenders = files
			.filter((f) => /(?:local|session)Storage\.clear\s*\(/.test(f.code))
			.map((f) => f.path);
		expect(
			offenders,
			"clear() на спільному origin витирає дані сусіднього застосунку; " +
				`своє знімає storageProvider.clear() за префіксом:\n${offenders.join("\n")}`,
		).toEqual([]);
	});
});

describe("екран падіння прибирає лише своє", () => {
	const crash = files.find((f) => f.path === CRASH_SCREEN)!;

	/**
	 * Множина заборонена тут НАЗАВЖДИ, а не «поки не додали фільтр».
	 *
	 * Фільтр за `base` у цьому файлі написати неможливо — `%sveltekit.*%`
	 * підставляються, а модулі не імпортуються. Однина `getRegistration()` без
	 * аргументів віддає реєстрацію, яка керує ЦІЄЮ сторінкою, тобто дає
	 * потрібну межу без жодного порівняння.
	 */
	it("бере свою реєстрацію одниною, а не перебирає всі", () => {
		expect(
			/getRegistrations\(\)/.test(crash.code),
			"у app.html повернулася множина getRegistrations() — вона віддає реєстрації " +
				"всього origin, а фільтра за base тут написати нема з чого. " +
				"Потрібна однина getRegistration() без аргументів",
		).toBe(false);
		expect(crash.code).toMatch(/getRegistration\(\)/);
	});

	it("кеші фільтруються обома ознаками", () => {
		expect(
			crash.code,
			"фільтр за власним префіксом зник — кнопка стирала б чужі кеші",
		).toMatch(/indexOf\('slovko-'\)/);
		expect(
			crash.code,
			"фільтр за власним scope зник — кеші, які називає бібліотека воркера, " +
				"не мають нашого префікса в імені й лишилися б назавжди",
		).toMatch(/ownScope/);
	});
});
