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

	/**
	 * Емодзі в UI-рядках (UI-UX-v8 § 4, анти-патерн MEDIUM).
	 *
	 * Перевірка стоїть на СЛОВНИКАХ, а не на компонентах, і це не випадково:
	 * саме тут живуть user-facing тексти, і саме тут емодзі розмножується
	 * семикратно — по одному на мову. Так і було: `😕` стояв у двох ключах
	 * розділу `errors.speech` у всіх семи словниках, тобто чотирнадцять разів,
	 * плюс двічі в запасних варіантах коду.
	 *
	 * Чому це правило взагалі є: емодзі малює шрифт системи, а не проєкт. Той
	 * самий символ виглядає різним на Windows, Android і iOS, не має ні кольору
	 * теми, ні розміру, і читалка озвучує його повною назвою посеред речення.
	 * Замість нього — SVG-іконка, яких у проєкті вже повний набір
	 * (`lucide-svelte`).
	 *
	 * Виняток канону — emoji picker і контент від користувача; у словниках
	 * інтерфейсу ні того, ні того не буває, тож перелік винятків тут порожній.
	 *
	 * Зворотний експеримент: повернути `😕` у будь-який ключ — перевірка
	 * називає мову, ключ і сам символ.
	 */
	const EMOJI =
		/[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

	for (const locale of Object.keys(locales)) {
		it(`«${locale}» не має емодзі в UI-рядках`, () => {
			const withEmoji = leafValues(locales[locale])
				.filter(([, v]) => typeof v === 'string' && EMOJI.test(v as string))
				.map(([k, v]) => `${k}: ${(v as string).match(EMOJI)?.[0]}`);
			expect(
				withEmoji,
				`емодзі малює шрифт системи, а не проєкт — потрібна SVG-іконка:\n${withEmoji.join('\n')}`
			).toEqual([]);
		});
	}
});
