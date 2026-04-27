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
		.replace(/t͡ʂ/g, "tsj") // Polish cz -> tsj
		.replace(/d͡z/g, "dz") // Polish dz
		.replace(/d͡ʑ/g, "dzj") // Polish dź -> dzj
		.replace(/d͡ʐ/g, "dzj") // Polish dż -> dzj
		.replace(/t͡ɕ/g, "tsj") // Polish ć -> tsj
		.replace(/t͡s/g, "ts") // Polish c
		.replace(/ʂ/g, "sj") // Polish sz -> sj
		.replace(/ʐ/g, "zj") // Polish rz/ż -> zj
		.replace(/ɕ/g, "sj") // Polish ś -> sj
		.replace(/ʑ/g, "zj") // Polish ź -> zj
		.replace(/ɲ/g, "nj") // Polish ń -> nj
		.replace(/ɔ̃/g, "on") // Polish ą
		.replace(/ɛ̃/g, "en") // Polish ę
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
