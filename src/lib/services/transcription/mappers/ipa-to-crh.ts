/**
 * IPA to Crimean Tatar (CRH) Mapper
 * Converts standard IPA symbols to "folk" Latin transcription.
 * For example: /ʃ/ -> ş, /tʃ/ -> ç, /ŋ/ -> ñ.
 */

export function mapIpaToCrh(ipa: string): string {
        let t = ipa.toLowerCase();

        // 1. Vowels (Crimean Tatar Latin phonetic logic)
        t = t
                .replace(/iː/g, "i")
                .replace(/ɪ/g, "i")
                .replace(/eː/g, "e")
                .replace(/ɛ/g, "e")
                .replace(/æ/g, "e")
                .replace(/aː/g, "a")
                .replace(/ɑː/g, "a")
                .replace(/ɔː/g, "o")
                .replace(/ɒ/g, "o")
                .replace(/uː/g, "u")
                .replace(/ʊ/g, "u")
                .replace(/ʌ/g, "a")
                .replace(/ə/g, "e") // Neutral vowel
                .replace(/ø/g, "ö") // ö sound
                .replace(/y/g, "ü") // ü sound
                .replace(/aɪ/g, "ay")
                .replace(/ɔʏ/g, "oy")
                .replace(/eɪ/g, "ey")
                .replace(/aʊ/g, "av");

        // 2. Complex Consonants (Turkish/CRH style Latin)
        t = t
                .replace(/tʃ/g, "ç")
                .replace(/dʒ/g, "c")
                .replace(/ʃ/g, "ş")
                .replace(/ʒ/g, "j")
                .replace(/ŋ/g, "ñ")
                .replace(/x/g, "h")
                .replace(/ɣ/g, "ğ")
                .replace(/ɦ/g, "h");

        // 3. Simple Consonants Mapping
        const map: Record<string, string> = {
                p: "p",
                b: "b",
                t: "t",
                d: "d",
                k: "k",
                g: "g",
                f: "f",
                v: "v",
                s: "s",
                z: "z",
                h: "h",
                m: "m",
                n: "n",
                l: "l",
                r: "r",
                j: "y",
                w: "v", // IPA /w/ is usually 'v' in CRH
        };

        return t
                .split("")
                .map((char) => map[char] || char)
                .join("");
}
