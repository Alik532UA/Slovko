const fs = require("fs");
const path = require("path");

// Fixed path: __dirname is scripts/maintenance, so we need to go up twice
const level = "A2";
const wordsPath = path.join(
	__dirname,
	"..",
	"..",
	"src",
	"lib",
	"data",
	"words",
	"levels",
	`${level}.json`,
);
const wordsData = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
const validKeys = new Set(wordsData.words);

const languages = ["uk", "crh", "de", "nl", "en"];

languages.forEach((lang) => {
	const translationPath = path.join(
		__dirname,
		"..",
		"..",
		"src",
		"lib",
		"data",
		"translations",
		lang,
		"levels",
		`${level}.json`,
	);
	if (fs.existsSync(translationPath)) {
		const translationData = JSON.parse(
			fs.readFileSync(translationPath, "utf8"),
		);
		const newTranslationData = {};

		// Keep only valid keys that are in the words list
		validKeys.forEach((key) => {
			if (translationData[key] !== undefined) {
				newTranslationData[key] = translationData[key];
			} else {
				newTranslationData[key] = key; // Placeholder if missing
			}
		});

		fs.writeFileSync(
			translationPath,
			JSON.stringify(newTranslationData, null, 4),
			"utf8",
		);
		console.log(`Synchronized ${lang} translations for ${level}`);
	}
});
