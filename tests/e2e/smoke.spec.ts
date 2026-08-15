import { test, expect } from '@playwright/test';

/**
 * Замість `example.test.ts`, який лишає `npm init playwright`.
 *
 * Той файл був не заглушкою — асерт у ньому справжній, — але його не запускав
 * ніхто: у CI ішов лише `invariants.spec.ts` за іменем. Файл із назвою
 * «example» рахувався в переліку «що в нас перевіряється» і не виконувався
 * ніде (AI-AGENT-PITFALLS-v8 § 1.3: видалити або оживити, третього немає).
 *
 * Оживлено, бо його асерт закриває реальний клас регресій. `+page.ts` вимикає
 * SSR, тож нічого зі `svelte:head` у розмітку не потрапляє — заголовок і
 * canonical живуть статично в `app.html`. Одного разу через це сторінка вже
 * поїхала в пошук без заголовка взагалі.
 */

const SEED_SETTINGS = { hasCompletedOnboarding: true };

test.beforeEach(async ({ page }) => {
	await page.addInitScript((settings) => {
		localStorage.setItem('slovko_settings', JSON.stringify(settings));
	}, SEED_SETTINGS);
});

test('сторінка віддається із заголовком і описом', async ({ page }) => {
	await page.goto('');

	await expect(page).toHaveTitle(/Slovko/);

	const description = page.locator('meta[name="description"]');
	await expect(description).toHaveCount(1);
	expect((await description.getAttribute('content'))?.length ?? 0).toBeGreaterThan(50);

	const canonical = page.locator('link[rel="canonical"]');
	await expect(canonical).toHaveAttribute('href', /alik532ua\.github\.io\/Slovko/);
});

test('застосунок монтується і не лишає помилок у консолі', async ({ page }) => {
	const problems: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') problems.push(msg.text());
	});
	page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

	await page.goto('');

	// Чекаємо саме маркер застосунку, а не `networkidle`: Firestore тримає
	// постійне з'єднання, і networkidle не настане ніколи (CODE-QUALITY-v8 § 5.7).
	await expect(page.getByTestId('app-root-container')).toBeVisible();

	// Заблокований CSP ресурс не ламає розкладку й не валить збірку — він
	// лишає рядок у консолі, і це єдиний його слід (SECURITY-v8 § 6.2).
	const refused = problems.filter((p) => /Refused to|Content Security Policy/i.test(p));
	expect(refused, `CSP щось заблокувала:\n${refused.join('\n')}`).toEqual([]);
});
