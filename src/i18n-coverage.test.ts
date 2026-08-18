// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Покриття локалізації: ключі без ужитку й підписи без перекладу.
 *
 * Обидві перевірки — про одне й те саме правило «наявність ≠ використання»
 * (PROJECT-STRUCTURE-v8 § 4.3, який окремо називає ключі локалізації), тільки з
 * різних боків:
 *
 * 1. Ключ є у ВСІХ семи словниках і ним не користується жоден рядок коду. Саме
 *    так шістнадцять перекладених повідомлень про помилки входу простояли без
 *    ужитку, доки форма показувала англійський текст Firebase. Паритет ключів
 *    (`translations.test.ts`) цього не бачить: він звіряє словники між собою, а
 *    не з кодом, тож мертвий ключ у ньому — рівно такий самий «OK».
 *
 * 2. Підпис для читалки написано просто рядком. Для незрячого відвідувача це
 *    англійський напис посеред інтерфейсу однією з семи мов. Гейт кнопок
 *    закриття вже вимагає підпис із i18n — але лише для них.
 *
 * Обидва переліки МОЖУТЬ ЛИШЕ СКОРОЧУВАТИСЯ. Число, а не `toEqual([])`, — бо
 * порожній перелік довелося б купувати або видаленням тексту, продуктовий сенс
 * якого не перевіриш читанням коду, або вигаданим перекладом грецькою й
 * кримськотатарською. І те, і те гірше за названу цифру.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const DICT = join(SRC, "lib/i18n/translations/uk.json");

/**
 * Ключі, що пережили свій екран: текст лишився від попередніх версій
 * онбордингу, меню й налаштувань, які тепер беруть інші ключі
 * (`onboarding.step1_part1…` замість `explanationPart1…`,
 * `settings.columnLeft/columnRight` замість `settings.from/to`,
 * `about.title`/`about.support` замість `menu.about`/`menu.donate`).
 *
 * Не видалено одним рухом навмисно: кожен рядок — це сім перекладів, і рішення
 * «цей екран більше не повернеться» приймає власник продукту, а не аудит.
 * Число тут — стеля, яку можна лише знижувати.
 */
const KNOWN_UNUSED_KEYS = 21;

/**
 * Підписи для читалки, написані рядком. Сім із них закрито 2026-08-19 за
 * рахунок ключів, що вже існували (`common.listen`, `common.save`,
 * `common.edit`, `common.cancel`, `common.copyReport`,
 * `playlists.addCustomWord`). Решта потребує НОВИХ ключів у семи мовах —
 * зокрема грецькою й кримськотатарською, і вигадувати їх наосліп означало б
 * тихо погіршити те, що зараз хоча б чесно англійське.
 */
const KNOWN_HARDCODED_LABELS = 15;

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(ts|js|svelte)$/.test(entry)) out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

function flatten(value: unknown, prefix = ""): string[] {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return [prefix];
	return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
		flatten(v, prefix ? `${prefix}.${k}` : k),
	);
}

/*
 * Файли перевірок виключені навмисно. Інакше згадка ключа в коментарі — навіть
 * у коментарі САМЕ ЦІЄЇ перевірки, який пояснює, чому ключ мертвий, — робить
 * його «вжитим», і гейт починає рахувати власний текст за код. Так і сталося
 * під час написання: перелік мовчки скоротився на два.
 */
const files = walk(SRC).filter((f) => !/\.(test|spec)\.(ts|js)$/.test(f));
const sources = files.map((f) => readFileSync(f, "utf8")).join("\n");
const keys = flatten(JSON.parse(readFileSync(DICT, "utf-8")));

/**
 * Гілки, які збираються в рантаймі: `$_(\`levels.${id}\`)` робить ужитими всі
 * ключі під `levels.`. Без цього перевірка оголосила б мертвими рівні, теми,
 * часи й теми оформлення — тобто сварилася б на цілком робочий код.
 */
const dynamicPrefixes = [
	...new Set([...sources.matchAll(/["'`]([\w.]*?)\$\{/g)].map((m) => m[1])),
].filter(Boolean);

const unusedKeys = keys
	.filter((k) => !sources.includes(k))
	.filter((k) => !dynamicPrefixes.some((p) => k.startsWith(p)));

const hardcodedLabels = files
	.filter((f) => f.endsWith(".svelte"))
	.flatMap((f) =>
		[...readFileSync(f, "utf8").matchAll(/aria-label="([^"{][^"]*)"/g)].map(
			(m) => `${f.replace(`${ROOT.replace(/\\/g, "/")}/`, "")}: ${m[1]}`,
		),
	);

describe("покриття локалізації", () => {
	it("перевірка жива: ключі, джерела й динамічні гілки знайдено", () => {
		expect(keys.length).toBeGreaterThan(300);
		expect(files.length).toBeGreaterThan(50);
		// Порожній перелік префіксів означав би, що розбір шаблонних рядків
		// зламався, і перевірка почала б рахувати робочі ключі за мертві.
		expect(dynamicPrefixes.length).toBeGreaterThan(0);
	});

	it(`ключів без ужитку не більше за ${KNOWN_UNUSED_KEYS}`, () => {
		expect(
			unusedKeys.length,
			`перелік може лише скорочуватися; зараз:\n${unusedKeys.join("\n")}`,
		).toBeLessThanOrEqual(KNOWN_UNUSED_KEYS);
	});

	it(`підписів для читалки без i18n не більше за ${KNOWN_HARDCODED_LABELS}`, () => {
		expect(
			hardcodedLabels.length,
			`перелік може лише скорочуватися; зараз:\n${hardcodedLabels.join("\n")}`,
		).toBeLessThanOrEqual(KNOWN_HARDCODED_LABELS);
	});
});
