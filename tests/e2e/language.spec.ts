import { expect, test } from "@playwright/test";

/**
 * `<html lang>` іде за мовою інтерфейсу (ACCESSIBILITY-v8 § 10.4).
 *
 * Чому це e2e, а не інваріант по джерелах. У `+layout.svelte` є рядок
 * `document.documentElement.lang = interfaceLanguage` — і греп по ньому доводить
 * лише те, що рядок написали. Він виконується в `$effect`, тобто після гідрації
 * і в залежності від реактивного графа; зникнути ефект може від будь-якого
 * рефакторингу стору, і в коді це виглядатиме як «ну, присвоєння ж на місці».
 *
 * Ціна помилки не косметична: `lang` — те, за чим читалка ВИБИРАЄ ГОЛОС.
 * Український текст, озвучений англійським синтезатором, нерозбірливий; тут це
 * особливо болісно, бо застосунок навчає читати слова вголос.
 *
 * `axe` цього не бачить у принципі: він перевіряє, що `lang` існує й валідний,
 * а не що він збігається з мовою вмісту ПІСЛЯ перемикання.
 *
 * **Що показав зворотний експеримент — і це варто знати наступному.** Прибране
 * присвоєння в `+layout.svelte` перевірку НЕ валить, і це правильно: атрибут
 * ставить іще й сам `svelte-i18n` (`runtime.js`,
 * `documentElement.setAttribute("lang", newLocale)`). Тобто рядок у макеті —
 * дубль, а не єдине джерело, і перевірка тут навмисно про ПОВЕДІНКУ, а не про
 * реалізацію: вона лишиться правдивою, хто б із двох шарів не зник.
 *
 * Живість доведена інакше — підміною очікування на завідомо хибне (`de` замість
 * `en`): перевірка падає, тобто справді читає атрибут, а не проходить сама
 * собою.
 */

const SEED_SETTINGS = { hasCompletedOnboarding: true };

test.beforeEach(async ({ page }) => {
	await page.addInitScript((settings) => {
		localStorage.setItem("slovko_settings", JSON.stringify(settings));
	}, SEED_SETTINGS);
});

test("мова документа збігається з мовою інтерфейсу", async ({ page }) => {
	await page.goto("?modal=languages");
	await expect(page.getByTestId("language-settings-modal")).toBeVisible({ timeout: 30_000 });

	// Типова мова проєкту. Локаль браузера в конфігу — `uk-UA`, тож застосунок
	// стартує українською, і `<html lang>` мусить це відображати.
	await expect(page.locator("html")).toHaveAttribute("lang", "uk");
});

test("перемикання мови інтерфейсу змінює lang документа", async ({ page }) => {
	await page.goto("?modal=languages");
	await expect(page.getByTestId("language-settings-modal")).toBeVisible({ timeout: 30_000 });

	await page.getByTestId("interface-lang-option-en").click();

	// Саме `toHaveAttribute` із власним очікуванням, а не читання один раз:
	// значення ставиться асинхронно, на наступному кадрі після кліку.
	await expect(page.locator("html")).toHaveAttribute("lang", "en");

	// І назад — щоб перевірка ловила не «одноразово спрацювало», а зв'язок.
	await page.getByTestId("interface-lang-option-uk").click();
	await expect(page.locator("html")).toHaveAttribute("lang", "uk");
});
