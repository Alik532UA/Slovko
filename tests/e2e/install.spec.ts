import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './fixtures';
import { waitForAnimationsToSettle } from './settled';

/**
 * Встановлення застосунку (канон FULLSCREEN-INSTALL § 4.3, § 5, § 8.2).
 *
 * Кнопка встановлення у «Про проєкт» віддає натиск вікну САМОГО браузера, де воно є
 * (Chromium), і показує кроки під пристрій і браузер, де його немає. Юніти стережуть вибір
 * інструкції й сховок події; тут — що справжня сторінка це робить: подію ловить скрипт
 * першого кадру, кроки — нумерованим списком, значки й тексти — ті, що в інструкції.
 *
 * Сторінка — «Про проєкт» без входу: анонімного сеансу застосунок сам не створює.
 *
 * Зворотні експерименти, кожен червоний: «Встановити» завжди показує кроки — «вікно
 * браузера є»; слухач події не в `app.html` — той самий тест; кроки не списком — «кроки
 * для комп'ютера»; Edge у загальній гілці — «Edge на комп'ютері»; iPad без
 * `maxTouchPoints` — «iPad»; текст попередження бурштиновим — «попередження читається»
 * у світлій і зеленій темах.
 */

const uk = JSON.parse(readFileSync('src/lib/i18n/translations/uk.json', 'utf8'));

const UA = {
	iphoneSafari:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
	iphoneChrome:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.46 Mobile/15E148 Safari/604.1',
	/** iPadOS у Safari звітує як Mac; відрізняє його лише сенсорний екран. */
	macLikeSafari:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
	androidEdge:
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 EdgA/129.0.2792.84',
	windowsEdge:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
	instagram:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.25.108 (iPhone15,2; iOS 18_0; uk_UA; uk)'
};

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

async function seed(page: Page, settings: Record<string, unknown> = {}) {
	await page.addInitScript((value) => {
		localStorage.setItem('slovko_settings', JSON.stringify(value));
		localStorage.setItem('slovko_interfaceLanguage', 'uk');
	}, { hasCompletedOnboarding: true, interfaceLanguage: 'uk', ...settings });
}

/**
 * Справжня подія — лише коли Chromium захоче, тож тест кроків перехоплює її ще до
 * застосунку: слухач у фазі захоплення стоїть раніше за слухача першого кадру.
 */
async function withoutBrowserPrompt(page: Page) {
	await page.addInitScript(() => {
		window.addEventListener('beforeinstallprompt', (event) => event.stopImmediatePropagation(), {
			capture: true
		});
	});
}

async function openAbout(page: Page) {
	await page.goto('?modal=about');
	await expect(page.getByTestId('about-modal-panel')).toBeVisible({ timeout: 30_000 });
}

async function openSteps(page: Page) {
	await openAbout(page);
	await page.getByTestId('about-modal-install-btn').click();
	await expect(page.getByTestId('install-guide-panel')).toBeVisible();
}

/** Тексти кроків на екрані — рівно ті, що в словнику, у тому самому порядку. */
async function expectSteps(page: Page, keys: string[]) {
	const list = page.getByTestId('install-guide-steps-container');
	await expect(list.locator(':scope > li')).toHaveCount(keys.length);
	for (const [i, key] of keys.entries()) {
		await expect(page.getByTestId(`install-guide-step-text-${i + 1}`)).toHaveText(uk.pwa.step[key]);
	}
}

const icon = (page: Page, step: number) =>
	page.getByTestId(`install-guide-step-icon-${step}`).locator('svg');

test('сайт придатний до встановлення: у Chromium немає жодного заперечення', async ({ page }) => {
	await seed(page);
	await page.goto('');
	await expect(page.getByTestId('app-root-container')).toBeVisible({ timeout: 30_000 });

	// Справжньої події headless Chromium не кидає, тож питаємо його самого. Зламаний маніфест
	// чи значок тут червоніє, а не тихо прибирає вікно браузера «Встановити».
	const cdp = await page.context().newCDPSession(page);
	await expect
		.poll(
			async () =>
				(await cdp.send('Page.getInstallabilityErrors')).installabilityErrors.map(
					(error) => error.errorId
				),
			{ timeout: 15_000 }
		)
		.toEqual([]);
});

test('вікно браузера є — натиск іде йому, і кроків Slovko немає', async ({ page }) => {
	await seed(page);
	await openAbout(page);

	const caught = await page.evaluate(() => {
		const calls = window as unknown as { installPrompts?: number; __pwaInstallPrompt?: Event };
		const event = new Event('beforeinstallprompt', { cancelable: true });
		Object.assign(event, {
			prompt: () => {
				calls.installPrompts = (calls.installPrompts ?? 0) + 1;
				return Promise.resolve();
			},
			userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' })
		});
		window.dispatchEvent(event);
		return { silenced: event.defaultPrevented, stashed: calls.__pwaInstallPrompt === event };
	});
	expect(caught, 'подію ловить скрипт першого кадру й глушить смужку браузера').toEqual({
		silenced: true,
		stashed: true
	});

	const prompts = () =>
		page.evaluate(() => (window as unknown as { installPrompts?: number }).installPrompts ?? 0);

	await page.getByTestId('about-modal-install-btn').click();
	await expect.poll(prompts).toBe(1);
	await expect(page.getByTestId('install-guide-panel')).toHaveCount(0);

	// Подію показують лише раз: другий натиск — уже кроки, а вікна браузера вдруге немає.
	await page.getByTestId('about-modal-install-btn').click();
	await expect(page.getByTestId('install-guide-panel')).toBeVisible();
	expect(await prompts()).toBe(1);
});

test("вікна браузера немає — нумеровані кроки для комп'ютера", async ({ page }) => {
	await withoutBrowserPrompt(page);
	await seed(page);
	await openSteps(page);

	await expect(page.getByTestId('install-guide-title')).toHaveText(uk.pwa.title.desktop);
	await expect(page.getByTestId('install-guide-subtitle-text')).toHaveText(uk.pwa.note.manual);
	await expectSteps(page, ['installIcon', 'confirm', 'openApp']);

	// Список для читалки: «список, 3 пункти», а видимий номер вона не повторює.
	const list = page.getByTestId('install-guide-steps-container');
	expect(await list.evaluate((el) => el.tagName)).toBe('OL');
	await expect(list).toHaveAttribute('role', 'list');
	await expect(page.getByTestId('install-guide-num-badge-1')).toHaveAttribute('aria-hidden', 'true');

	await expect(icon(page, 1)).toHaveClass(/lucide-monitor-down/);
	await expect(page.getByTestId('install-guide-warning')).toHaveCount(0);

	await page.getByTestId('install-guide-ok-btn').click();
	await expect(page.getByTestId('install-guide-panel')).toHaveCount(0);
});

test.describe("Edge на комп'ютері", () => {
	test.use({ userAgent: UA.windowsEdge });

	test('значок встановлення — сітка з плюсом, повернута, як в адресному рядку Edge', async ({
		page
	}) => {
		await withoutBrowserPrompt(page);
		await seed(page);
		await openSteps(page);

		await expect(icon(page, 1)).toHaveClass(/lucide-grid-2x2-plus/);
		const turn = await page
			.getByTestId('install-guide-step-icon-1')
			.evaluate((el) => getComputedStyle(el).transform);
		// rotate(-90deg) = matrix(cos, sin, −sin, cos) з cos ≈ 0 і sin = −1.
		expect(turn).toMatch(/^matrix\([^,]+, -1, 1, [^,]+, 0, 0\)$/);
	});
});

test.describe('iPhone у Safari', () => {
	test.use({ userAgent: UA.iphoneSafari, ...PHONE });

	test('кнопка «для телефону», кроки: «Поділитися» внизу → «На початковий екран» → значок', async ({
		page
	}) => {
		await seed(page);
		await openAbout(page);
		await expect(page.getByTestId('about-modal-install-btn')).toContainText(uk.pwa.install);
		await page.getByTestId('about-modal-install-btn').click();

		await expect(page.getByTestId('install-guide-title')).toHaveText(uk.pwa.title.iphone);
		await expectSteps(page, ['shareBottom', 'addHome', 'openHome']);
		await expect(icon(page, 1)).toHaveClass(/lucide-share/);
		await expect(page.getByTestId('install-guide-warning')).toHaveCount(0);

		// Вікно вміщається в екран телефона: панель не ширша за нього.
		const width = await page
			.getByTestId('install-guide-panel')
			.evaluate((el) => el.getBoundingClientRect().right);
		expect(width).toBeLessThanOrEqual(PHONE.viewport.width);
	});
});

test.describe('iPad у Safari', () => {
	test.use({
		userAgent: UA.macLikeSafari,
		viewport: { width: 820, height: 1180 },
		hasTouch: true
	});

	test('iPad, а не Mac: «Поділитися» вгорі, праворуч від адресного рядка', async ({ page }) => {
		// Сенсорний екран iPad: рядок браузера той самий, що в Safari на Mac.
		await page.addInitScript(() => {
			Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 });
		});
		await seed(page);
		await openSteps(page);

		await expect(page.getByTestId('install-guide-title')).toHaveText(uk.pwa.title.ipad);
		await expectSteps(page, ['shareTop', 'addHome', 'openHome']);
	});
});

test.describe('Edge на Android', () => {
	test.use({ userAgent: UA.androidEdge, ...PHONE });

	test('меню з трьох ліній унизу посередині й «Додати на телефон», а не три крапки', async ({
		page
	}) => {
		await withoutBrowserPrompt(page);
		await seed(page);
		await openSteps(page);

		await expect(page.getByTestId('install-guide-title')).toHaveText(uk.pwa.title.android);
		await expectSteps(page, ['edgeMenu', 'edgeAddToPhone', 'openHomeAndroid']);
		await expect(icon(page, 1)).toHaveClass(/lucide-menu/);
	});
});

test.describe('вбудований браузер месенджера', () => {
	test.use({ userAgent: UA.instagram, ...PHONE });

	test('кроки ведуть у звичайний браузер і називають ту саму кнопку', async ({ page }) => {
		await seed(page);
		await openSteps(page);

		await expect(page.getByTestId('install-guide-title')).toHaveText(uk.pwa.title.inApp);
		// Підпис кнопки підставляє словник: копія в тексті кроку розійшлася б із кнопкою.
		await expect(page.getByTestId('install-guide-step-text-3')).toHaveText(
			uk.pwa.step.inAppAgain.replace('{button}', uk.pwa.install)
		);
	});
});

/**
 * Попередження для Chrome на iPhone — єдине в інструкціях. Доти його текст був бурштиновим
 * `#f59e0b` на півпрозорому бурштиновому. Заміряно 2026-09-29 по пікселях знімка й axe:
 * 1,99 : 1 у `light-gray` і 1,88 : 1 у `green` при потрібних 4,5 (у темних темах — 8,6 і
 * 8,3). Тепер текст — основним кольором на тлі попередження, бурштинові лише значок і
 * рамка: 13,18 / 15,29 / 11,62 / 8,73 у тому самому порядку тем, що нижче.
 *
 * Кнопка «Зрозуміло» поза заміром навмисно: білий текст на фірмовому помаранчевому — відома
 * пара проєкту й рішення про айдентику (`KNOWN_PAIRS` у `src/contrast.test.ts`).
 */
test.describe('iPhone у Chrome', () => {
	test.use({ userAgent: UA.iphoneChrome, ...PHONE });

	/**
	 * `measured: false` — тло теми `orange` градієнт, і axe пари не визначає («incomplete»).
	 * У решті тем попередження мусить бути саме ЗАМІРЯНЕ: вузол, якого axe не зміг
	 * порахувати, дав би зелений тест без жодного заміру.
	 */
	const THEMES = [
		{ theme: 'light-gray', measured: true },
		{ theme: 'dark-gray', measured: true },
		{ theme: 'orange', measured: false },
		{ theme: 'green', measured: true }
	];

	for (const { theme, measured } of THEMES) {
		test(`попередження про «три крапки» читається в темі ${theme}`, async ({ page }) => {
			await seed(page, { theme });
			await openSteps(page);

			await expect(page.getByTestId('install-guide-title')).toHaveText(uk.pwa.title.app);
			await expectSteps(page, ['shareAddressBar', 'addHomeChrome', 'openHome']);
			await expect(page.getByTestId('install-guide-warning')).toHaveText(uk.pwa.warning.iosChrome);

			await waitForAnimationsToSettle(page);
			const { violations, passes } = await new AxeBuilder({ page })
				.include('[data-testid="install-guide-panel"]')
				.exclude('[data-testid="install-guide-ok-btn"]')
				.withRules(['color-contrast'])
				.analyze();
			const nodes = violations.flatMap((v) =>
				v.nodes.map((n) => `${n.target.join(' ')}: ${n.any.map((a) => a.message).join('; ')}`)
			);
			expect(nodes).toEqual([]);

			if (measured) {
				const warningMeasured = passes
					.flatMap((rule) => rule.nodes)
					.some(
						(node) =>
							node.html.includes(uk.pwa.warning.iosChrome.slice(0, 20)) ||
							node.target.some((t) => t.includes('warning'))
					);
				expect(warningMeasured, 'axe не заміряв попередження — зелене тут нічого не каже').toBe(
					true
				);
			}
		});
	}
});
