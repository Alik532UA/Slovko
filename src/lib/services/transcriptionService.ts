/**
 * transcriptionService.ts
 * Сервіс для генерації транскрипції "на льоту" для пар мов.
 * Включає генерацію IPA за правилами для мов з регулярною фонетикою.
 */

import type { Language } from "$lib/types";

// --- UK (Transliteration existing Logic) ---
const UK_TO_LATIN_MAP: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g',
    'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
    'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k',
    'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
    'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
    'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ь': "'", 'ю': 'yu', 'я': 'ya',
    "'": ""
};

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
    } catch (e) {
        console.warn(`IPA Generation failed for ${lang}:`, e);
        return undefined;
    }
    return undefined;
}

function isLatin(lang: Language): boolean {
    return ['en', 'nl', 'de', 'crh'].includes(lang);
}

function transliterateUkToLatin(text: string): string {
    return text.toLowerCase().split('').map(char => {
        return UK_TO_LATIN_MAP[char] || char;
    }).join('');
}

// --- IPA Generators ---

// Crimean Tatar (Regular)
const CRH_IPA_MAP: Record<string, string> = {
    'a': 'a', 'b': 'b', 'c': 'dʒ', 'ç': 'tʃ', 'd': 'd',
    'e': 'e', 'f': 'f', 'g': 'g', 'ğ': 'ɣ', 'h': 'x',
    'ı': 'ɯ', 'i': 'i', 'j': 'ʒ', 'k': 'k', 'l': 'l',
    'm': 'm', 'n': 'n', 'ñ': 'ŋ', 'o': 'o', 'ö': 'ø',
    'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 'ş': 'ʃ',
    't': 't', 'u': 'u', 'ü': 'y', 'v': 'v', 'y': 'j',
    'z': 'z', 'â': 'ja'
};

function generateCrhIPA(text: string): string {
    return text.toLowerCase().split('').map(char => CRH_IPA_MAP[char] || char).join('');
}

// Ukrainian (Cyrillic -> IPA)
const UK_IPA_MAP: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'ɦ', 'ґ': 'g',
    'д': 'd', 'е': 'ɛ', 'є': 'jɛ', 'ж': 'ʒ', 'з': 'z',
    'и': 'ɪ', 'і': 'i', 'ї': 'ji', 'й': 'j', 'к': 'k',
    'л': 'l', 'м': 'm', 'н': 'n', 'о': 'ɔ', 'п': 'p',
    'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
    'х': 'x', 'ц': 'ts', 'ч': 'tʃ', 'ш': 'ʃ', 'щ': 'ʃtʃ',
    'ь': 'ʲ', 'ю': 'ju', 'я': 'ja', "'": ""
};

function generateUkIPA(text: string): string {
    return text.toLowerCase().split('').map(char => UK_IPA_MAP[char] || char).join('');
}

// Dutch (Simplified Rules)
function generateNlIPA(text: string): string {
    let t = text.toLowerCase();
    // Diphthongs & digraphs order matters
    t = t.replace(/ij/g, 'ɛi')
        .replace(/ei/g, 'ɛi')
        .replace(/ui/g, 'œy')
        .replace(/oe/g, 'u')
        .replace(/au/g, 'ɑu')
        .replace(/ou/g, 'ɑu')
        .replace(/eu/g, 'øː')
        .replace(/ie/g, 'i')
        .replace(/aa/g, 'aː')
        .replace(/ee/g, 'eː')
        .replace(/oo/g, 'oː')
        .replace(/uu/g, 'yː')
        .replace(/ch/g, 'x')
        .replace(/sch/g, 'sx')
        .replace(/ng/g, 'ŋ')
        .replace(/nj/g, 'ɲ');

    // Single chars (mapping remaining context)
    // Basic approximations
    // a -> ɑ (short)
    // e -> ɛ (short)
    // i -> ɪ (short)
    // o -> ɔ (short)
    // u -> ʏ (short)
    // But 'open syllable' rules are hard to regex. 
    // We map 1:1 for simplicity where possible.
    const map: Record<string, string> = {
        'j': 'j', 'y': 'i', 'v': 'v', 'w': 'ʋ', 'z': 'z', 'g': 'ɣ',
        'c': 'k' // usually
    };

    return t.split('').map(c => map[c] || c).join('');
}

// German (Simplified Rules)
function generateDeIPA(text: string): string {
    let t = text.toLowerCase();
    t = t.replace(/sch/g, 'ʃ')
        .replace(/ch/g, 'x') // simplified
        .replace(/ei/g, 'aɪ')
        .replace(/ie/g, 'iː')
        .replace(/eu/g, 'ɔʏ')
        .replace(/äu/g, 'ɔʏ')
        .replace(/eh/g, 'eː')
        .replace(/ah/g, 'aː')
        .replace(/oh/g, 'oː')
        .replace(/uh/g, 'uː')
        .replace(/ng/g, 'ŋ')
        .replace(/st/g, 'ʃt') // start of word usually, simplified
        .replace(/sp/g, 'ʃp')
        .replace(/v/g, 'f')
        .replace(/w/g, 'v')
        .replace(/z/g, 'ts')
        .replace(/ß/g, 's')
        .replace(/ä/g, 'ɛ')
        .replace(/ö/g, 'ø')
        .replace(/ü/g, 'y');

    return t;
}
