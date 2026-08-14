import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Інваріант паритету ключів словників (I18N-v8 § 7.1).
 *
 * Словники — JSON у `src/lib/i18n/translations/`, тобто TypeScript їх не
 * зіставляє. Забутий ключ у неукраїнській мові означає, що відвідувач бачить
 * технічний ідентифікатор (`profile.stats.title`) замість тексту — і побачить
 * його лише той, хто зайшов на потрібну сторінку потрібною мовою.
 *
 * У проєкті вже є `npm run i18n:check` — скрипт для ручного прогону. Тест
 * потрібен окремо: скрипт запускають, коли згадають, а тест іде тим самим
 * `npm run test:unit`.
 *
 * Список мов НЕ захардкоджений — читається з каталогу. Інакше нова мова
 * додавалася б у словники й лишалася поза перевіркою: та сама помилка, тільки
 * на рівні самої перевірки.
 */

const DIR = join(process.cwd(), 'src/lib/i18n/translations');
const REFERENCE = 'uk';

type Dict = Record<string, unknown>;

function flatten(value: unknown, prefix = ''): string[] {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
	return Object.entries(value as Dict).flatMap(([key, child]) =>
		flatten(child, prefix ? `${prefix}.${key}` : key)
	);
}

function leafValues(value: unknown, prefix = ''): [string, unknown][] {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return [[prefix, value]];
	return Object.entries(value as Dict).flatMap(([key, child]) =>
		leafValues(child, prefix ? `${prefix}.${key}` : key)
	);
}

const locales = Object.fromEntries(
	readdirSync(DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(DIR, f), 'utf-8'))])
) as Record<string, unknown>;

describe('словники i18n', () => {
	const referenceKeys = flatten(locales[REFERENCE]).sort();

	it(`еталонна мова «${REFERENCE}» знайдена й не порожня`, () => {
		expect(locales[REFERENCE]).toBeDefined();
		expect(referenceKeys.length).toBeGreaterThan(100);
	});

	it('мов у каталозі більше однієї — інакше перевіряти нічого', () => {
		expect(Object.keys(locales).length).toBeGreaterThan(1);
	});

	for (const locale of Object.keys(locales).filter((l) => l !== REFERENCE)) {
		it(`«${locale}» має рівно ті самі ключі, що «${REFERENCE}»`, () => {
			const keys = flatten(locales[locale]).sort();
			const missing = referenceKeys.filter((k) => !keys.includes(k));
			const extra = keys.filter((k) => !referenceKeys.includes(k));
			// Обидва напрямки: зайвий ключ — це або опечатка, або мертвий
			// переклад, і те й те варте уваги так само, як забутий.
			expect({ missing, extra }).toEqual({ missing: [], extra: [] });
		});
	}

	for (const locale of Object.keys(locales)) {
		it(`«${locale}» не має порожніх значень`, () => {
			const empty = leafValues(locales[locale])
				.filter(([, v]) => typeof v === 'string' && v.trim() === '')
				.map(([k]) => k);
			expect(empty).toEqual([]);
		});
	}
});
