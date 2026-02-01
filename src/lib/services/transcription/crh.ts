/**
 * CRH Transcription Rules (Crimean Tatar)
 */

const CRH_IPA_MAP: Record<string, string> = {
    'a': 'a', 'b': 'b', 'c': 'dʒ', 'ç': 'tʃ', 'd': 'd',
    'e': 'e', 'f': 'f', 'g': 'g', 'ğ': 'ɣ', 'h': 'x',
    'ı': 'ɯ', 'i': 'i', 'j': 'ʒ', 'k': 'k', 'l': 'l',
    'm': 'm', 'n': 'n', 'ñ': 'ŋ', 'o': 'o', 'ö': 'ø',
    'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 'ş': 'ʃ',
    't': 't', 'u': 'u', 'ü': 'y', 'v': 'v', 'y': 'j',
    'z': 'z', 'â': 'a'
};

export function generateCrhIPA(text: string): string {
    return text.toLowerCase().split('').map(char => CRH_IPA_MAP[char] || char).join('');
}
