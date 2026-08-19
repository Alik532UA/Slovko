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
 * Перелік станів живе в `src/lib/config/appStates.ts` — одним файлом на весь
 * проєкт. Другий список, який тримають узгодженим руками, розійшовся б із
 * першим на першому ж доданому екрані; тут його читає і ця перевірка, і
 * інваріант чеклиста бета-тестування (BETA-CHECKLIST-v8 § 5.1).
 *
 * Шляхи релятивні, без провідного слеша: `base` проєкту — `/Slovko`, і він
 * тепер входить у `baseURL` (CODE-QUALITY-v8 § 5.4). `new URL('/x', base)`
 * відкинув би базовий шлях цілком.
 */
import { APP_STATES } from '../../src/lib/config/appStates';

const STATES = APP_STATES;

/**
 * Онбординг-модалка накриває застосунок на чистому профілі, і тоді жодна
 * модалка з `?modal=` не доїжджає до екрана. Без цього кроку перевірка чекала б
 * маркер до таймауту — а в попередній версії, де чекали «будь-який testid»,
 * вона просто міряла онбординг і звітувала успіх.
 */
const SEED_SETTINGS = { hasCompletedOnboarding: true };

for (const { path, marker } of STATES) {
	test(`unique data-testid on ${path || '(корінь)'}`, async ({ page }) => {
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
