/**
 * Правила транскрипції для польської мови (Polish IPA)
 * Використовується для генерації фонетичної допомоги в грі.
 */

export function generatePlIPA(text: string): string {
	if (!text) return "";

	let ipa = text.toLowerCase();

	// 1. Поєднання літер (Digraphs & Trigraphs)
	const digraphs: Record<string, string> = {
		"ch": "x",
		"cz": "t͡ʂ",
		"dz": "d͡z",
		"dź": "d͡ʑ",
		"dż": "d͡ʐ",
		"rz": "ʐ",
		"sz": "ʂ",
	};

	// 2. Специфічні літери (Special characters)
	const chars: Record<string, string> = {
		"ą": "ɔ̃",
		"ć": "t͡ɕ",
		"ę": "ɛ̃",
		"ł": "w",
		"ń": "ɲ",
		"ó": "u",
		"ś": "ɕ",
		"ź": "ʑ",
		"ż": "ʐ",
	};

	// Заміна диграфів (спочатку довші комбінації)
	for (const [key, value] of Object.entries(digraphs)) {
		ipa = ipa.replace(new RegExp(key, "g"), value);
	}

	// Заміна окремих літер
	for (const [key, value] of Object.entries(chars)) {
		ipa = ipa.replace(new RegExp(key, "g"), value);
	}

	// 3. Базові правила приголосних та голосних
	// (Це спрощена версія, польська мова має складніші правила наголосу та оглушення)
	ipa = ipa
		.replace(/w/g, "v") // w -> v
		.replace(/c/g, "t͡s") // c -> ts (якщо не в диграфі)
		.replace(/j/g, "j") // j -> j
		.replace(/y/g, "ɨ") // y -> i-подібний звук
		.replace(/i/g, "i"); // i -> i

	return `/${ipa}/`;
}
