import { test, expect } from '@playwright/test';

/**
 * Рантайм-дублікати `data-testid` (TESTID-AND-NAMING-v8 § 1.9.2).
 *
 * Статична перевірка (`src/testid-conventions.test.ts`) бачить усі testid у
 * джерелах, але не бачить, що один компонент відрендерився на сторінці двічі.
 * Тоді два різні елементи відповідають одному селектору, і Playwright бере
 * перший-ліпший — тест зелений, а перевіряє не те.
 *
 * Застосунок односторінковий: маршрут один, а модалки відкриваються параметром
 * `?modal=`. Тому перелік — не список сторінок, а список СТАНІВ. Без них
 * перевірка після `goto('/')` не бачила б жодної модалки, а це рівно ті місця,
 * де дублікати й живуть: п'ять модалок мають спільні кнопки закриття, спільні
 * таби й спільні списки (§ 1.9.2 — межа перевірки після goto).
 */
/**
 * Для кожного стану — локатор, який мусить бути на екрані. Без нього перевірка
 * лише вдавала б, що дивиться в модалку: базова сторінка завжди має якісь
 * testid, тому канарка «їх більше нуля» пройшла б і на закритій модалці.
 */
const STATES: { path: string; marker: string }[] = [
	{ path: '/', marker: 'app-root-container' },
	{ path: '/?modal=levels', marker: 'level-topic-modal-panel' },
	{ path: '/?modal=languages', marker: 'language-settings-modal' },
	{ path: '/?modal=about', marker: 'about-modal-panel' },
	{ path: '/?modal=themes', marker: 'confirm-theme-btn' },
	{ path: '/?modal=stats&tab=stats', marker: 'stats-panel' },
	{ path: '/?modal=stats&tab=leaderboard', marker: 'stats-panel' },
	{ path: '/?modal=profile&tab=account', marker: 'profile-panel' },
	{ path: '/?modal=profile&tab=friends', marker: 'profile-panel' }
];

/**
 * Онбординг-модалка накриває застосунок на чистому профілі, і тоді жодна
 * модалка з `?modal=` не доїжджає до екрана. Без цього кроку перевірка чекала б
 * маркер до таймауту — а в попередній версії, де чекали «будь-який testid»,
 * вона просто міряла онбординг і звітувала успіх.
 */
const SEED_SETTINGS = { hasCompletedOnboarding: true };

for (const { path, marker } of STATES) {
	test(`unique data-testid on ${path}`, async ({ page }) => {
		await page.addInitScript((settings) => {
			localStorage.setItem('slovko_settings', JSON.stringify(settings));
		}, SEED_SETTINGS);
		await page.goto(path);
		// Чекаємо саме на маркер стану, а не на будь-який testid: модалка
		// монтується після гідратації, і без цього тест міряв би базову сторінку.
		await page.waitForSelector(`[data-testid="${marker}"]`);

		const ids = await page.$$eval('[data-testid]', (els) =>
			els.map((el) => el.getAttribute('data-testid')).filter(Boolean)
		);

		// Канарка: якщо селектор колись перестане щось знаходити, перевірка
		// мусить впасти, а не звітувати «дублікатів немає».
		expect(ids.length, `${path}: жодного data-testid — перевірка мертва`).toBeGreaterThan(0);
		expect(ids, `${path}: маркер стану «${marker}» не з'явився`).toContain(marker);

		const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
		expect(dupes, `Duplicate data-testid: ${[...new Set(dupes)].join(', ')}`).toEqual([]);
	});
}
