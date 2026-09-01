// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Розмір файлу (PROJECT-STRUCTURE-v8 § 7).
 *
 * Правило MEDIUM, і межа в ньому названа орієнтовною — але його відсутність у
 * v7 дала файли, які вже неможливо тримати в голові. Канон допускає
 * перевищення за однієї умови: воно ЗАПИСАНЕ з причиною. Тут не було записано
 * жодного, крім `SyncService`, — тобто двадцять із гаком файлів понад межу
 * читалися як норма.
 *
 * Гейт свідомо не вимагає нуля. Механічне різання файлу навпіл задовольнило б
 * регекс, не додавши нічого: канон просить ділити ЗА ВІДПОВІДАЛЬНІСТЮ, а це
 * робота з перевірками, а не з ножицями. Тому тут стеля, яка може лише
 * знижуватися, — той самий підхід, що й у базового числа axe.
 *
 * Перелік перевищень із причинами — у `PROJECT-CONTEXT.md`, розділ «Файли
 * понад орієнтир».
 */

const SRC = join(process.cwd(), "src");

/** Орієнтири з § 7. Порядок важливий: перше збіжне правило й виграє. */
const LIMITS: { match: RegExp; limit: number; kind: string }[] = [
	{ match: /\/routes\/\+page\.svelte$/, limit: 400, kind: "+page.svelte" },
	{ match: /\.svelte$/, limit: 300, kind: ".svelte" },
	{ match: /\.svelte\.ts$/, limit: 300, kind: ".svelte.ts" },
	{ match: /\.ts$/, limit: 250, kind: ".ts" },
];

/**
 * Стеля, а не мета. Знижується разом із кожним розділеним файлом; підвищувати
 * її означає домовитися з правилом замість того, щоб його виконати.
 * Рахується в SLOC — чистих рядках коду без коментарів.
 *
 * ## Чому РІВНІСТЬ, а не «не більше»
 *
 * Доти тут стояло `toBeLessThanOrEqual`, і саме воно пропустило дрейф:
 * записано було 25, а перевищень уже 24. «Не більше» ловить зростання й
 * пропускає застарівання — файл розділили, число лишилося старим, і наступний
 * читач бачить борг, якого немає. Це та сама вимога, яку докблок вище вже
 * формулює словами («знижується РАЗОМ із кожним розділеним файлом») і яку
 * `eslint-baseline.test.ts` уже виконує рівністю для боргу `warn`.
 *
 * Ціна названа прямо: новий файл понад орієнтир валить прогін, і число
 * доводиться підіймати свідомо, разом із рядком у `PROJECT-CONTEXT.md`. Це не
 * побічний ефект, а зміст правила — канон допускає перевищення рівно за
 * умови, що воно ЗАПИСАНЕ.
 */
const KNOWN_OVERSIZE = 24;

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(ts|svelte)$/.test(entry)) out.push(full.replace(/\\/g, "/"));
	}
	return out;
}

const countSloc = (file: string): number => {
	const text = readFileSync(file, "utf8");
	return text
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^\s*\/\/.*$/gm, "")
		.split(/\r?\n/)
		.filter((l) => l.trim().length > 0).length;
};

const files = walk(SRC)
	.filter((f) => !/\.(test|spec)\.ts$/.test(f))
	// Словники й набори слів — дані, а не код: ділити їх за відповідальністю
	// нема на що, а розмір там визначає предметна область.
	.filter((f) => !/\/lib\/data\//.test(f));

const oversize = files
	.map((file) => {
		const rule = LIMITS.find((r) =>
			r.kind === ".svelte.ts" ? file.endsWith(".svelte.ts") : r.match.test(file),
		);
		if (!rule) return null;
		const lines = countSloc(file);
		return lines > rule.limit
			? `${file.replace(`${SRC.replace(/\\/g, "/")}/`, "src/")}: ${lines} рядків SLOC (орієнтир ${rule.limit})`
			: null;
	})
	.filter((x): x is string => x !== null);

describe("розмір файлу (PROJECT-STRUCTURE-v8 § 7)", () => {
	it("перевірка жива: джерела знайдено, орієнтири застосовані", () => {
		expect(files.length).toBeGreaterThan(50);
		// Нуль перевищень при відомій стелі означав би, що фільтр з'їв усе, а
		// не що проєкт раптово порізали.
		expect(oversize.length).toBeGreaterThan(0);
	});

	it(`файлів понад орієнтир рівно ${KNOWN_OVERSIZE}`, () => {
		expect(
			oversize.length,
			"стеля може лише знижуватися — і опускається ТИМ САМИМ комітом, яким " +
				`файл розділили;\nзараз:\n${oversize.join("\n")}`,
		).toBe(KNOWN_OVERSIZE);
	});
});
