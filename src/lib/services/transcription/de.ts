/**
 * DE Transcription Rules (German)
 */

export function generateDeIPA(text: string): string {
	let t = text.toLowerCase();

	t = t
		.replace(/sch/g, "ʃ")
		.replace(/ch/g, "ç")
		.replace(/ei/g, "aɪ")
		.replace(/ie/g, "iː")
		.replace(/eu/g, "ɔʏ")
		.replace(/äu/g, "ɔʏ")
		.replace(/eh/g, "eː")
		.replace(/ah/g, "aː")
		.replace(/oh/g, "oː")
		.replace(/uh/g, "uː")
		.replace(/ng/g, "ŋ")
		.replace(/st/g, "ʃt")
		.replace(/sp/g, "ʃp")
		.replace(/v/g, "f")
		.replace(/w/g, "v")
		.replace(/z/g, "ts")
		.replace(/ß/g, "s")
		.replace(/ä/g, "ɛ")
		.replace(/ö/g, "ø")
		.replace(/ü/g, "y")
		.replace(/i(?=[b-df-hj-np-tv-z]{2})/g, "ɪ") // short i before double cons
		.replace(/u(?=[b-df-hj-np-tv-z]e)/g, "uː")
		.replace(/e(r|n|l)?($|\s)/g, "ə$1");

	return t;
}
