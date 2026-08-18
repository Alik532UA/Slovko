// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Цілісність реєстру семантики (`.private/docs/languages_03/00_Architecture_Overview.md`).
 *
 * Документ описує три анти-патерни й жоден із них не перевірявся нічим — тобто
 * це були побажання, а не правила. Заміряно 2026-08-19: два з трьох порушені в
 * даних, і дізнатися про це можна було лише проходом уручну.
 *
 * Числа нижче — база, що ЛИШЕ СПАДАЄ. Зафіксувати нуль там, де порушень 451,
 * означало б додати гейт, який доводиться вимикати; зафіксувати число означає
 * не дати боргу зростати (CODE-QUALITY-v8 § 6.4.1).
 */

const ROOT = process.cwd();
const LEVELS_DIR = join(ROOT, 'src/lib/data/words/levels');
const TRANSLATIONS_DIR = join(ROOT, 'src/lib/data/translations');
const SEMANTICS_TS = join(ROOT, 'src/lib/data/semantics.ts');

/** JSON проєкту лежать із BOM — `JSON.parse` на ньому падає. */
function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')) as T;
}

/** Master List: базові поняття рівнів. */
const masterList = new Set<string>(
	readdirSync(LEVELS_DIR)
		.filter((f) => f.endsWith('.json'))
		.flatMap((f) => readJson<{ words?: string[] }>(join(LEVELS_DIR, f)).words ?? [])
);

/** Ключі англійських модулів рівнів — саме вони живлять розширення. */
const enKeys = new Set<string>(
	readdirSync(join(TRANSLATIONS_DIR, 'en/levels'))
		.filter((f) => f.endsWith('.json'))
		.flatMap((f) => Object.keys(readJson<Record<string, string>>(join(TRANSLATIONS_DIR, 'en/levels', f))))
);

/**
 * Реєстр читається як ТЕКСТ, а не імпортується: файл тягне за собою `../types`
 * і решту графа, а перевірці потрібні лише пари «база → специфічні».
 */
const semanticsSource = readFileSync(SEMANTICS_TS, 'utf8');
const groups = [...semanticsSource.matchAll(/\n\t([a-z0-9_]+):\s*\{\s*base:\s*"([^"]+)",\s*specific:\s*\[([^\]]*)\]/g)].map(
	(m) => ({
		key: m[1],
		base: m[2],
		specific: [...m[3].matchAll(/"([^"]+)"/g)].map((s) => s[1])
	})
);
const registered = new Set(groups.flatMap((g) => g.specific));

describe('реєстр семантики: перевірка жива', () => {
	it('дані знайдено', () => {
		expect(masterList.size, 'Master List порожній — сканер шукає не там').toBeGreaterThan(5000);
		expect(enKeys.size, 'ключів en/levels не знайдено').toBeGreaterThan(5000);
		expect(groups.length, 'реєстр не розібрано — змінився формат semantics.ts').toBeGreaterThan(600);
	});
});

describe('анти-патерни з 00_Architecture_Overview.md', () => {
	/**
	 * Правило 1: файл рівня містить лише базові поняття («Hardcoded Expansion»).
	 * Тут нуль, і нуль лишається закріпленим — це найдешевше правило пакета.
	 */
	it('у файлах рівнів немає розщеплених ключів', () => {
		const suffixed = [...masterList].filter((w) => /_[a-z]{2,}$/.test(w) && registered.has(w));
		expect(suffixed, 'специфічний ключ у Master List ламає логіку динамічного вибору').toEqual([]);
	});

	/**
	 * Правило 2: специфічний ключ реєстру мусить існувати в перекладах.
	 * Нуль порушень заміряно — закріплюємо, бо зареєстрований ключ без перекладу
	 * означає групу, яка ніколи не розкриється.
	 */
	it('кожен специфічний ключ реєстру є в en/levels', () => {
		const missing = [...registered].filter((k) => !enKeys.has(k)).sort();
		expect(missing, `ключі реєстру без перекладу:\n${missing.slice(0, 20).join('\n')}`).toEqual([]);
	});

	/**
	 * Правило 3: база групи мусить бути в Master List. Інакше група недосяжна:
	 * `expandWordList` іде по словах рівня й такої бази ніколи не побачить.
	 *
	 * Дев'ять із них — самі суфіксовані (`catch_up`, `willing_to`) плюс `i`.
	 * Не видаляю разом із цим комітом: це дані, і кожен випадок вимагає рішення,
	 * чи слово має з'явитися в рівні, чи група зникнути.
	 */
	const UNREACHABLE_GROUPS = 9;
	it(`недосяжних груп не більше ${UNREACHABLE_GROUPS}`, () => {
		const unreachable = groups.filter((g) => !masterList.has(g.base)).map((g) => g.key).sort();
		expect(
			unreachable.length,
			`групи, чиєї бази немає в Master List, тобто недосяжні:\n${unreachable.join(', ')}`
		).toBeLessThanOrEqual(UNREACHABLE_GROUPS);
	});

	/**
	 * Правило 4 («Missing Semantics»): розщеплений ключ у перекладах без запису
	 * в реєстрі. Документ називав наслідком «дублювання карток» — це неправда,
	 * і неправда дорога: такий ключ не дає картки ВЗАГАЛІ, бо
	 * `expandWordList` читає лише зареєстровані. Тобто це мертві дані, і шукати
	 * дублікати марно.
	 *
	 * Чому база, а не нуль: набір механічно не розділяється. У ньому і справжні
	 * незареєстровані розщеплення (`abide_rules`), і законні складені записи
	 * (`according_to`, `all_right`), і фразові дієслова, які док. 01 § 3 прямо
	 * дозволяє (`give_up`). Розділити їх може лише людина зі словником.
	 */
	const UNREGISTERED_SPLITS = 459;
	it(`незареєстрованих розщеплень не більше ${UNREGISTERED_SPLITS}`, () => {
		const splits = [...enKeys].filter(
			(k) => k.includes('_') && !registered.has(k) && masterList.has(k.replace(/_[^_]+$/, ''))
		);
		expect(
			splits.length,
			'ключ, база якого є в Master List, а запису в semantics.ts немає — мертві дані'
		).toBeLessThanOrEqual(UNREGISTERED_SPLITS);
	});

	/**
	 * Правило 5 («Ambiguous Suffixes»): суфікс має бути семантичним. Числових
	 * суфіксів нуль — закріплюємо; решту ловить база вище.
	 */
	it('немає числових суфіксів (_1, _2)', () => {
		const numeric = [...enKeys].filter((k) => /_\d+$/.test(k)).sort();
		expect(numeric, 'суфікс мусить називати значення, а не порядок').toEqual([]);
	});

	/**
	 * Правило 6: ключ — це ідентифікатор, а не рядок для людини. Шістнадцять
	 * ключів несуть у собі позначку частини мови з крапкою (`yes_exclam.`,
	 * `goodbye_exclam./n.`) — крапка й слеш у ключі ламають будь-який шлях, у
	 * якому ключ стає частиною імені файлу або селектора.
	 */
	const MALFORMED_KEYS = 16;
	it(`ключів із недопустимими символами не більше ${MALFORMED_KEYS}`, () => {
		const malformed = [...enKeys].filter((k) => /[./]/.test(k)).sort();
		expect(
			malformed.length,
			`крапка або слеш у ключі:\n${malformed.join(', ')}`
		).toBeLessThanOrEqual(MALFORMED_KEYS);
	});
});

describe('мітки контексту', () => {
	/**
	 * Док. 00 § C називає мітки «критичними для UX, коли слово в мові інтерфейсу
	 * однакове», а док. 02 Крок 4 просить заповнити їх «для всіх ключів, які
	 * потребують уточнення». Друге формулювання неперевірюване за побудовою, тож
	 * перевіряється те, що можна: покриття не спадає.
	 */
	const LABEL_GAP = { crh: 351, de: 353, el: 353, en: 293, nl: 351, pl: 353, uk: 351 };

	it('кожна мова має файл semantics.json', () => {
		const langs = readdirSync(TRANSLATIONS_DIR);
		const missing = langs.filter((l) => {
			try {
				readJson(join(TRANSLATIONS_DIR, l, 'semantics.json'));
				return false;
			} catch {
				return true;
			}
		});
		expect(missing, 'без semantics.json розщеплені картки не мають підписів').toEqual([]);
	});

	it.each(Object.entries(LABEL_GAP))('%s: непокритих міток не більше %d', (lang, gap) => {
		const labels = readJson<{ labels?: Record<string, string> }>(
			join(TRANSLATIONS_DIR, lang, 'semantics.json')
		).labels ?? {};
		const uncovered = [...registered].filter((k) => !labels[k]);
		expect(
			uncovered.length,
			`${lang}: розщеплені ключі без мітки контексту — картки будуть однакові на вигляд`
		).toBeLessThanOrEqual(gap);
	});
});
