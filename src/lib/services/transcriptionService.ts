/**
 * transcriptionService.ts
 * Сервіс для генерації транскрипції "на льоту" для пар мов.
 * Основна ціль: дозволити носіям латинських мов читати кирилицю (і навпаки в майбутньому).
 */

import type { Language } from "$lib/types";

// Матриця транслітерації: UK -> Latin (Base)
// Можна адаптувати під конкретні мови (NL, DE) пізніше,
// поки що робимо універсальну зрозумілу латиницю.
const UK_TO_LATIN_MAP: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g',
    'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
    'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k',
    'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
    'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
    'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ь': "'", 'ю': 'yu', 'я': 'ya',
    "'": "" // апостроф опускаємо або ігноруємо
};

/**
 * Генерує транскрипцію для заданого тексту
 * @param text - вхідний текст
 * @param sourceLang - мова тексту
 * @param targetLang - мова цільової аудиторії (для кого транскрипція)
 */
export function generateTranscription(text: string, sourceLang: Language, targetLang: Language): string | undefined {
    // Якщо мова джерела - англійська, ми використовуємо словникову транскрипцію (повертаємо undefined тут, 
    // бо вона береться з JSON в gameState).
    // Але якщо ми хочемо додати генерацію для інших, то:

    if (sourceLang === 'uk' && isLatin(targetLang)) {
        return transliterateUkToLatin(text);
    }

    if (sourceLang === 'crh' && isLatin(targetLang)) {
        // Кримськотатарська вже на латиниці (зазвичай), тому повертаємо як є або нічого
        // Але якщо текст кирилицею (старий правопис), треба конвертувати.
        // Припускаємо, що у нас дані вже в латиниці.
        return undefined;
    }

    return undefined;
}

function isLatin(lang: Language): boolean {
    return ['en', 'nl', 'de', 'crh'].includes(lang);
}

function transliterateUkToLatin(text: string): string {
    return text.toLowerCase().split('').map(char => {
        return UK_TO_LATIN_MAP[char] || char; // Якщо немає в мапі, залишаємо як є (пунктуація, цифри)
    }).join('');
}
