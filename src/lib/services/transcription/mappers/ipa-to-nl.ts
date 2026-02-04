/**
 * IPA to Dutch (NL) Mapper
 * Converts IPA symbols to Dutch-style latin transcription.
 */

export function mapIpaToNl(ipa: string): string {
	let t = ipa.toLowerCase();

	// 1. Vowels (Dutch phonetic logic)
	t = t
		.replace(/iː/g, "ie")
		.replace(/ɪ/g, "i")
		.replace(/eː/g, "ee")
		.replace(/ɛ/g, "e")
		.replace(/æ/g, "e")
		.replace(/aː/g, "aa")
		.replace(/ɑː/g, "a")
		.replace(/ɔː/g, "oo")
		.replace(/ɒ/g, "o")
		.replace(/uː/g, "oe")
		.replace(/ʊ/g, "oe")
		.replace(/ʌ/g, "a")
		.replace(/ə/g, "e")
		.replace(/ø/g, "eu")
		.replace(/y/g, "uu")
		.replace(/aɪ/g, "aj")
		.replace(/ɔʏ/g, "oj")
		.replace(/eɪ/g, "eej")
		.replace(/aʊ/g, "auw");

	// 2. Consonants
	t = t
		.replace(/tʃ/g, "tsj")
		.replace(/dʒ/g, "dzj")
		.replace(/ʃ/g, "sj")
		.replace(/ʒ/g, "zj")
		.replace(/ŋ/g, "ng")
		.replace(/θ/g, "s")
		.replace(/ð/g, "z")
		.replace(/x/g, "ch")
		.replace(/ɣ/g, "g")
		.replace(/ɦ/g, "h");

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
		w: "w",
	};

	return t
		.split("")
		.map((char) => map[char] || char)
		.join("");
}
