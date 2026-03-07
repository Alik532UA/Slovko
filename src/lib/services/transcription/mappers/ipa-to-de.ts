/**
 * IPA to German (DE) Mapper
 * Converts standard IPA symbols to "folk" German phonetic transcription (Aussprachehilfe).
 * For example: /ʃ/ -> sch, /v/ -> w, /tʃ/ -> tsch.
 */

export function mapIpaToDe(ipa: string): string {
        let t = ipa.toLowerCase();

        // 1. Vowels (German phonetic logic)
        t = t
                .replace(/iː/g, "ie")
                .replace(/ɪ/g, "i")
                .replace(/eː/g, "eh")
                .replace(/ɛ/g, "e")
                .replace(/æ/g, "ä")
                .replace(/aː/g, "a")
                .replace(/ɑː/g, "ah")
                .replace(/ɔː/g, "oh")
                .replace(/ɒ/g, "o")
                .replace(/uː/g, "uh")
                .replace(/ʊ/g, "u")
                .replace(/ʌ/g, "a")
                .replace(/ə/g, "e") // Schwa
                .replace(/ɜː/g, "er") // as in bird
                .replace(/ø/g, "ö")
                .replace(/y/g, "ü")
                .replace(/aɪ/g, "ai")
                .replace(/ɔʏ/g, "oi")
                .replace(/eɪ/g, "ey")
                .replace(/aʊ/g, "au");

        // 2. Complex Consonants (German style)
        t = t
                .replace(/tʃ/g, "tsch")
                .replace(/dʒ/g, "dsch")
                .replace(/ʃ/g, "sch")
                .replace(/ʒ/g, "sch") // soft zh as in 'Journal'
                .replace(/ŋ/g, "ng")
                .replace(/θ/g, "s") // th (thin) -> s
                .replace(/ð/g, "s") // th (this) -> s/z
                .replace(/x/g, "ch")
                .replace(/ɣ/g, "g")
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
                v: "w", // IPA /v/ is German 'w'
                s: "ss", // unvoiced s
                z: "s", // IPA /z/ is German voiced 's'
                h: "h",
                m: "m",
                n: "n",
                l: "l",
                r: "r",
                j: "j",
                w: "w", // IPA /w/ as in west -> west
        };

        return t
                .split("")
                .map((char) => map[char] || char)
                .join("");
}
