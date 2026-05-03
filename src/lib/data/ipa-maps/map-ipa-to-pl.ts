/**
 * IPA to Polish (PL) Mapper
 * Converts standard IPA symbols to "folk" Polish transcription.
 * For example: /ʃ/ -> sz, /tʃ/ -> cz.
 */
export const IPA_TO_PL: Record<string, string> = {
	// Diphthongs & Sequences first
	aɪ: "aj",
	ɔʏ: "oj",
	eɪ: "ej",
	aʊ: "au",
	tʃ: "cz",
	dʒ: "dż",

	// Long Vowels
	iː: "i",
	eː: "e",
	aː: "a",
	ɑː: "a",
	ɔː: "o",
	uː: "u",

	// Short Vowels
	ɪ: "i",
	ɛ: "e",
	æ: "e",
	ɒ: "o",
	ʊ: "u",
	ʌ: "a",
	ə: "e", // Neutral vowel
	ø: "e", // German ö
	y: "i", // German ü
	
	// Complex Consonants
	ʃ: "sz",
	ʒ: "ż",
	ŋ: "n",
	θ: "s", // th as in think
	ð: "z", // th as in this
	x: "ch",
	ɣ: "g",
	ɦ: "h",

	// Simple Consonants
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
