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

/**
 * Розбір тега вручну, а не регуляркою `<button[^>]*>`.
 *
 * Клас дефекту з AI-AGENT-PITFALLS-v8 § 1.1: попередня версія цих перевірок
 * шукала тег як «`<button`, далі що завгодно без `>`». У Svelte такий тег
 * трапляється рідко — досить одного `onclick={() => close()}`, і `[^>]*`
 * спиняється на стрілці. Кнопка з обробником-стрілкою ставала для перевірок
 * НЕВИДИМОЮ. Саме так `toast-close-btn` роками жив без `aria-label` при
 * зелених тестах: інваріант його не бачив.
 *
 * Тому кінець відкривального тега шукається сканером зі станом — усередині
 * лапок і фігурних дужок символ `>` тегом не вважається.
 */
type Tag = { file: string; tag: string; end: number; start: number };

function buttonTags(file: string, text: string): Tag[] {
	const tags: Tag[] = [];
	for (const m of text.matchAll(/<button(?=[\s/>])/g)) {
		let i = m.index + m[0].length;
		let quote: string | null = null;
		let depth = 0;
		for (; i < text.length; i++) {
			const ch = text[i];
			if (quote) {
				if (ch === quote) quote = null;
				continue;
			}
			if (ch === '"' || ch === "'" || ch === '`') quote = ch;
			else if (ch === '{') depth++;
			else if (ch === '}') depth--;
			else if (ch === '>' && depth === 0) break;
		}
		tags.push({ file, tag: text.slice(m.index, i + 1), start: m.index, end: i + 1 });
	}
	return tags;
}

function isCloseButton(tag: string): boolean {
	return /data-testid=["'{`][^"'`]*-close-btn/.test(tag);
}

/** Вміст кнопки до найближчого `</button>` — для перевірки видимого напису. */
function bodyOf(text: string, tag: Tag): string {
	const close = text.indexOf('</button>', tag.end);
	return close === -1 ? '' : text.slice(tag.end, close);
}

/** Відкривальні теги кнопок, у яких локатор закінчується на `-close-btn`. */
function closeButtonTags(): { file: string; tag: string }[] {
	const found: { file: string; tag: string }[] = [];
	for (const file of SVELTE) {
		const text = readFileSync(file, 'utf8');
		for (const tag of buttonTags(file, text)) {
			if (isCloseButton(tag.tag)) found.push({ file, tag: tag.tag });
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
	 * Canary саме на цей клас сліпоти. Кількість знайдених сканером кнопок
	 * звіряється з кількістю локаторів `-close-btn` у джерелах: вони мусять
	 * збігатися. Поки тег шукали регуляркою, збігу не було — і про це ніхто не
	 * дізнався, бо решта перевірок від цього лише зеленіла.
	 */
	it('сканер бачить УСІ кнопки закриття, а не лише зручні', () => {
		const declared = SVELTE.reduce(
			(sum, file) => sum + (readFileSync(file, 'utf8').match(/data-testid=[^\n]*-close-btn/g) ?? []).length,
			0
		);
		expect(declared, 'локаторів -close-btn не знайдено — перевіряти нема що').toBeGreaterThan(0);
		expect(
			tags.length,
			'сканер знаходить менше кнопок, ніж локаторів у джерелах: частина тегів ' +
				'лишається невидимою для всіх перевірок нижче'
		).toBe(declared);
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
			for (const tag of buttonTags(file, text)) {
				if (!isCloseButton(tag.tag)) continue;
				const visible = bodyOf(text, tag).replace(/<[^>]*>/g, '');
				if (/[\p{L}\d]/u.test(visible)) continue; // напис усередині — цього досить
				if (!/aria-label=/.test(tag.tag)) bad.push(`${file}: без aria-label`);
				else if (/aria-label="[^"{]+"/.test(tag.tag)) bad.push(`${file}: підпис захардкоджено`);
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
			for (const tag of buttonTags(file, text)) {
				if (!isCloseButton(tag.tag)) continue;
				(/class="([^"]+)"/.exec(tag.tag)?.[1] ?? '')
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
			for (const tag of buttonTags(file, text)) {
				if (!isCloseButton(tag.tag)) continue;
				const body = bodyOf(text, tag);
				if (/&times;|×/.test(body)) bad.push(`${file}: ${body.trim().slice(0, 40)}`);
			}
		}
		expect(
			bad,
			'текстовий хрестик замість значка: розмір і вирівнювання залежать від ' +
				`шрифту, а диктор озвучує × як знак множення:\n  ${bad.join('\n  ')}`
		).toEqual([]);
	});
});
