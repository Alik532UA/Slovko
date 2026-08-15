import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { A11Y_BASELINE, A11Y_KNOWN } from './a11y-baseline';

/**
 * Машинний аудит доступності (ACCESSIBILITY-v8 § 10.1).
 *
 * Межа інструмента названа прямо, бо зелений axe легко прочитати як «сторінка
 * доступна»: він знаходить приблизно третину проблем WCAG і бачить лише той
 * стан, що є одразу після переходу. Клавіатурна навігація, пастка фокусу в
 * модалці, зрозумілість підписів — усе це лишається на людині.
 *
 * Саме тому перевіряються ТРИ стани, а не одна головна: модалки монтуються
 * після гідратації, і те, що всередині них, axe після `goto('')` не побачив би
 * взагалі.
 */

const SEED_SETTINGS = { hasCompletedOnboarding: true };

const STATES: { key: string; path: string; marker: string }[] = [
	{ key: 'home', path: '', marker: 'app-root-container' },
	{ key: 'levels', path: '?modal=levels', marker: 'level-topic-modal-panel' },
	{ key: 'profile', path: '?modal=profile&tab=account', marker: 'profile-panel' }
];

for (const { key, path, marker } of STATES) {
	test(`axe: ${key}`, async ({ page }) => {
		await page.addInitScript((settings) => {
			localStorage.setItem('slovko_settings', JSON.stringify(settings));
		}, SEED_SETTINGS);
		await page.goto(path);
		// Маркер стану, а не networkidle: Firestore тримає постійне з'єднання, і
		// networkidle не настане ніколи (CODE-QUALITY-v8 § 5.7).
		//
		// Ліміт явний і великий: макет чекає на i18n і на готовність авторизації,
		// а перший запит до холодного dev-сервера ще й тягне компіляцію. З
		// типовими 5 с гейт червонів би від повільної машини, а не від порушення,
		// і на нього швидко перестали б дивитися.
		await expect(page.getByTestId(marker)).toBeVisible({ timeout: 30_000 });

		const { violations } = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			.analyze();

		const ids = [...new Set(violations.map((v) => v.id))].sort();
		const detail = violations
			.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`)
			.join('\n');

		// Перелік типів — щоб нове порушення не сховалося за лімітом.
		expect(ids, `нове порушення, якого не було в базі:\n${detail}`).toEqual(A11Y_KNOWN[key]);
		expect(
			violations.length,
			`порушень більше, ніж у базі (${A11Y_BASELINE[key]}):\n${detail}`
		).toBeLessThanOrEqual(A11Y_BASELINE[key]);
	});
}
