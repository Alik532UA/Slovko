/**
 * transcriptionService.ts
 * Сервіс-фасад для генерації транскрипції.
 */

import type { Language } from "$lib/types";
import { generateUkIPA, transliterateUkToLatin } from "./transcription/uk";
import { generateCrhIPA } from "./transcription/crh";
import { generateNlIPA } from "./transcription/nl";
import { generateDeIPA } from "./transcription/de";
import { generateElIPA } from "./transcription/el";
import { mapIpaToUk } from "./transcription/mappers/ipa-to-uk";
import { mapIpaToNl } from "./transcription/mappers/ipa-to-nl";

/**
 * Генерує транскрипцію (легасі) або повертає undefined.
 * Використовується як fallback, якщо IPA не знайдено.
 */
export function generateTranscription(
	text: string,
	sourceLang: Language,
	targetLang: Language,
): string | undefined {
	if (sourceLang === "uk" && isLatin(targetLang)) {
		return transliterateUkToLatin(text);
	}
	return undefined;
}

/**
 * Генерує фінальну транскрипцію для відображення.
 * Крок 1: Текст -> IPA
 * Крок 2: IPA -> Символи мови інтерфейсу
 */
export function generateRulesIPA(
	text: string,
	lang: Language,
	uiLang: Language = "uk",
): string | undefined {
	try {
		// Виключення: Англійська завжди показує свою транскрипцію (зберігається в JSON)
		if (lang === "en") return undefined;

		let ipa: string | undefined;

		// Крок 1: Генеруємо універсальний IPA
		if (lang === "crh") ipa = generateCrhIPA(text);
		else if (lang === "nl") ipa = generateNlIPA(text);
		else if (lang === "uk") ipa = generateUkIPA(text);
		else if (lang === "de") ipa = generateDeIPA(text);
		else if (lang === "el") ipa = generateElIPA(text);

		if (!ipa) return undefined;

		// Крок 2: Мапимо IPA на символи мови інтерфейсу (Народна транскрипція)
		if (uiLang === "uk") return mapIpaToUk(ipa);
		if (uiLang === "nl") return mapIpaToNl(ipa);

		// Fallback: якщо мапера немає, повертаємо чистий IPA
		return ipa;
	} catch (e) {
		console.warn(`IPA Generation failed for ${lang} (UI: ${uiLang}):`, e);
		return undefined;
	}
}

function isLatin(lang: Language): boolean {
	return ["en", "nl", "de", "crh"].includes(lang);
}
