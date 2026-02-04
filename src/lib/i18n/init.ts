/**
 * i18n ініціалізація — svelte-i18n setup
 * Динамічне завантаження перекладів, інтеграція з localStorage
 */

import { register, init, getLocaleFromNavigator, locale } from "svelte-i18n";
import { browser } from "$app/environment";
import type { Language } from "../types";

// Реєстрація мов (динамічний імпорт для code splitting)
register("uk", () => import("./translations/uk.json"));
register("en", () => import("./translations/en.json"));
register("crh", () => import("./translations/crh.json"));
register("nl", () => import("./translations/nl.json"));
register("de", () => import("./translations/de.json"));
register("el", () => import("./translations/el.json"));

const DEFAULT_LOCALE: Language = "uk";
const SUPPORTED_LOCALES: Language[] = ["uk", "en", "crh", "nl", "de", "el"];
const STORAGE_KEY = "wordApp_interfaceLanguage";

/**
 * Ініціалізувати i18n систему
 */
export async function initializeI18n(): Promise<void> {
	let savedLocale: Language = DEFAULT_LOCALE;

	if (browser) {
		// Спробувати отримати збережену мову
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && SUPPORTED_LOCALES.includes(stored as Language)) {
			savedLocale = stored as Language;
		} else {
			// Спробувати визначити мову браузера
			const browserLocale = getLocaleFromNavigator()?.split("-")[0] as Language;
			if (browserLocale && SUPPORTED_LOCALES.includes(browserLocale)) {
				savedLocale = browserLocale;
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
			localStorage.setItem(STORAGE_KEY, lang);
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
