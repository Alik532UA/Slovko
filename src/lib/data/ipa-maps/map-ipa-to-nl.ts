/**
 * IPA to Dutch (Latin) Mapping
 * Converts IPA symbols to Dutch-readable Latin script
 */
export const IPA_TO_NL: Record<string, string> = {
	// === MULTI-CHARACTER SEQUENCES ===

	// Affricates
	tʃ: "tsj",
	dʒ: "dzj",
	ts: "ts",
	ʃtʃ: "sjtsj",

	// Diphthongs
	aɪ: "ai",
	eɪ: "ei",
	ɛi: "ij",
	ɔɪ: "oi",
	ɔʏ: "eu",
	aʊ: "au",
	ɑu: "au",
	əʊ: "o",
	øy: "ui",
	œy: "ui",

	// J-combinations
	juː: "joe",
	jʊ: "joe",
	ja: "ja",
	jɛ: "je",
	ju: "joe",
	je: "je",
	ji: "ji",
	jɔ: "jo",

	// Vowel combinations
	ɪə: "ia",
	eə: "ea",
	ʊə: "oe-a",

	// === LONG VOWELS ===
	iː: "ie",
	uː: "oe",
	yː: "uu",
	ɑː: "aa",
	aː: "aa",
	ɔː: "oo",
	oː: "oo",
	eː: "ee",
	øː: "eu",
	ɜː: "u",

	// === SHORT VOWELS ===
	ɪ: "i",
	e: "e",
	ɛ: "e",
	æ: "e",
	ɒ: "o",
	ɔ: "o",
	ʌ: "a",
	ɑ: "a",
	ʊ: "oe",
	y: "u",
	ʏ: "u",
	ø: "eu",
	œ: "eu",
	ə: "e",

	// Basic vowels
	a: "a",
	i: "i",
	o: "o",
	u: "oe",
	ɯ: "i", // CRH ı approximation

	// === CONSONANTS ===
	p: "p",
	b: "b",
	t: "t",
	d: "d",
	k: "k",
	ɡ: "g",
	g: "g",
	q: "k",
	c: "k",

	f: "f",
	v: "v",
	ʋ: "w",
	θ: "s",
	ð: "z",
	s: "s",
	z: "z",
	ʃ: "sj",
	ʒ: "zj",
	ɣ: "g",
	ɦ: "h",
	x: "ch",
	h: "h",
	ç: "ch",

	m: "m",
	n: "n",
	ŋ: "ng",
	ɲ: "nj",

	l: "l",
	r: "r",
	ɾ: "r",
	ʀ: "r",

	j: "j",
	w: "w",

	// === MODIFIERS ===
	ˈ: "",
	ˌ: "",
	".": "",
	":": "",
	ː: "",
	" ": " ",
	ʲ: "j",
};
