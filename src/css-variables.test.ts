// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

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

/**
 * `light-dark()` з НЕколірним аргументом (UI-UX-v8 § 1.5.1).
 *
 * Це той самий наслідок, що й у перевірки вище — властивість зникає цілком, —
 * але інша причина: змінна ОГОЛОШЕНА, просто її значення недійсне там, де її
 * вживають. Тому попередній гейт її не бачив і бачити не міг.
 *
 * `light-dark()` — функція кольору, і приймає вона лише `<color>`. Довжина,
 * `url()` чи ціла тінь зі зсувами в ній недійсні. Мовчання при цьому повне:
 * оголошення користувацької змінної приймає будь-які лексеми, тож ні збірка,
 * ні `svelte-check`, ні консоль браузера не кажуть нічого — властивість просто
 * не застосовується.
 *
 * ЦІНА ЦЬОГО ВЖЕ ЗАПЛАЧЕНА. Коміт `62814080` перевів 37 токенів на
 * `light-dark()`, і пʼять із них були неколірні. Заміряно на проді 0.7.625:
 * `background-image` на `html` і на `body` — `none` (тло-картинки не було
 * зовсім), `backdrop-filter` накладки онбордингу — `none`, тінь мали 0
 * елементів із 198. Виглядало це як «крізь накладку видно гру», тобто симптом
 * вказував на онбординг, а причина лежала в палітрі.
 *
 * Зворотний експеримент (AI-AGENT-PITFALLS-v8 § 1.1): повернути в `app.css`
 * `--glass-blur: light-dark(8px, 12px)` — перевірка мусить назвати саме цей
 * виклик і саме той файл.
 */

/** Функції, що дають КОЛІР. `url()` тут немає, і це весь зміст переліку. */
const COLOR_FUNCTIONS = new Set([
	'rgb',
	'rgba',
	'hsl',
	'hsla',
	'hwb',
	'lab',
	'lch',
	'oklab',
	'oklch',
	'color',
	'color-mix',
	'light-dark',
	// `var()` пропускається наскрізь: що в ній — знає перевірка вище, ця про форму.
	'var'
]);

/**
 * Текст без коментарів.
 *
 * Обовʼязково: у `app.css` `light-dark()` згадується СЛОВАМИ — і в описі самої
 * механіки, і в записі про те, чому пʼять токенів її не використовують. Без
 * цього кроку гейт ловив би власну документацію.
 */
function stripComments(text: string): string {
	return text.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** Аргументи кожного `light-dark(...)` — з урахуванням вкладених дужок. */
function lightDarkCalls(text: string): { args: string[]; raw: string }[] {
	const calls: { args: string[]; raw: string }[] = [];
	const needle = 'light-dark(';

	for (let start = text.indexOf(needle); start !== -1; start = text.indexOf(needle, start + 1)) {
		let depth = 0;
		let end = -1;
		for (let i = start + needle.length - 1; i < text.length; i++) {
			if (text[i] === '(') depth++;
			else if (text[i] === ')' && --depth === 0) {
				end = i;
				break;
			}
		}
		// Незбалансовані дужки — це не наша перевірка, про них скаже збірка.
		if (end === -1) continue;

		const args: string[] = [];
		let level = 0;
		let current = '';
		for (const ch of text.slice(start + needle.length, end)) {
			if (ch === '(') level++;
			else if (ch === ')') level--;
			if (ch === ',' && level === 0) {
				args.push(current.trim());
				current = '';
				continue;
			}
			current += ch;
		}
		args.push(current.trim());
		calls.push({ args, raw: text.slice(start, end + 1) });
	}
	return calls;
}

function isColor(arg: string): boolean {
	if (arg === '') return false;
	if (/^#[0-9a-fA-F]{3,8}$/.test(arg)) return true;
	// Іменований колір, `transparent`, `currentColor` — самі літери, без одиниць.
	if (/^[a-zA-Z]+$/.test(arg)) return true;

	const open = arg.indexOf('(');
	if (open === -1) return false;
	const name = arg.slice(0, open).trim();
	if (!/^[a-zA-Z-]+$/.test(name) || !COLOR_FUNCTIONS.has(name.toLowerCase())) return false;

	/*
	 * Дужка функції мусить закриватися САМИМ КІНЦЕМ аргумента.
	 *
	 * Без цієї умови `0 2px 8px rgba(0, 0, 0, 0.2)` не пройшло б, а от
	 * `rgba(0, 0, 0, 0.2) 0 2px 8px` — пройшло: жадібний розбір узяв би перше
	 * імʼя функції й вирішив, що це колір. Тобто перевірка мовчала б рівно на
	 * тому дефекті, проти якого стоїть, залежно від порядку слів у значенні.
	 */
	let depth = 0;
	for (let i = open; i < arg.length; i++) {
		if (arg[i] === '(') depth++;
		else if (arg[i] === ')' && --depth === 0) return i === arg.length - 1;
	}
	return false;
}

describe('light-dark() приймає лише колір (UI-UX-v8 § 1.5.1)', () => {
	const calls = FILES.flatMap((file) =>
		lightDarkCalls(stripComments(readFileSync(file, 'utf8'))).map((call) => ({ file, ...call }))
	);

	it('перевірка жива: виклики light-dark() знайдено', () => {
		expect(
			calls.length,
			'жодного light-dark() у стилях — або сканер шукає не там, або палітру ' +
				'переписали, і тоді цей гейт треба не лагодити, а прибирати'
		).toBeGreaterThan(25);
	});

	it('розбір аргументів живий: колір відрізняється від довжини й url()', () => {
		// Без цього перевірка нижче була б зелена й на завжди-true `isColor`.
		expect(isColor('#f5f6fa')).toBe(true);
		expect(isColor('rgba(var(--accent-rgb), 0.15)')).toBe(true);
		expect(isColor('light-dark(#4b5563, #a0a0a0)')).toBe(true);
		expect(isColor('transparent')).toBe(true);
		expect(isColor('8px'), 'довжина — не колір').toBe(false);
		expect(isColor('url("/images/a.webp")'), 'url() — не колір').toBe(false);
		expect(isColor('0 2px 8px rgba(0, 0, 0, 0.2)'), 'ціла тінь — не колір').toBe(false);
		expect(isColor('rgba(0, 0, 0, 0.2) 0 2px 8px'), 'колір плюс зсуви — не колір').toBe(false);
	});

	it('обидва аргументи кожного виклику — кольори', () => {
		const broken = calls
			.filter((call) => call.args.length !== 2 || !call.args.every(isColor))
			.map((call) => `${call.file}: ${call.raw}`)
			.sort();

		expect(
			broken,
			'неколірний аргумент робить значення недійсним, і властивість зникає ' +
				`ЦІЛКОМ — мовчки, без жодного попередження:\n  ${broken.join('\n  ')}`
		).toEqual([]);
	});
});

/**
 * Системну перевагу питає лише той, хто ОБИРАЄ тему (UI-UX-v8 § 1.5,
 * `UIUX-LIGHT-DARK-SKIP`).
 *
 * Тем тут чотири, обирає їх користувач, і вибір живе в `data-theme` на
 * `<html>`. Система має право на голос рівно в одній ролі — підказати, з чого
 * почати, доки вибору ще немає. Рівно це роблять три дозволені місця, і кожне
 * після себе ЛИШАЄ вибір, а не малює по ньому.
 *
 * Будь-який інший файл, що питає `prefers-color-scheme`, малює себе за
 * налаштуванням СИСТЕМИ, поки сторінка навколо йде за вибором КОРИСТУВАЧА. Це
 * друге джерело того самого рішення, і воно ні з чим не звіряється —
 * розходження видно в обидва боки: світла ОС при темі `dark-gray` дає світлий
 * елемент на темній сторінці, темна ОС при світлій темі — навпаки. А для тем
 * `orange` і `green` правильного варіанта немає взагалі: медіазапит знає дві
 * схеми, а не чотири.
 *
 * Саме так і жив `NetworkIndicator`: біле коло, що темніло від налаштування
 * системи, поки решта сторінки слухала вибір користувача. Помітно це рівно
 * тоді, коли зникає мережа, тобто в момент, коли на екран і дивляться.
 *
 * Решта `prefers-*` (`reduced-motion`, `contrast`) під правило не підпадає: за
 * ними в застосунку немає власного вибору, який вони могли б дублювати.
 *
 * Зворотний експеримент: додати `@media (prefers-color-scheme: dark)` у
 * будь-який компонент — перевірка мусить назвати саме той файл. Пройдено на
 * `NetworkIndicator` перед тим, як його виправили.
 */
describe('перевагу кольорової схеми питає лише вибір теми (UI-UX-v8 § 1.5)', () => {
	/**
	 * Три місця, де перевага читається, щоб ЗРОБИТИ вибір, а не обійти його.
	 * Перелік із причинами, а не голий масив: без причини він стане місцем,
	 * куди дописують усе, що почервоніло.
	 */
	const THEME_CHOICE: Record<string, string> = {
		'src/app.css': 'блок html:not([data-theme]) — тло й розмиття, поки вибору ще немає',
		'src/app.html': 'скрипт першого кадру: саме він і виставляє data-theme',
		'src/routes/+layout.svelte':
			'слухач change: коли ОС перемикається, застосунок ПЕРЕОБИРАЄ тему через setTheme, і лише в межах пари dark-gray/light-gray'
	};

	const asked = walk('src')
		.filter((f) => /\.(svelte|css|html|ts)$/.test(f))
		.filter((f) => !/\.(test|spec)\.ts$/.test(f))
		// Коментар, що ПОЯСНЮЄ це правило, не є його порушенням — інакше файл
		// із розбором власного дефекту потрапляв би в перелік замість дефекту.
		.filter((f) => /prefers-color-scheme/.test(stripComments(readFileSync(f, 'utf8'))))
		.map((f) => f.split(sep).join('/'))
		.sort();

	it('перевірка жива: сам вибір теми знайдено', () => {
		// Порожній результат тут означав би не «порушень немає», а що сканер
		// дивиться не туди: три дозволені місця мусять знайтися завжди.
		expect(asked.filter((f) => f in THEME_CHOICE)).toEqual(Object.keys(THEME_CHOICE).sort());
	});

	it('поза вибором теми ніхто не питає систему', () => {
		const offenders = asked.filter((f) => !(f in THEME_CHOICE));
		expect(
			offenders,
			'елемент піде за налаштуванням СИСТЕМИ, поки сторінка йде за вибором ' +
				`користувача — і в темах поза парою light/dark правильного варіанта ` +
				`не буде взагалі:\n  ${offenders.join('\n  ')}`
		).toEqual([]);
	});
});
