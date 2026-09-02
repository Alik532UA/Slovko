import { test, expect } from '@playwright/test';

/**
 * Клавіатура у вікні: пастка табуляції, Escape і повернення фокуса
 * (ACCESSIBILITY-v8 § 10.2, WCAG 2.4.3).
 *
 * ## Чому це не бачить axe
 *
 * `aria-modal="true"` каже читалці, що поза вікном нічого немає, і axe цим
 * задовольняється. Але атрибут не тримає ТАБУЛЯЦІЮ: браузер продовжує обхід
 * по сторінці позаду, тож кілька натискань Tab виводили фокус на невидимі
 * контроли гри під накладкою. Вікно було модальним для читалки й не було для
 * клавіатури — а машинно це видно лише в браузері, і лише якщо натискати.
 *
 * ## Що саме перевіряється
 *
 * Три твердження, кожне окремою перевіркою, бо ламаються вони незалежно:
 * фокус не залишає вікно; Escape закриває; після закриття фокус повертається
 * туди, звідки вікно відкрили (інакше наступний Tab починає обхід сторінки
 * спочатку — а вікна тут відкривають із нижньої панелі, тобто з кінця обходу).
 *
 * ## Зворотний експеримент
 *
 * Прибрати в `BaseModal.svelte` гілку `e.key === 'Tab'` — перша перевірка
 * мусить упасти з фокусом поза `[data-testid="level-topic-modal"]`. Прибрати
 * `returnFocusTo.focus()` в `onDestroy` — мусить упасти третя.
 */

const SEED_SETTINGS = { hasCompletedOnboarding: true };

const MODAL = 'level-topic-modal';

test.beforeEach(async ({ page }) => {
	await page.addInitScript((settings) => {
		localStorage.setItem('slovko_settings', JSON.stringify(settings));
	}, SEED_SETTINGS);
});

/** Чи лежить активний елемент усередині вікна. */
const focusInsideModal = (page: import('@playwright/test').Page) =>
	page.evaluate(
		(testid) =>
			document.querySelector(`[data-testid="${testid}"]`)?.contains(document.activeElement) ??
			false,
		MODAL
	);

test('Tab не випускає фокус із вікна', async ({ page }) => {
	await page.goto(`?modal=levels`);
	await expect(page.getByTestId(`${MODAL}-panel`)).toBeVisible({ timeout: 30_000 });

	/*
	 * Кількість натискань узята з ЗАПАСОМ до числа зупинок у вікні: пастка
	 * мусить триматися на другому й третьому колі, а не лише на першому.
	 * Рівно стільки, скільки контролів, було б перевіркою «дійшли до кінця»,
	 * а не «не вийшли».
	 */
	const stops = await page
		.getByTestId(MODAL)
		.locator('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')
		.count();
	expect(stops, 'у вікні немає зупинок табуляції — перевіряти нема чого').toBeGreaterThan(2);

	for (let i = 0; i < stops * 2 + 3; i += 1) {
		await page.keyboard.press('Tab');
		expect(await focusInsideModal(page), `фокус вийшов із вікна на ${i + 1}-му Tab`).toBe(true);
	}

	// Те саме назад: Shift+Tab із першої зупинки має перекинути в кінець, а не
	// на сторінку позаду.
	for (let i = 0; i < stops + 2; i += 1) {
		await page.keyboard.press('Shift+Tab');
		expect(
			await focusInsideModal(page),
			`фокус вийшов із вікна на ${i + 1}-му Shift+Tab`
		).toBe(true);
	}
});

test('Escape закриває вікно', async ({ page }) => {
	await page.goto(`?modal=levels`);
	await expect(page.getByTestId(`${MODAL}-panel`)).toBeVisible({ timeout: 30_000 });

	await page.keyboard.press('Escape');
	await expect(page.getByTestId(`${MODAL}-panel`)).toBeHidden();
});

test('після закриття фокус повертається на кнопку, що відкрила вікно', async ({ page }) => {
	await page.goto('');
	const opener = page.getByTestId('level-topic-selector-btn');
	await expect(opener).toBeVisible({ timeout: 30_000 });

	await opener.focus();
	await opener.press('Enter');
	await expect(page.getByTestId(`${MODAL}-panel`)).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(page.getByTestId(`${MODAL}-panel`)).toBeHidden();

	await expect(opener).toBeFocused();
});
