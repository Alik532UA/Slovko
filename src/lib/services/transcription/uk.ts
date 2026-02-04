/**
 * UK Transcription Rules (Ukrainian)
 */

const UK_TO_LATIN_MAP: Record<string, string> = {
	а: "a",
	б: "b",
	в: "v",
	г: "h",
	ґ: "g",
	д: "d",
	е: "e",
	є: "ye",
	ж: "zh",
	з: "z",
	и: "y",
	і: "i",
	ї: "yi",
	й: "y",
	к: "k",
	л: "l",
	м: "m",
	н: "n",
	о: "o",
	п: "p",
	р: "r",
	с: "s",
	т: "t",
	у: "u",
	ф: "f",
	х: "kh",
	ц: "ts",
	ч: "ch",
	ш: "sh",
	щ: "shch",
	ь: "'",
	ю: "yu",
	я: "ya",
	"'": "",
};

const UK_IPA_MAP: Record<string, string> = {
	а: "a",
	б: "b",
	в: "v",
	г: "ɦ",
	ґ: "g",
	д: "d",
	е: "ɛ",
	є: "jɛ",
	ж: "ʒ",
	з: "z",
	и: "ɪ",
	і: "i",
	ї: "ji",
	й: "j",
	к: "k",
	л: "l",
	м: "m",
	н: "n",
	о: "ɔ",
	п: "p",
	р: "r",
	с: "s",
	т: "t",
	у: "u",
	ф: "f",
	х: "x",
	ц: "ts",
	ч: "tʃ",
	ш: "ʃ",
	щ: "ʃtʃ",
	ь: "ʲ",
	ю: "ju",
	я: "ja",
	"'": "",
};

export function transliterateUkToLatin(text: string): string {
	return text
		.toLowerCase()
		.split("")
		.map((char) => {
			return UK_TO_LATIN_MAP[char] || char;
		})
		.join("");
}

export function generateUkIPA(text: string): string {
	return text
		.toLowerCase()
		.split("")
		.map((char) => UK_IPA_MAP[char] || char)
		.join("");
}
