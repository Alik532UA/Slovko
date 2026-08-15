import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
});
