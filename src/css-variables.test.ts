// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `var(--x)` без оголошення в жодній темі (UI-UX-v8 § 1.6, гейт GATE-CSS-VARS).
 *
 * Клас дефекту тихий у обидва боки:
 *
 *   * із запасним значенням — `var(--bg-surface, #fff)` — колір перестає
 *     залежати від теми й однаково світлий у всіх чотирьох. Виглядає як
 *     свідомий вибір, а насправді це друкарська помилка в імені;
 *   * без запасного — оголошення стає недійсним, і властивість зникає зовсім.
 *     Саме так `background: var(--primary)` лишав кнопку без тла.
 *
 * Ні збірка, ні `svelte-check`, ні браузер про це не кажуть нічого.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): вжити `var(--нема-такої)`
 * у будь-якому компоненті — перевірка мусить назвати саме її і саме той файл.
 */

const SKIP = new Set(['node_modules', '.svelte-kit', 'build', 'dist', '.temp', 'data', 'translations']);

/**
 * Змінні, які оголошуються не в CSS, а в рантаймі, і тому в джерелах їх
 * оголошення немає за побудовою. Кожна — з причиною, інакше цей перелік стане
 * місцем, куди зсипають усе незручне.
 */
const RUNTIME_DECLARED: Record<string, string> = {
	'--vh': 'ставиться з +layout.svelte: висота вікна в мобільних браузерах живе з панеллю'
};

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		if (SKIP.has(name)) return [];
		const full = join(dir, name);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

const FILES = walk('src').filter((f) => f.endsWith('.svelte') || f.endsWith('.css'));

const used = new Map<string, Set<string>>();
const declared = new Set(Object.keys(RUNTIME_DECLARED));

for (const file of FILES) {
	const text = readFileSync(file, 'utf8');
	for (const m of text.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
		const at = used.get(m[1]) ?? new Set<string>();
		at.add(file);
		used.set(m[1], at);
	}
	// Оголошення в CSS: `--x: …`. Плюс директива Svelte `style:--x=…`, якою
	// значення приходить із JS — для перевірки це теж оголошення.
	for (const m of text.matchAll(/(?<![\w-])(--[A-Za-z0-9_-]+)\s*:/g)) declared.add(m[1]);
	for (const m of text.matchAll(/style:(--[A-Za-z0-9_-]+)\s*=/g)) declared.add(m[1]);
}

describe('CSS-змінні (UI-UX-v8 § 1.6)', () => {
	it('перевірка жива: файли й звернення знайдено', () => {
		expect(FILES.length, 'сканер не знайшов жодного стилю — шукає не там').toBeGreaterThan(20);
		expect(used.size, 'жодного var(--x) — перевіряти нема що').toBeGreaterThan(20);
	});

	it('кожна var(--x) десь оголошена', () => {
		const orphans = [...used.entries()]
			.filter(([name]) => !declared.has(name))
			.map(([name, files]) => `${name} — ${[...files].sort().join(', ')}`)
			.sort();

		expect(
			orphans,
			'неоголошена змінна із запасним значенням ігнорує тему, а без запасного ' +
				`гасить властивість цілком:\n  ${orphans.join('\n  ')}`
		).toEqual([]);
	});

	it('перелік рантайм-змінних не розростається мовчки', () => {
		// Кожен запис має причину — це не список винятків, а список того, що
		// оголошується з JS. Порожній рядок замість причини робить його смітником.
		for (const [name, reason] of Object.entries(RUNTIME_DECLARED)) {
			expect(reason.length, `${name} без причини`).toBeGreaterThan(20);
			expect(used.has(name), `${name} більше ніде не вживається — прибери запис`).toBe(true);
		}
	});
});
