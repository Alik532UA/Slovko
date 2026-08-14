// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Інваріанти кнопки закриття (UI-ELEMENTS-v8 § 3).
 *
 * Кнопка закриття — найчастіший порушник серед дрібних елементів: вона
 * складається з одного значка, і про підпис для читача з екранного диктора
 * згадують останньою чергою.
 *
 * Третя перевірка — найтихіша з усіх. Оберт задано один раз у глобальному CSS,
 * але власний `transition` у компоненті має більшу вагу (scoping Svelte додає
 * клас), і якщо в його переліку властивостей немає `transform`, оберт стається
 * МИТТЄВО. Побачити це майже неможливо: хрестик симетричний на чверть оберту,
 * тож без руху він виглядає рівно так само, як до наведення. Кнопка просто «не
 * працює», і причина не видна ні в розмітці, ні в консолі, ні на знімку екрана.
 */

const SKIP = new Set(['node_modules', '.svelte-kit', 'build', 'dist', '.temp']);

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		if (SKIP.has(name)) return [];
		const full = join(dir, name);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

const SVELTE = walk('src').filter((f) => f.endsWith('.svelte'));

/** Відкривальні теги кнопок, у яких локатор закінчується на `-close-btn`. */
function closeButtonTags(): { file: string; tag: string }[] {
	const found: { file: string; tag: string }[] = [];
	for (const file of SVELTE) {
		const text = readFileSync(file, 'utf8');
		for (const m of text.matchAll(/<button[^>]*>/g)) {
			if (/data-testid=["'{`][^>]*-close-btn/.test(m[0])) found.push({ file, tag: m[0] });
		}
	}
	return found;
}

describe('кнопки закриття (UI-ELEMENTS-v8 § 3)', () => {
	const tags = closeButtonTags();

	it('перевірка жива — кнопки знайдено', () => {
		expect(SVELTE.length).toBeGreaterThan(10);
		expect(tags.length, 'жодної кнопки закриття не знайдено').toBeGreaterThan(0);
	});

	/**
	 * Підпис потрібен ЗНАЧКОВІЙ кнопці. Кнопка з видимим написом
	 * («Повернутись до навчання») уже має доступну назву — це сам напис, і
	 * `aria-label` там був би другою назвою поверх першої.
	 */
	it('значкова кнопка має aria-label, і він з i18n', () => {
		const bad: string[] = [];
		for (const file of SVELTE) {
			const text = readFileSync(file, 'utf8');
			for (const m of text.matchAll(
				/<button[^>]*data-testid=[^>]*-close-btn[^>]*>([\s\S]{0,200}?)<\/button>/g
			)) {
				const visible = m[1].replace(/<[^>]*>/g, '');
				if (/[\p{L}\d]/u.test(visible)) continue; // напис усередині — цього досить
				const tag = m[0].slice(0, m[0].indexOf('>') + 1);
				if (!/aria-label=/.test(tag)) bad.push(`${file}: без aria-label`);
				else if (/aria-label="[^"{]+"/.test(tag)) bad.push(`${file}: підпис захардкоджено`);
			}
		}
		expect(
			bad,
			'значкова кнопка без підпису або з захардкодженим підписом — диктор ' +
				'прочитає значок, а не дію, або прочитає її не тією мовою:\n  ' +
				bad.join('\n  ')
		).toEqual([]);
	});

	it('жоден компонент не оголошує власний transition для кнопки закриття', () => {
		const bad: string[] = [];
		for (const file of SVELTE) {
			const text = readFileSync(file, 'utf8');
			const classes = new Set<string>();
			for (const m of text.matchAll(/<button[^>]*>/g)) {
				if (!/data-testid=["'{`][^>]*-close-btn/.test(m[0])) continue;
				(/class="([^"]+)"/.exec(m[0])?.[1] ?? '')
					.split(/\s+/)
					.filter(Boolean)
					.forEach((c) => classes.add(c));
			}
			for (const cls of classes) {
				const re = new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`, 'g');
				for (const m of text.matchAll(re)) {
					if (/transition\s*:/.test(m[1])) bad.push(`${file}: .${cls}`);
				}
			}
		}
		expect(
			bad,
			'перехід для кнопки закриття оголошує лише глобальний CSS. Власний у ' +
				'компоненті переважує його через scoping Svelte, і якщо в переліку немає ' +
				`transform, оберт стається миттєво — тобто його не видно взагалі:\n  ${bad.join('\n  ')}`
		).toEqual([]);
	});

	it('вміст — значок, а не текстовий хрестик', () => {
		const bad: string[] = [];
		for (const file of SVELTE) {
			const text = readFileSync(file, 'utf8');
			for (const m of text.matchAll(
				/<button[^>]*data-testid=[^>]*-close-btn[^>]*>([\s\S]{0,80}?)<\/button>/g
			)) {
				if (/&times;|×/.test(m[1])) bad.push(`${file}: ${m[1].trim().slice(0, 40)}`);
			}
		}
		expect(
			bad,
			'текстовий хрестик замість значка: розмір і вирівнювання залежать від ' +
				`шрифту, а диктор озвучує × як знак множення:\n  ${bad.join('\n  ')}`
		).toEqual([]);
	});
});
