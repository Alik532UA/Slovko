/**
 * Greek (el) IPA transcription rules
 */

export function generateElIPA(text: string): string {
	let t = text.toLowerCase();

	// 1. Digraphs (Vowels)
	t = t
		.replace(/αι/g, "e")
		.replace(/ει/g, "i")
		.replace(/οι/g, "i")
		.replace(/υι/g, "i")
		.replace(/ου/g, "u")
		.replace(/η/g, "i")
		.replace(/ι/g, "i")
		.replace(/υ/g, "i")
		.replace(/ω/g, "o");

	// 2. Vowel + Y combinations (av/ev or af/ef)
	// Before voiced consonants and vowels: v
	// Before unvoiced consonants: f
	t = t
		.replace(/αυ(?=[αεηιουωβγδζλμνρ])/g, "av")
		.replace(/αυ/g, "af")
		.replace(/ευ(?=[αεηιουωβγδζλμνρ])/g, "ev")
		.replace(/ευ/g, "ef");

	// 3. Consonant Digraphs
	t = t
		.replace(/μπ/g, "b")
		.replace(/ντ/g, "d")
		.replace(/γκ/g, "g")
		.replace(/γγ/g, "ng")
		.replace(/τσ/g, "ts")
		.replace(/τζ/g, "dz");

	// 4. Single Letter Mapping
	const map: Record<string, string> = {
		α: "a",
		β: "v",
		γ: "ɣ",
		δ: "ð",
		ε: "e",
		ζ: "z",
		θ: "θ",
		κ: "k",
		λ: "l",
		μ: "m",
		ν: "n",
		ξ: "ks",
		ο: "o",
		π: "p",
		ρ: "r",
		σ: "s",
		ς: "s",
		τ: "t",
		φ: "f",
		χ: "x",
		ψ: "ps",
	};

	return t
		.split("")
		.map((char) => {
			// Remove accents for IPA generation if needed, but here we just map
			const baseChar = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
			return map[baseChar] || char;
		})
		.join("");
}
