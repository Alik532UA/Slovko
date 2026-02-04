import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../");

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const targetLevel = "B2";
const languages = ["uk", "en", "de", "nl", "crh"];

function loadJson(filePath) {
	if (fs.existsSync(filePath)) {
		return JSON.parse(fs.readFileSync(filePath, "utf8"));
	}
	return {};
}

function saveJson(filePath, data) {
	fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

async function fixB2Gaps() {
	console.log(
		`Starting fix for ${targetLevel} using data from other levels...`,
	);

	// Load B2 data
	const b2WordsFile = path.join(
		rootDir,
		`src/lib/data/words/levels/${targetLevel}.json`,
	);
	const b2Words = loadJson(b2WordsFile).words || [];

	// Load all data from all levels into memory for quick lookup
	const allData = {
		translations: {},
		transcriptions: {},
	};

	for (const lang of languages) {
		allData.translations[lang] = {};
		for (const lvl of levels) {
			if (lvl === targetLevel) continue; // Skip B2 source, we want others
			const file = path.join(
				rootDir,
				`src/lib/data/translations/${lang}/levels/${lvl}.json`,
			);
			const data = loadJson(file);
			Object.assign(allData.translations[lang], data);
		}
	}

	// Load transcriptions
	allData.transcriptions = {};
	for (const lvl of levels) {
		if (lvl === targetLevel) continue;
		const file = path.join(
			rootDir,
			`src/lib/data/transcriptions/levels/${lvl}.json`,
		);
		const data = loadJson(file);
		Object.assign(allData.transcriptions, data);
	}

	// Process Translations
	for (const lang of languages) {
		const b2TransFile = path.join(
			rootDir,
			`src/lib/data/translations/${lang}/levels/${targetLevel}.json`,
		);
		const b2TransData = loadJson(b2TransFile);
		let updatedCount = 0;

		for (const word of b2Words) {
			const currentVal = b2TransData[word];
			// Check if missing or looks like a placeholder (value == key with spaces)
			const isPlaceholder =
				currentVal === word.replace(/_/g, " ") || currentVal === word;

			if (
				!currentVal ||
				currentVal === "" ||
				(lang !== "en" && isPlaceholder)
			) {
				// Try to find in other levels
				if (allData.translations[lang][word]) {
					b2TransData[word] = allData.translations[lang][word];
					updatedCount++;
				}
			}
		}

		if (updatedCount > 0) {
			saveJson(b2TransFile, b2TransData);
			console.log(
				`Updated ${updatedCount} translations for ${lang} in ${targetLevel}`,
			);
		}
	}

	// Process Transcriptions
	const b2TranscFile = path.join(
		rootDir,
		`src/lib/data/transcriptions/levels/${targetLevel}.json`,
	);
	const b2TranscData = loadJson(b2TranscFile);
	let transUpdatedCount = 0;

	for (const word of b2Words) {
		const currentVal = b2TranscData[word];
		if (!currentVal || currentVal === "") {
			if (allData.transcriptions[word] && allData.transcriptions[word] !== "") {
				b2TranscData[word] = allData.transcriptions[word];
				transUpdatedCount++;
			}
		}
	}

	if (transUpdatedCount > 0) {
		saveJson(b2TranscFile, b2TranscData);
		console.log(
			`Updated ${transUpdatedCount} transcriptions in ${targetLevel}`,
		);
	}
}

fixB2Gaps();
