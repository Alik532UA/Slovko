/**
 * IPA to Ukrainian Cyrillic Mapping
 * Comprehensive coverage of all IPA symbols used in the system
 * Ordered by specificity (longer sequences first to ensure greedy matching)
 */
export const IPA_TO_UK: Record<string, string> = {
	// === MULTI-CHARACTER SEQUENCES (Must be first!) ===

	// Affricates
	tʃ: "ч",
	dʒ: "дж",
	ts: "ц",
	ʃtʃ: "щ", // Ukrainian щ

	// Diphthongs
	aɪ: "ай",
	eɪ: "ей",
	ɛi: "ей", // Dutch ij/ei
	ɔɪ: "ой",
	ɔʏ: "ой", // German eu/äu
	aʊ: "ау",
	ɑu: "ау", // Dutch au/ou
	əʊ: "оу",
	øy: "ьой", // Dutch ui
	œy: "ьой",

	// J-combinations (йотовані)
	juː: "ю",
	jʊ: "ю",
	ja: "я",
	jɛ: "є", // Ukrainian є
	ju: "ю",
	je: "є",
	ji: "ї",
	jɔ: "йо",

	// Vowel combinations
	ɪə: "іа",
	eə: "еа",
	ʊə: "уа",

	// === LONG VOWELS ===
	iː: "і",
	uː: "у",
	yː: "ю", // Dutch uu, German ü long
	ɑː: "а",
	aː: "а",
	ɔː: "о",
	oː: "о",
	eː: "е",
	øː: "ьо", // Dutch eu
	ɜː: "е",

	// === SHORT VOWELS ===
	ɪ: "и",
	e: "е",
	ɛ: "е",
	æ: "е",
	ɒ: "о",
	ɔ: "о",
	ʌ: "а",
	ɑ: "а",
	ʊ: "у",
	y: "ю", // Dutch/German u
	ʏ: "ю",
	ø: "ьо", // Dutch/German ö
	œ: "ьо",
	ə: "е", // Schwa

	// Basic vowels
	a: "а",
	i: "і",
	o: "о",
	u: "у",
	ɯ: "и", // CRH ı (close back unrounded)

	// === CONSONANTS ===

	// Stops
	p: "п",
	b: "б",
	t: "т",
	d: "д",
	k: "к",
	ɡ: "ґ",
	g: "ґ",
	q: "к", // CRH uvular stop
	c: "к", // fallback

	// Fricatives
	f: "ф",
	v: "в",
	ʋ: "в", // Dutch w
	θ: "с", // English th (voiceless)
	ð: "з", // English th (voiced)
	s: "с",
	z: "з",
	ʃ: "ш",
	ʒ: "ж",
	ɣ: "г", // Dutch g, CRH ğ
	ɦ: "г", // Ukrainian г
	x: "х", // Dutch ch, German ch
	h: "х", // English h
	ç: "хь", // German ich-laut

	// Nasals
	m: "м",
	n: "н",
	ŋ: "нг", // ng sound
	ɲ: "нь", // Dutch nj

	// Liquids
	l: "л",
	r: "р",
	ɾ: "р", // Tap r
	ʀ: "р", // French/German uvular r

	// Glides
	j: "й",
	w: "в",

	// === MODIFIERS & SYNTAX ===
	ˈ: "", // Primary stress
	ˌ: "", // Secondary stress
	".": "", // Syllable boundary
	":": "", // Length mark (alternative)
	ː: "", // Length mark
	" ": " ",
	ʲ: "ь", // Palatalization (soft sign)

	// === FALLBACK for any remaining Latin letters ===
	// (These should ideally not be needed if IPA is correct)
};
