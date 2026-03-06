/**
 * IPA to Polish (PL) Mapper
 * Converts standard IPA symbols to "folk" Polish transcription.
 * For example: /ʃ/ -> sz, /tʃ/ -> cz.
 */

export function mapIpaToPl(ipa: string): string {
	let t = ipa.toLowerCase();

	// 1. Vowels (Polish phonetic logic)
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
		.replace(/ø/g, "e") // German ö
		.replace(/y/g, "i") // German ü
		.replace(/aɪ/g, "aj")
		.replace(/ɔʏ/g, "oj")
		.replace(/eɪ/g, "ej")
		.replace(/aʊ/g, "au");

	// 2. Complex Consonants (Digraphs)
	t = t
		.replace(/tʃ/g, "cz")
		.replace(/dʒ/g, "dż")
		.replace(/ʃ/g, "sz")
		.replace(/ʒ/g, "ż")
		.replace(/ŋ/g, "n")
		.replace(/θ/g, "s") // th as in think
		.replace(/ð/g, "z") // th as in this
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
		v: "v",
		s: "s",
		z: "z",
		h: "h",
		m: "m",
		n: "n",
		l: "l",
		r: "r",
		j: "j",
		w: "ł", // IPA /w/ is Polish 'ł'
	};

	return t
		.split("")
		.map((char) => map[char] || char)
		.join("");
}
