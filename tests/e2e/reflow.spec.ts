import { expect, test } from "./fixtures";
import { waitForAnimationsToSettle } from "./settled";

/**
 * WCAG 1.4.10 Reflow: на ширині 320 CSS px сторінка не має горизонтального
 * прокручування (ACCESSIBILITY § 10.8, `A11Y-REFLOW`, MEDIUM).
 *
 * Чому окремим файлом, а не пунктом у `a11y.spec.ts`: axe цього не бачить **у
 * принципі**. Він судить про дерево доступності, а горизонтальна прокрутка — це
 * розкладка: `scrollWidth` більший за вікно. Правило зелене в базі axe рівно
 * тому, що axe про нього не питає.
 *
 * 320 px — не «дуже вузький телефон», а вимога стандарту: це 1280 px при
 * збільшенні 400 %, тобто те, що бачить людина зі слабким зором на звичайному
 * ноутбуці. Вміст, який там вилазить убік, читається зсувом рядка вправо-вліво
 * на КОЖНОМУ рядку.
 *
 * Стани ті самі, що в `a11y.spec.ts`, і з тієї ж причини: модалки монтуються
 * після гідратації, і найгустіша розкладка проєкту живе саме в них.
 */

const REFLOW_WIDTH = 320;

/** Висота стандартна для вузького екрана; правило про ширину, але й висота має бути реальною. */
const REFLOW_HEIGHT = 640;

/**
 * Один піксель допуску. Субпіксельне округлення дає `scrollWidth` на 0,5 px
 * більший за вікно на дробових масштабах — це не порушення, а арифметика.
 */
const TOLERANCE = 1;

const SEED_SETTINGS = { hasCompletedOnboarding: true };

const STATES: { key: string; path: string; marker: string }[] = [
	{ key: "home", path: "", marker: "app-root-container" },
	{ key: "levels", path: "?modal=levels", marker: "level-topic-modal-panel" },
	{
		key: "profile",
		path: "?modal=profile&tab=account",
		marker: "profile-panel",
	},
];

for (const { key, path, marker } of STATES) {
	test(`reflow 320px: ${key}`, async ({ page }) => {
		await page.setViewportSize({ width: REFLOW_WIDTH, height: REFLOW_HEIGHT });
		await page.addInitScript((settings) => {
			localStorage.setItem("slovko_settings", JSON.stringify(settings));
		}, SEED_SETTINGS);
		await page.goto(path);
		// Маркер стану, а не networkidle: Firestore тримає постійне з'єднання
		// (та сама причина, що в `a11y.spec.ts`).
		await expect(page.getByTestId(marker)).toBeVisible({ timeout: 30_000 });
		// `BaseModal` входить через `transition:scale={{ start: 0.9 }}`, а
		// трансформований блок дає МЕНШУ прокручувану область. Без цього
		// очікування вміст, який на 320 px вилазить убік, міряється стиснутим
		// і вкладається в межу — див. `settled.ts`.
		await waitForAnimationsToSettle(page);

		const overflow = await page.evaluate(() => {
			const doc = document.documentElement;
			// Разом із переліком винуватців: без нього повідомлення каже «щось
			// ширше за вікно», і шукати це «щось» доводиться очима.
			const guilty = [...document.querySelectorAll<HTMLElement>("body *")]
				.filter((el) => {
					const box = el.getBoundingClientRect();
					return box.width > 0 && box.right > window.innerWidth + 1;
				})
				.slice(0, 8)
				.map((el) => {
					const id = el.getAttribute("data-testid");
					const cls =
						el.className?.toString().split(/\s+/).filter(Boolean)[0] ?? "";
					return `${el.tagName.toLowerCase()}${id ? `[${id}]` : cls ? `.${cls}` : ""} → ${Math.round(el.getBoundingClientRect().right)}px`;
				});
			return {
				scrollWidth: doc.scrollWidth,
				innerWidth: window.innerWidth,
				guilty,
			};
		});

		expect(
			overflow.scrollWidth,
			`на ${REFLOW_WIDTH} px сторінка прокручується вбік ` +
				`(${overflow.scrollWidth} проти ${overflow.innerWidth}). ` +
				`Виходять за межу: ${overflow.guilty.join(", ") || "визначити не вдалося"}`,
		).toBeLessThanOrEqual(overflow.innerWidth + TOLERANCE);
	});
}
