/**
 * i18n ініціалізація — svelte-i18n setup
 * Динамічне завантаження перекладів, інтеграція з localStorage
 */

import { register, init, getLocaleFromNavigator, locale } from "svelte-i18n";
import { browser } from "$app/environment";
import type { Language } from "../types";

// Динамічний імпорт усіх мовних файлів як raw для підтримки BOM
const localeModules = import.meta.glob("./translations/*.json", { query: "?raw", import: "default" });

/**
 * Завантажувач мови, що видаляє BOM
 */
const loadLocale = async (lang: string) => {
	const path = `./translations/${lang}.json`;
	if (localeModules[path]) {
		let raw = (await localeModules[path]()) as string;
		// Видаляємо BOM, якщо він є (код 0xFEFF)
		if (raw.charCodeAt(0) === 0xFEFF) {
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
const SUPPORTED_LOCALES: Language[] = ["uk", "en", "crh", "nl", "de", "el", "pl"];
const STORAGE_KEY = "slovko_interfaceLanguage";

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
