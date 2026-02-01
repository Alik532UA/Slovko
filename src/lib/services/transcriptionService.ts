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

/**
 * Генерує транскрипцію (легасі) або повертає undefined.
 * Використовується як fallback, якщо IPA не знайдено.
 */
export function generateTranscription(text: string, sourceLang: Language, targetLang: Language): string | undefined {
    if (sourceLang === 'uk' && isLatin(targetLang)) {
        return transliterateUkToLatin(text);
    }
    return undefined;
}

/**
 * Генерує IPA транскрипцію на основі правил читання мови.
 * Використовується, коли немає словникового IPA.
 */
export function generateRulesIPA(text: string, lang: Language): string | undefined {
    try {
        if (lang === 'crh') return generateCrhIPA(text);
        if (lang === 'nl') return generateNlIPA(text);
        if (lang === 'uk') return generateUkIPA(text);
        if (lang === 'de') return generateDeIPA(text);
        if (lang === 'el') return generateElIPA(text);
    } catch (e) {
        console.warn(`IPA Generation failed for ${lang}:`, e);
        return undefined;
    }
    return undefined;
}

function isLatin(lang: Language): boolean {
    return ['en', 'nl', 'de', 'crh'].includes(lang);
}