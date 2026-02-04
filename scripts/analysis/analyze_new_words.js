import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, "../src/lib/data/translations");
const ADD_FILE = path.join(__dirname, "../add/A2 Basic Елементарний.txt");

// Helper to read JSON
function readJson(filePath) {
	if (!fs.existsSync(filePath)) return {};
	return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// Load all existing keys and translations
const existingData = new Map(); // Key: English Word, Value: Array of { key, uk, category, file }

const languages = ["en", "uk"];
const categories = ["levels", "topics"];

// We need to load EN to get the key->English mapping, and UK to get key->Ukrainian mapping.
// Actually, we need to map Key -> { en: ..., uk: ... } first.

const keyMap = new Map(); // Key -> { en: string, uk: string, file: string }

// Reading EN files
for (const cat of categories) {
	const enDir = path.join(TRANSLATIONS_DIR, "en", cat);
	if (!fs.existsSync(enDir)) continue;
	const files = fs.readdirSync(enDir);
	for (const file of files) {
		if (!file.endsWith(".json")) continue;
		const enContent = readJson(path.join(enDir, file));
		const ukContent = readJson(path.join(TRANSLATIONS_DIR, "uk", cat, file));

		for (const [key, enWord] of Object.entries(enContent)) {
			const ukWord = ukContent[key];
			if (!existingData.has(enWord.toLowerCase())) {
				existingData.set(enWord.toLowerCase(), []);
			}
			existingData.get(enWord.toLowerCase()).push({
				key,
				uk: ukWord,
				file: `${cat}/${file}`,
			});
		}
	}
}

// Parsing the Add file
const fileContent = fs.readFileSync(ADD_FILE, "utf-8");
const lines = fileContent.split("\n");

let currentSection = "General";
const missingWords = [];

for (const line of lines) {
	const trimmed = line.trim();
	if (!trimmed) continue;

	if (trimmed.startsWith("//")) {
		currentSection = trimmed.replace("//", "").trim();
		continue;
	}

	const parts = trimmed.split(";");
	if (parts.length < 2) continue;

	const enRaw = parts[0].trim();
	const ukRaw = parts[1].trim();
	const enLower = enRaw.toLowerCase();

	// Check if exists
	let exists = false;
	if (existingData.has(enLower)) {
		const candidates = existingData.get(enLower);
		// Check if any candidate has a similar UK translation
		// Simple check: does the existing UK string contain reasonable overlap?
		// Or if the new UK string is a substring of existing or vice versa.

		for (const cand of candidates) {
			if (!cand.uk) continue;
			// Normalize for comparison
			const candUk = cand.uk.toLowerCase();
			const newUk = ukRaw.toLowerCase();

			// If strictly equal or substring match
			if (
				candUk === newUk ||
				candUk.includes(newUk) ||
				newUk.includes(candUk)
			) {
				exists = true;
				break;
			}

			// Also check for multiple meanings separated by ' / '
			const candParts = candUk.split(" / ").map((s) => s.trim());
			const newParts = newUk.split(" / ").map((s) => s.trim());

			if (candParts.some((p) => newParts.includes(p))) {
				exists = true;
				break;
			}
		}
	}

	if (!exists) {
		// Generate a proposed key
		// Infer type from section
		let suffix = "";
		const sectionLower = currentSection.toLowerCase();
		if (sectionLower.includes("verb") || sectionLower.includes("дієслова"))
			suffix = "_verb";
		else if (
			sectionLower.includes("adjective") ||
			sectionLower.includes("прикметники")
		)
			suffix = "_adj";
		else if (sectionLower.includes("noun") || sectionLower.includes("іменники"))
			suffix = "_noun"; // Though usually nouns are default

		// If word has polysemy in the text file ("right; правий / правильний"), we might need to split it?
		// But for now let's just create one entry and let the user (me) refine it.
		// Actually the prompt says "break;ламати" and "break;перерва" should be separate.
		// If the text file has one line "right;правий / правильний", it treats it as one card.
		// BUT polysemy refactoring says we should split meanings.
		// If the input file groups them, maybe I should keep them grouped?
		// No, the refactoring guide specifically says "break" (one word) -> "break_damage", "break_pause".
		// If the input is "right;правий / правильний", it maps one English word to two Ukrainian concepts.
		// In the game, if the card says "right", does matches "правий" or "правильний"?
		// If "right" means both, then "right" <-> "правий / правильний" on the card is fine for a general "right".
		// BUT if "right" (direction) is distinct from "right" (correct), they should be split IF the game context allows.
		// The input file has "right;правий / правильний".

		let proposedKey = enLower.replace(/[^a-z0-9]/g, "_");
		if (suffix) proposedKey += suffix;

		// Ensure key uniqueness unique against *existing* keys
		// encoding logic similar to my thought process

		// If key exists (e.g. 'clean_adj' exists), try 'clean_adj_2' etc.
		// But we don't have access to all keys here easily without reloading, but we can check existingData keys.
		// Better: just output the list and I'll process key generation in the next step.

		missingWords.push({
			en: enRaw,
			uk: ukRaw,
			section: currentSection,
			proposedKey,
			reason: "Not found in existing translations",
		});
	}
}

console.log(JSON.stringify(missingWords, null, 2));
