import { IPA_TO_UK } from "../data/ipa-maps/map-ipa-to-uk";
import { IPA_TO_CRH } from "../data/ipa-maps/map-ipa-to-crh";
import { IPA_TO_NL } from "../data/ipa-maps/map-ipa-to-nl";
import { IPA_TO_DE } from "../data/ipa-maps/map-ipa-to-de";
import type { Language } from "../types";

// Pre-sort keys by length descending for greedy matching
const UK_KEYS = Object.keys(IPA_TO_UK).sort((a, b) => b.length - a.length);
const CRH_KEYS = Object.keys(IPA_TO_CRH).sort((a, b) => b.length - a.length);
const NL_KEYS = Object.keys(IPA_TO_NL).sort((a, b) => b.length - a.length);
const DE_KEYS = Object.keys(IPA_TO_DE).sort((a, b) => b.length - a.length);

/**
 * Converts an IPA string to the target language's script/sounds
 */
export function convertIPAToTarget(ipa: string, targetLang: Language): string {
	if (!ipa) return "";

	let mapping: Record<string, string>;
	let keys: string[];

	switch (targetLang) {
		case "uk":
			mapping = IPA_TO_UK;
			keys = UK_KEYS;
			break;
		case "crh":
			mapping = IPA_TO_CRH;
			keys = CRH_KEYS;
			break;
		case "nl":
			mapping = IPA_TO_NL;
			keys = NL_KEYS;
			break;
		case "de":
			mapping = IPA_TO_DE;
			keys = DE_KEYS;
			break;
		case "en":
			// English users see raw IPA (linguistic standard)
			return ipa;
		default:
			// Unknown language: return IPA as is
			return ipa;
	}

	let result = "";
	let i = 0;

	while (i < ipa.length) {
		let match = false;

		for (const key of keys) {
			if (ipa.startsWith(key, i)) {
				result += mapping[key];
				i += key.length;
				match = true;
				break;
			}
		}

		if (!match) {
			// Symbol not in map: keep it
			result += ipa[i];
			i++;
		}
	}

	return result;
}
