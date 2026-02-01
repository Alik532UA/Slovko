/**
 * IPA to German (Latin) Mapping
 * Converts IPA symbols to German-readable Latin script
 */
export const IPA_TO_DE: Record<string, string> = {
    // === MULTI-CHARACTER SEQUENCES ===

    // Affricates
    'tʃ': 'tsch',
    'dʒ': 'dsch',
    'ts': 'z',
    'ʃtʃ': 'schtsch',

    // Diphthongs
    'aɪ': 'ei',
    'eɪ': 'ei',
    'ɛi': 'ei',
    'ɔɪ': 'oi',
    'ɔʏ': 'eu',
    'aʊ': 'au',
    'ɑu': 'au',
    'əʊ': 'o',
    'øy': 'eu',
    'œy': 'eu',

    // J-combinations
    'juː': 'ju',
    'jʊ': 'ju',
    'ja': 'ja',
    'jɛ': 'je',
    'ju': 'ju',
    'je': 'je',
    'ji': 'ji',
    'jɔ': 'jo',

    // Vowel combinations
    'ɪə': 'ia',
    'eə': 'ea',
    'ʊə': 'ua',

    // === LONG VOWELS ===
    'iː': 'ie',
    'uː': 'u',
    'yː': 'ü',
    'ɑː': 'a',
    'aː': 'a',
    'ɔː': 'o',
    'oː': 'o',
    'eː': 'e',
    'øː': 'ö',
    'ɜː': 'ö',

    // === SHORT VOWELS ===
    'ɪ': 'i',
    'e': 'e',
    'ɛ': 'e',
    'æ': 'ä',
    'ɒ': 'o',
    'ɔ': 'o',
    'ʌ': 'a',
    'ɑ': 'a',
    'ʊ': 'u',
    'y': 'ü',
    'ʏ': 'ü',
    'ø': 'ö',
    'œ': 'ö',
    'ə': 'e',

    // Basic vowels
    'a': 'a',
    'i': 'i',
    'o': 'o',
    'u': 'u',
    'ɯ': 'i', // CRH ı approximation

    // === CONSONANTS ===
    'p': 'p',
    'b': 'b',
    't': 't',
    'd': 'd',
    'k': 'k',
    'ɡ': 'g',
    'g': 'g',
    'q': 'k',
    'c': 'k',

    'f': 'f',
    'v': 'w',
    'ʋ': 'w',
    'θ': 's',
    'ð': 's',
    's': 's',
    'z': 's',
    'ʃ': 'sch',
    'ʒ': 'sch',
    'ɣ': 'ch',
    'ɦ': 'h',
    'x': 'ch',
    'h': 'h',
    'ç': 'ch',

    'm': 'm',
    'n': 'n',
    'ŋ': 'ng',
    'ɲ': 'nj',

    'l': 'l',
    'r': 'r',
    'ɾ': 'r',
    'ʀ': 'r',

    'j': 'j',
    'w': 'w',

    // === MODIFIERS ===
    'ˈ': '',
    'ˌ': '',
    '.': '',
    ':': '',
    'ː': '',
    ' ': ' ',
    'ʲ': '',
};
