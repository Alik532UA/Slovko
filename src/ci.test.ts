import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

/**
 * CI-CD-AND-TOOLS-v8 § 3 — workflow теж код, і його стан перевіряється.
 *
 * Пайплайн живе поза межами всіх інших гейтів: `svelte-check` його не читає,
 * ESLint не читає, тести не читають. Помилка в ньому виявляється або на
 * наступному push (у кращому разі), або взагалі ніколи — коли крок мовчки
 * перестає щось перевіряти, а зелена галочка лишається.
 */
const DIR = '.github/workflows';

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f)) : [];
const all = files.map((f) => readFileSync(`${DIR}/${f}`, 'utf8')).join('\n');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
	scripts?: Record<string, string>;
};
const scripts = pkg.scripts ?? {};

/**
 * Коментарі відрізаються перед пошуком. Інакше пояснення «було
 * `cancel-in-progress: true`, і ось чим це скінчилося» саме́ й валить перевірку —
 * тобто правило забороняло б розповідати, чому воно існує.
 */
function withoutYamlComments(source: string): string {
	return source.replace(/^\s*#.*$/gm, '');
}

describe('перевірка жива', () => {
	it('workflow знайдено', () => {
		expect(files.length, 'у .github/workflows немає жодного yml — перевіряти нема що').toBeGreaterThan(0);
	});
});

/**
 * Синтаксис самого файлу — перевірка, якої тут бракувало найдорожче.
 *
 * Решта перевірок цього файлу читає workflow РЕГЕКСАМИ ПО ТЕКСТУ. Це працює для
 * «чи є крок із тестами», але означає, що файл, який узагалі не є YAML, проходить
 * їх усі: регекс знайде свій рядок і в зламаному документі.
 *
 * Так і сталося 2026-08-20. У назву кроку потрапила двокрапка:
 *
 *     - name: E2E (прев'ю зібраного сайту: testid invariant + smoke + axe)
 *
 * Незакутий скаляр із `: ` YAML читає як вкладене відображення, тож ВЕСЬ файл
 * став невалідним. Локально зелено було все: `lint`, `check`, 250 юніт-перевірок,
 * 17 e2e. GitHub натомість відмовився запускати пайплайн цілком — «Invalid
 * workflow file, line 118» — і заразом упали три відкриті PR від Dependabot,
 * бо вони беруть той самий файл із `main`.
 *
 * Ціна саме така: не «один крок не виконався», а «не виконався жоден гейт, і
 * деплою не було». Тому перевірка ставиться перша й найдешевша — документ мусить
 * розібратися парсером, а не регексом.
 *
 * `js-yaml` заведено в `devDependencies` навмисно, хоч він і лежав у дереві
 * транзитивно: перевірка на транзитивному пакеті помирає від чужого оновлення,
 * і помирає тихо — з ним зникне і сам гейт.
 */
describe('синтаксис workflow', () => {
	it.each(files)('«%s» розбирається як YAML', (file) => {
		const source = readFileSync(`${DIR}/${file}`, 'utf8');
		expect(
			() => load(source),
			'GitHub відмовиться запускати пайплайн ЦІЛКОМ — жоден гейт не виконається, ' +
				'а локально всі перевірки лишаться зеленими'
		).not.toThrow();
	});

	/**
	 * Ту саму пастку видно й дешевше — без парсера, зате з точним пальцем: назва
	 * кроку з `: ` усередині. Дублювання тут навмисне: повідомлення парсера
	 * («bad indentation of a mapping entry») не називає ні причини, ні лікування.
	 */
	it.each(files)('«%s»: жодна назва кроку не містить незакутої двокрапки', (file) => {
		const bad: string[] = [];
		readFileSync(`${DIR}/${file}`, 'utf8')
			.split('\n')
			.forEach((line, index) => {
				const value = /^\s*-?\s*name:\s*(.*)$/.exec(line)?.[1];
				if (!value) return;
				const quoted = /^["'].*["']$/.test(value.trim());
				if (!quoted && /:\s/.test(value)) bad.push(`${file}:${index + 1} — ${value.trim()}`);
			});
		expect(
			bad,
			`двокрапка з пробілом у незакутій назві робить із неї відображення:\n${bad.join('\n')}`
		).toEqual([]);
	});

	/**
	 * І структура, яку регекс не бачить у принципі: кожен крок мусить щось
	 * РОБИТИ. Крок з однією назвою — це не помилка синтаксису, а порожнє місце,
	 * що читається як покриття.
	 */
	it.each(files)('«%s»: кожен крок має run або uses', (file) => {
		const doc = load(readFileSync(`${DIR}/${file}`, 'utf8')) as {
			jobs?: Record<string, { steps?: Array<Record<string, unknown>> }>;
		};
		const jobs = Object.entries(doc.jobs ?? {});
		expect(jobs.length, 'у workflow немає жодного джоба — перевіряти нема що').toBeGreaterThan(0);

		const empty: string[] = [];
		for (const [jobName, job] of jobs) {
			for (const step of job.steps ?? []) {
				if (!('run' in step) && !('uses' in step)) {
					empty.push(`${file} → ${jobName} → ${String(step.name ?? '(без назви)')}`);
				}
			}
		}
		expect(empty, `крок, який нічого не робить:\n${empty.join('\n')}`).toEqual([]);
	});
});

describe('CI', () => {
	it('тести запускаються в CI (§ 1.6)', () => {
		expect(/run:\s*npm (test|run test)/.test(all), 'у workflow немає кроку з тестами').toBe(true);
	});

	it('використовується npm ci, а не npm install', () => {
		expect(/run:\s*npm install\b/.test(all), 'npm install робить білд невідтворюваним').toBe(
			false
		);
	});

	it('Playwright має крок встановлення браузерів (§ 1.3)', () => {
		if (!/playwright test/.test(all)) return;
		expect(/playwright install/.test(all), 'без install крок падає на відсутньому браузері').toBe(
			true
		);
	});

	it('жоден тестовий скрипт не у watch-режимі (§ 1.4)', () => {
		// Не лише `test`: гейтом у workflow буває `test:unit`, `test:report`,
		// `test:ci` — і саме там watch і зустрічається, бо `test` перевіряють, а
		// решту ні. `test:watch` виключений навмисно: він для цього й існує.
		const watchers = Object.entries(scripts)
			.filter(([name]) => /^test(:|$)/.test(name) && name !== 'test:watch')
			.filter(([, cmd]) => /^vitest\s*$/.test(cmd));
		expect(watchers, 'watch-режим підвисне поза CI, де немає CI=true').toEqual([]);
	});

	/**
	 * CI-CD-AND-TOOLS-v8 § 1.3 плюс AI-AGENT-PITFALLS-v8 § 1.4 — і другий тут
	 * важливіший за перший, бо описує випадок саме цього репозиторію.
	 *
	 * `cancel-in-progress: true` разом із пушем пачкою комітів дає прогін, якого
	 * не було: група лишає останній, а той, який УПЕРШЕ виконав би новий гейт,
	 * скасовується до цього кроку. Гейт при цьому не червоний і не зелений — у
	 * переліку кроків він просто відсутній, і це читається як «усе гаразд».
	 */
	it('деплой-пайплайн не скасовує проміжні прогони (§ 1.3)', () => {
		const offenders = files.filter((f) =>
			/cancel-in-progress:\s*true/.test(withoutYamlComments(readFileSync(`${DIR}/${f}`, 'utf8')))
		);
		expect(
			offenders,
			'скасований прогін = гейт, про який невідомо, чи він виконувався: ' +
				offenders.join(', ')
		).toEqual([]);
	});

	/**
	 * CI-CD-AND-TOOLS-v8 § 1.5 — єдина машинна перевірка правила «артефакт
	 * збірки не комітиться». Крок перевіряється лише в тому workflow, який
	 * справді збирає: у решті йому нема що ловити.
	 */
	it('після збірки стоїть git diff --exit-code (§ 1.5)', () => {
		const missing = files.filter((f) => {
			const source = readFileSync(`${DIR}/${f}`, 'utf8');
			return /run:\s*npm run build/.test(source) && !/git diff --exit-code/.test(source);
		});
		expect(
			missing,
			`збірка може мовчки міняти відстежувані файли, і цього ніхто не побачить: ${missing.join(', ')}`
		).toEqual([]);
	});

	/**
	 * Пункт поза шаблоном пакета — знайдений у цих проєктах.
	 *
	 * Workflow кличе npm-скрипти за іменем. Перейменування скрипта в
	 * `package.json` не ламає нічого локально й нічого не ламає на збірці: воно
	 * ламає рівно той крок CI, який на нього посилався, і виявляється це вже
	 * після push. Тут це видно до коміту.
	 */
	it('кожен npm-скрипт із workflow існує в package.json', () => {
		const referenced = [...all.matchAll(/run:\s*npm run ([\w:-]+)/g)].map((m) => m[1]);
		const missing = [...new Set(referenced)].filter((name) => !(name in scripts));
		expect(
			missing,
			`workflow кличе скрипт, якого немає — крок упаде на push: ${missing.join(', ')}`
		).toEqual([]);
	});

	/**
	 * CODE-QUALITY-v8 § 5.7 — E2E ходить по ЗІБРАНОМУ сайту.
	 *
	 * Правило коштує рівно стільки, скільки коштує його порушення: доти
	 * `webServer` піднімав `vite dev`, і три класи дефектів були поза
	 * досяжністю всього E2E — політика безпеки (заголовок із nonce замість
	 * мета-тега з хешами), порядок CSS (інжекція скриптом замість `<link>`) і
	 * сама пререндер-розмітка. Асерт `smoke.spec.ts` про «CSP нічого не
	 * заблокувала» при цьому був зелений — він просто перевіряв іншу політику.
	 *
	 * Перевіряти командою, а не поведінкою: різницю між dev і прев'ю не видно
	 * ніяк, окрім прочитаного конфігу. Реверс-експеримент виконано —
	 * `script-src` без хешів валить `smoke.spec.ts` на прев'ю і не валив на dev.
	 */
	it("E2E піднімає превʼю зібраного сайту, а не dev-сервер (§ 5.7)", () => {
		const config = readFileSync('playwright.config.ts', 'utf8');
		const command = /command:\s*`([^`]+)`/.exec(config)?.[1];

		expect(command, 'у playwright.config.ts немає webServer.command').toBeDefined();
		expect(
			/\bvite preview\b|\bnpm run preview\b/.test(command!),
			`webServer підіймає «${command}» — превʼю зібраного сайту тут немає`
		).toBe(true);
		expect(
			/\bnpm run dev\b|\bvite dev\b/.test(command!),
			`webServer підіймає dev-сервер («${command}») — це інший застосунок, ніж той, що їде на хостинг`
		).toBe(false);
		expect(
			/\bnpm run build\b/.test(command!),
			"превʼю без збірки віддає СТАРУ збірку — падіння виглядатиме як регресія у свіжому коді"
		).toBe(true);
	});

	/**
	 * Та сама § 5.7: локаль браузера задається явно.
	 *
	 * Playwright типово ставить `en-US`, а початкова мова застосунку береться з
	 * `getLocaleFromNavigator()`. Без цього рядка весь E2E ходить по
	 * англійській версії — не по тій, що в `<html lang="uk">` збірки.
	 */
	it('локаль браузера в E2E задана явно (§ 5.7)', () => {
		const config = readFileSync('playwright.config.ts', 'utf8');
		expect(
			/locale:\s*['"`][a-z]{2}(-[A-Z]{2})?['"`]/.test(config),
			'локаль не задана — тести ходять по en-US незалежно від мови сайту'
		).toBe(true);
	});
});
