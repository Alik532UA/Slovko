/**
 * IPA to Crimean Tatar (Latin) Mapping
 * Comprehensive coverage of all IPA symbols used in the system
 * Ordered by specificity (longer sequences first)
 */
export const IPA_TO_CRH: Record<string, string> = {
	// === MULTI-CHARACTER SEQUENCES (Must be first!) ===

	// Affricates
	tʃ: "ç",
	dʒ: "c",
	ts: "ts",
	ʃtʃ: "şç", // Ukrainian щ approximation

	// Diphthongs
	aɪ: "ay",
	eɪ: "ey",
	ɛi: "ey", // Dutch ij/ei
	ɔɪ: "oy",
	ɔʏ: "öy", // German eu/äu
	aʊ: "av",
	ɑu: "av", // Dutch au/ou
	əʊ: "o",
	øy: "öy", // Dutch ui
	œy: "öy",

	// J-combinations
	juː: "yü",
	jʊ: "yu",
	ja: "ya",
	jɛ: "ye", // Ukrainian є
	ju: "yu",
	je: "ye",
	ji: "yi",
	jɔ: "yo",

	// Vowel combinations
	ɪə: "ia",
	eə: "ea",
	ʊə: "ua",

	// === LONG VOWELS ===
	iː: "i",
	uː: "u",
	yː: "ü", // Dutch uu, German ü long
	ɑː: "a",
	aː: "a",
	ɔː: "o",
	oː: "o",
	eː: "e",
	øː: "ö", // Dutch eu
	ɜː: "e",

	// === SHORT VOWELS ===
	ɪ: "i",
	e: "e",
	ɛ: "e",
	æ: "e",
	ɒ: "o",
	ɔ: "o",
	ʌ: "a",
	ɑ: "a",
	ʊ: "u",
	y: "ü", // Dutch/German u
	ʏ: "ü",
	ø: "ö", // Dutch/German ö
	œ: "ö",
	ə: "e", // Schwa

	// Basic vowels
	a: "a",
	i: "i",
	o: "o",
	u: "u",
	ɯ: "ı", // CRH back unrounded vowel

	// === CONSONANTS ===

	// Stops
	p: "p",
	b: "b",
	t: "t",
	d: "d",
	k: "k",
	ɡ: "g",
	g: "g",
	q: "q", // CRH uvular stop (keep as q)
	c: "k", // fallback

	// Fricatives
	f: "f",
	v: "v",
	ʋ: "v", // Dutch w
	θ: "s", // English th (voiceless)
	ð: "z", // English th (voiced)
	s: "s",
	z: "z",
	ʃ: "ş",
	ʒ: "j",
	ɣ: "ğ", // Dutch g, CRH ğ
	ɦ: "h", // Ukrainian г
	x: "h", // Dutch ch, German ch
	h: "h", // English h
	ç: "hy", // German ich-laut approximation

	// Nasals
	m: "m",
	n: "n",
	ŋ: "ñ", // ng sound -> CRH ñ
	ɲ: "ny", // palatalized n

	// Liquids
	l: "l",
	r: "r",
	ɾ: "r", // Tap r
	ʀ: "r", // French/German uvular r

	// Glides
	j: "y",
	w: "v",

	// === MODIFIERS & SYNTAX ===
	ˈ: "", // Primary stress
	ˌ: "", // Secondary stress
	".": "", // Syllable boundary
	":": "", // Length mark (alternative)
	ː: "", // Length mark
	" ": " ",
	ʲ: "", // Palatalization (no equivalent, skip)
};
