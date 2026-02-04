/**
 * NL Transcription Rules (Dutch)
 */

export function generateNlIPA(text: string): string {
	let t = text.toLowerCase();

	// 1. Long vowels & Digraphs (Order is critical)
	t = t
		.replace(/sch/g, "sx")
		.replace(/ch/g, "x")
		.replace(/ij/g, "ɛi")
		.replace(/ei/g, "ɛi")
		.replace(/ui/g, "œy")
		.replace(/oe/g, "u")
		.replace(/au/g, "ɑu")
		.replace(/ou/g, "ɑu")
		.replace(/eu/g, "øː")
		.replace(/ie/g, "i")
		.replace(/aa/g, "aː")
		.replace(/ee/g, "eː")
		.replace(/oo/g, "oː")
		.replace(/uu/g, "yː");

	// 2. Complex Consonants
	t = t
		.replace(/ng/g, "ŋ")
		.replace(/nj/g, "ɲ")
		.replace(/sj/g, "ʃ")
		.replace(/zj/g, "ʒ");

	// 3. Special endings (simplified)
	t = t
		.replace(/en($|\s)/g, "ə")
		.replace(/je($|\s)/g, "jə");

	// 4. Single Letter Mapping
	const map: Record<string, string> = {
		j: "j",
		y: "i",
		v: "v",
		w: "ʋ",
		z: "z",
		g: "ɣ",
		c: "k",
		r: "r",
		l: "l",
		n: "n",
		m: "m",
		t: "t",
		d: "d",
		s: "s",
		p: "p",
		b: "b",
		k: "k",
		f: "f",
		h: "h",
	};

	return t
		.split("")
		.map((c) => map[c] || c)
		.join("");
}