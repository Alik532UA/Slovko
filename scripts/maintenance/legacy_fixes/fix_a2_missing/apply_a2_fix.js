import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { missingWords as w1 } from "./missing_words_data_1.js";
import { missingWords2 as w2 } from "./missing_words_data_2.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allNewWords = { ...w1, ...w2 };

// Adjusted path: scripts/maintenance/fix_a2_missing/ -> ../../../src/lib/data
const baseDir = path.join(__dirname, "../../../src/lib/data");
const translationsDir = path.join(baseDir, "translations");
const transcriptionsDir = path.join(baseDir, "transcriptions");

const languages = ["en", "uk", "de", "nl", "crh"];
const level = "A2";

languages.forEach((lang) => {
	const file = path.join(translationsDir, lang, "levels", `${level}.json`);
	let data = {};
	if (fs.existsSync(file)) {
		data = JSON.parse(fs.readFileSync(file, "utf8"));
	} else {
		console.warn(`File not found: ${file}`);
	}

	let modified = false;
	for (const [key, translations] of Object.entries(allNewWords)) {
		if (!data[key] && translations[lang]) {
			data[key] = translations[lang];
			modified = true;
		}
	}

	if (modified) {
		fs.writeFileSync(file, JSON.stringify(data, null, 4));
		console.log(`Updated translations for ${lang}`);
	} else {
		console.log(`No changes for ${lang}`);
	}
});

// Transcriptions (stored in levels/A2.json, not en/levels/A2.json)
const transFile = path.join(transcriptionsDir, "levels", `${level}.json`);
let transData = {};
if (fs.existsSync(transFile)) {
	transData = JSON.parse(fs.readFileSync(transFile, "utf8"));
} else {
	console.warn(`Transcription file not found: ${transFile}`);
}

let transModified = false;
for (const [key, translations] of Object.entries(allNewWords)) {
	if (!transData[key] && translations.transcription) {
		transData[key] = translations.transcription;
		transModified = true;
	}
}

if (transModified) {
	fs.writeFileSync(transFile, JSON.stringify(transData, null, 4));
	console.log(`Updated transcriptions`);
} else {
	console.log(`No changes for transcriptions`);
}
