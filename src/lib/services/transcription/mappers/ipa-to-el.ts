/**
 * IPA to Greek (EL) Mapper
 * Converts standard IPA symbols to "folk" Greek phonetic transcription.
 * For example: /b/ -> μπ, /d/ -> ντ, /ʃ/ -> σ.
 */

export function mapIpaToEl(ipa: string): string {
        let t = ipa.toLowerCase();

        // 1. Vowels (Greek phonetic logic)
        t = t
                .replace(/iː/g, "ι")
                .replace(/ɪ/g, "ι")
                .replace(/eː/g, "ε")
                .replace(/ɛ/g, "ε")
                .replace(/æ/g, "α")
                .replace(/aː/g, "α")
                .replace(/ɑː/g, "α")
                .replace(/ɔː/g, "ο")
                .replace(/ɒ/g, "ο")
                .replace(/uː/g, "ου")
                .replace(/ʊ/g, "ου")
                .replace(/ʌ/g, "α")
                .replace(/ə/g, "ε") // Neutral vowel
                .replace(/ø/g, "ε") // German ö
                .replace(/y/g, "υ") // German ü
                .replace(/aɪ/g, "άι")
                .replace(/ɔʏ/g, "όι")
                .replace(/eɪ/g, "έι")
                .replace(/aʊ/g, "άου");

        // 2. Complex Consonants (Greek Digraphs)
        t = t
                .replace(/tʃ/g, "τσ")
                .replace(/dʒ/g, "τζ")
                .replace(/ʃ/g, "σ")
                .replace(/ʒ/g, "ζ")
                .replace(/ŋ/g, "ν")
                .replace(/θ/g, "θ") // th as in think
                .replace(/ð/g, "δ") // th as in this
                .replace(/x/g, "χ")
                .replace(/ɣ/g, "γ")
                .replace(/ɦ/g, "χ");

        // 3. Simple Consonants Mapping (Greek alphabet)
        const map: Record<string, string> = {
                p: "π",
                b: "μπ", // Greek b sound
                t: "τ",
                d: "ντ", // Greek d sound
                k: "κ",
                g: "γκ", // Greek g sound
                f: "φ",
                v: "β",
                s: "σ",
                z: "ζ",
                h: "χ",
                m: "μ",
                n: "ν",
                l: "λ",
                r: "ρ",
                j: "γι",
                w: "ου", // IPA /w/ as in west -> ουέστ
        };

        return t
                .split("")
                .map((char) => map[char] || char)
                .join("");
}
