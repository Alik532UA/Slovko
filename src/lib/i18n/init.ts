/**
 * i18n ініціалізація — svelte-i18n setup
 * Динамічне завантаження перекладів, інтеграція з localStorage
 */

import { register, init, getLocaleFromNavigator, locale } from "svelte-i18n";
import { browser } from "$app/environment";
import type { Language } from "../types";
import { localStorageProvider } from "../services/storage/storageProvider";
import { settingsStore } from "../controllers/SettingsStore.svelte";

// Динамічний імпорт усіх мовних файлів як raw для підтримки BOM
const localeModules = import.meta.glob("./translations/*.json", {
	query: "?raw",
	import: "default",
});

/**
 * Завантажувач мови, що видаляє BOM
 */
const loadLocale = async (lang: string) => {
	const path = `./translations/${lang}.json`;
	if (localeModules[path]) {
		let raw = (await localeModules[path]()) as string;
		// Видаляємо BOM, якщо він є (код 0xFEFF)
		if (raw.charCodeAt(0) === 0xfeff) {
			raw = raw.slice(1);
		}
		// Також про всяк випадок видаляємо BOM через regex та зайві пробіли на початку
		const stripped = raw.replace(/^\uFEFF/, "").trim();
		return JSON.parse(stripped);
	}
	throw new Error(`Locale file not found: ${path}`);
};

// Реєстрація мов
register("uk", () => loadLocale("uk"));
register("en", () => loadLocale("en"));
register("crh", () => loadLocale("crh"));
register("nl", () => loadLocale("nl"));
register("de", () => loadLocale("de"));
register("el", () => loadLocale("el"));
register("pl", () => loadLocale("pl"));

const DEFAULT_LOCALE: Language = "uk";
const SUPPORTED_LOCALES: Language[] = [
	"uk",
	"en",
	"crh",
	"nl",
	"de",
	"el",
	"pl",
];
const STORAGE_KEY = "interfaceLanguage";

/**
 * МОВА З АДРЕСИ — `?lang=`, і це свідоме відхилення від I18N-v8 § 3.1.
 *
 * Сусідні сайти автора (`src/lib/siblings.ts` — та сама таблиця у восьми
 * репозиторіях) передають мову, якою відвідувач читав ТАМ: перехід між сайтами
 * однієї мережі не мусить скидати обрану мову. Де мова живе в шляху, її називає
 * шлях, як канон і приписує; тут мовного сегмента немає взагалі, тож параметр —
 * єдина ручка в адресі, яка існує.
 *
 * Тег звіряється строго, без зведення `en-US` → `en`: посилання будує
 * `siblingUrl()` і надсилає лише точні теги з переліку. Невідоме значення
 * ігнорується — це чужий параметр в адресі, а не помилка.
 */
function languageFromUrl(): Language | null {
	if (!browser) return null;

	const asked = new URLSearchParams(window.location.search).get("lang");
	if (!asked || !SUPPORTED_LOCALES.includes(asked as Language)) return null;

	return asked as Language;
}

/**
 * Ініціалізувати i18n систему
 */
export async function initializeI18n(): Promise<void> {
	let savedLocale: Language = DEFAULT_LOCALE;

	if (browser) {
		const fromUrl = languageFromUrl();

		if (fromUrl) {
			savedLocale = fromUrl;

			/*
			 * ОБИДВА сховища мови, бо їх тут двоє.
			 *
			 * `slovko_interfaceLanguage` читає ця функція, а `interfaceLanguage`
			 * усередині `slovko_settings` — усе інше: підсвічений прапор у
			 * налаштуваннях, мова озвучення в статистиці, метадані відгуку.
			 * Тримає їх у злагоді викликач — `LanguageSettings.svelte` пише в обидва
			 * поруч, — тож і тут пишеться в обидва. Записати лише в одне означало б
			 * інтерфейс однією мовою й підсвічений прапор іншої.
			 *
			 * Тобто на цьому сайті вхідна мова таки ЗБЕРІГАЄТЬСЯ, на відміну від
			 * сайтів із мовою в шляху, де поточна мова й збережений вибір — різні
			 * місця. Іншого місця, де мова могла б пожити один візит, тут немає.
			 */
			localStorageProvider.setItem(STORAGE_KEY, fromUrl);
			settingsStore.setInterfaceLanguage(fromUrl);
		} else {
			// Спробувати отримати збережену мову
			const stored = localStorageProvider.getItem(STORAGE_KEY);
			if (stored && SUPPORTED_LOCALES.includes(stored as Language)) {
				savedLocale = stored as Language;
			} else {
				// Спробувати визначити мову браузера
				const browserLocale = getLocaleFromNavigator()?.split(
					"-",
				)[0] as Language;
				if (browserLocale && SUPPORTED_LOCALES.includes(browserLocale)) {
					savedLocale = browserLocale;
				}
			}
		}
	}

	await init({
		fallbackLocale: DEFAULT_LOCALE,
		initialLocale: savedLocale,
	});
}

/**
 * Змінити мову інтерфейсу
 */
export function setInterfaceLanguage(lang: Language): void {
	if (SUPPORTED_LOCALES.includes(lang)) {
		locale.set(lang);
		if (browser) {
			localStorageProvider.setItem(STORAGE_KEY, lang);
		}
	}
}

/**
 * Отримати поточну мову
 */
export function getCurrentLanguage(): Language {
	let current: Language = DEFAULT_LOCALE;
	locale.subscribe((value) => {
		if (value && SUPPORTED_LOCALES.includes(value as Language)) {
			current = value as Language;
		}
	})();
	return current;
}

export { locale };
export const LANGUAGES = SUPPORTED_LOCALES;
