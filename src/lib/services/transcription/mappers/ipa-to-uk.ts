/**
 * IPA to Ukrainian Cyrillic Mapper
 * Converts standard IPA symbols to "folk" Ukrainian transcription.
 */

export function mapIpaToUk(ipa: string): string {
	let t = ipa.toLowerCase();

	// 1. Long vowels & Diphthongs (Order matters)
	t = t
		.replace(/iː/g, "і")
		.replace(/ɪ/g, "и")
		.replace(/eː/g, "е")
		.replace(/ɛ/g, "е")
		.replace(/æ/g, "е")
		.replace(/aː/g, "а")
		.replace(/ɑː/g, "а")
		.replace(/ɔː/g, "о")
		.replace(/ɒ/g, "о")
		.replace(/uː/g, "у")
		.replace(/ʊ/g, "у")
		.replace(/ʌ/g, "а")
		.replace(/ə/g, "е") // Neutral vowel
		.replace(/ø/g, "е") // German ö
		.replace(/y/g, "ю") // German ü or IPA y
		.replace(/aɪ/g, "ай")
		.replace(/ɔʏ/g, "ой")
		.replace(/eɪ/g, "ей")
		.replace(/aʊ/g, "ау");

	// 2. Complex Consonants (Digraphs)
	t = t
		.replace(/tʃ/g, "ч")
		.replace(/dʒ/g, "дж")
		.replace(/ʃ/g, "ш")
		.replace(/ʒ/g, "ж")
		.replace(/ŋ/g, "н")
		.replace(/θ/g, "с") // th as in think
		.replace(/ð/g, "з") // th as in this
		.replace(/x/g, "х")
		.replace(/ɣ/g, "г")
		.replace(/ɦ/g, "г");

	// 3. Simple Consonants Mapping
	const map: Record<string, string> = {
		p: "п",
		b: "б",
		t: "т",
		d: "д",
		k: "к",
		g: "ґ",
		f: "ф",
		v: "в",
		s: "с",
		z: "з",
		h: "х",
		m: "м",
		n: "н",
		l: "л",
		r: "р",
		j: "й",
		w: "в",
	};

	return t
		.split("")
		.map((char) => map[char] || char)
		.join("");
}
