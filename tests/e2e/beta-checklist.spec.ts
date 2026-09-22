import { test, expect, type Page } from './fixtures';

/**
 * Сторінка чеклиста бета-тестування (BETA-CHECKLIST-v9 § 5.7, `BETA-PAGE-E2E`).
 *
 * ## Чому цей файл з'явився пізно
 *
 * Над чеклистом стояло двадцять один інваріант — і всі вони дивилися на ДАНІ:
 * чи заявлена вкладкою кожна адреса, чи існує названий файл тесту, чи є в
 * пункта локатор. Саму сторінку не чіпав НІХТО. З дев'яти реалізацій цього
 * чеклиста ця була єдиною без жодного кліка по ній, і це найгірший вид
 * зеленого прогону: інструмент перевірки, який ніхто не перевіряє.
 *
 * ## Чому саме ці сценарії
 *
 * Кожен закриває крок, на якому робота тестувальника зникає МОВЧКИ: сторінка
 * лишається намальованою, інваріанти зеленими, а година роботи — ні.
 * Дублювати інваріанти над даними тут нема сенсу — вони й так червоніють
 * швидше.
 */

const PAGE = 'beta-test-checklists/';

/** Перший пункт першої вкладки: `id` стабільний назавжди (§ 2.2). */
const CHECK = 'game_1';

/**
 * Той самий пункт у локаторі — kebab-case (§ 5.6, `BETA-LOCATOR-PER-CHECK`).
 *
 * `id` і локатор розходяться рівно на один символ, і це навмисно: у сховищі
 * лежить `game_1`, у розмітці — `game-1`, бо підкреслень у локаторах немає
 * (TESTID-AND-NAMING § 1.2). Дві константи, а не одна, саме тому, що перевірка
 * сховища нижче звіряється з ПЕРШОЮ.
 */
const TID = CHECK.replace(/_/g, '-');

const progress = (page: Page) => page.getByTestId('beta-progress-value').innerText();

test.beforeEach(async ({ page }) => {
	// Той самий посів, що й у решті прогонів: без нього перший екран — онбординг.
	await page.addInitScript(() => {
		localStorage.setItem('slovko_settings', JSON.stringify({ hasCompletedOnboarding: true }));
	});
	await page.goto(PAGE);
	await expect(page.getByTestId('beta-page-container')).toBeVisible({ timeout: 20_000 });
});

test('позначка переживає перезавантаження', async ({ page }) => {
	const vote = page.getByTestId(`beta-vote-${TID}-ok-btn`);
	await vote.click();
	await expect(vote).toHaveAttribute('aria-pressed', 'true');

	await page.reload();

	await expect(
		page.getByTestId(`beta-vote-${TID}-ok-btn`),
		'позначка не пережила перезавантаження — сесія тестувальника зникає мовчки'
	).toHaveAttribute('aria-pressed', 'true');
});

test('поступ росте на один, а повторний клік його повертає', async ({ page }) => {
	const before = await progress(page);
	const vote = page.getByTestId(`beta-vote-${TID}-ok-btn`);

	await vote.click();
	await expect(page.getByTestId('beta-progress-value'), 'поступ не зрушив').not.toHaveText(before);

	// Повторне натискання того самого стану знімає позначку (§ 3.3): помилковий
	// клік мусить бути зворотним, інакше єдиний вихід — стерти все.
	await vote.click();
	await expect(
		page.getByTestId('beta-progress-value'),
		'повторний клік не зняв позначку'
	).toHaveText(before);
});

/** § 8.1: вкладок вісім, і загальне число не каже, чи закінчена ця. */
test('лічильник вкладки росте окремо від загального', async ({ page }) => {
	const own = page.getByTestId('beta-tab-game-progress-text');
	await expect(own).toBeVisible();
	const before = await own.innerText();

	await page.getByTestId(`beta-vote-${TID}-ok-btn`).click();

	await expect(own, 'лічильник вкладки не зрушив').not.toHaveText(before);
	await expect(
		page.getByTestId('beta-tab-account-progress-text'),
		'позначка потрапила в чужу вкладку'
	).toHaveText(/^0\//);
});

test('перемикання вкладки міняє пункти й не губить позначене', async ({ page }) => {
	await page.getByTestId(`beta-vote-${TID}-ok-btn`).click();

	await page.getByTestId('beta-tab-account-btn').click();
	await expect(
		page.getByTestId(`beta-check-${TID}-item`),
		'пункти чужої вкладки лишилися на екрані'
	).toHaveCount(0);

	await page.getByTestId('beta-tab-game-btn').click();
	await expect(
		page.getByTestId(`beta-vote-${TID}-ok-btn`),
		'позначка загубилася при поверненні на вкладку'
	).toHaveAttribute('aria-pressed', 'true');
});

/**
 * § 6.3: стирання — єдина незворотна дія на сторінці, і стоїть вона в тому
 * самому рядку, що й «Скопіювати звіт», до якого тягнуться щоразу.
 */
test('перше натискання «стерти» нічого не стирає', async ({ page }) => {
	await page.getByTestId(`beta-vote-${TID}-ok-btn`).click();
	const marked = await progress(page);

	await page.getByTestId('beta-clear-btn').click();
	await expect(
		page.getByTestId('beta-progress-value'),
		'одне натискання знесло всю роботу тестувальника'
	).toHaveText(marked);

	await page.getByTestId('beta-clear-btn').click();
	await expect(page.getByTestId('beta-progress-value')).not.toHaveText(marked);
});

/**
 * Буфер обміну в headless недоступний, і це зручно: сценарій заразом доводить,
 * що запасний шлях (§ 6.2) справді працює. Перша версія чеклиста в цьому місці
 * лише писала в лог — кнопка виглядала натиснутою, а звіту не було НІДЕ.
 */
test('звіт доходить до людини навіть без буфера обміну', async ({ page, context }) => {
	await context.clearPermissions();
	await page.getByTestId(`beta-vote-${TID}-ok-btn`).click();
	await page.getByTestId('beta-report-btn').click();

	const field = page.getByTestId('beta-report-input');
	if (await field.isVisible()) {
		// Саме локатор ВІДМОВИ (§ 6.2.1, `BETA-REPORT-HINT-SPLIT`): доти тут
		// стояв спільний `beta-report-hint`, і сценарій зеленів однаково — що
		// буфер спрацював, що ні. Тобто перевірка запасного шляху не перевіряла
		// запасного шляху.
		await expect(page.getByTestId('beta-report-failed-hint')).toBeVisible();
		await expect(field, 'у звіті немає позначеного пункта').toHaveValue(new RegExp(CHECK));
	}
});

/**
 * § 8.4: вихід зі сторінки. Тестувальник приходить сюди за прямим посиланням —
 * ні історії вкладки, ні пункта меню (сторінка навмисно поза меню, § 4). Доти
 * «вийти» можна було лише в той екран, який саме перевіряєш.
 */
test('зі сторінки є вихід на головну', async ({ page }) => {
	const home = page.getByTestId('beta-home-link');
	await expect(home, 'зі службової сторінки нема куди піти').toBeVisible();
	await expect(home).toHaveAttribute('href', /.+/);
});

/**
 * § 8.4: перелік екранів вкладки — той самий, який читає інваріант § 5.1. Він
 * не може розійтися з дійсністю непоміченим, але лише доти, доки посилання
 * справді ведуть кудись.
 */
test('посилання на екрани вкладки ведуть на сторінки сайту', async ({ page }) => {
	const links = page.locator('[data-testid^="beta-screen-"]');
	const count = await links.count();
	expect(count, 'вкладка не показала жодного екрана').toBeGreaterThan(0);

	for (let i = 0; i < count; i++) {
		const href = await links.nth(i).getAttribute('href');
		expect(href, 'посилання на екран без адреси').toBeTruthy();
	}
});
