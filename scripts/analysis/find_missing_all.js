import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const langs = ["en", "uk", "de", "nl", "crh"];
const baseDir = path.join(__dirname, "../../src/lib/data");

const report = {};

levels.forEach((level) => {
	const wordsFile = path.join(baseDir, "words/levels", `${level}.json`);
	if (!fs.existsSync(wordsFile)) return;

	const wordsData = JSON.parse(fs.readFileSync(wordsFile, "utf8"));
	const allWords = new Set(wordsData.words);

	report[level] = {};

	langs.forEach((lang) => {
		const transPath = path.join(
			baseDir,
			"translations",
			lang,
			"levels",
			`${level}.json`,
		);
		let missing = [];

		if (fs.existsSync(transPath)) {
			const transData = JSON.parse(fs.readFileSync(transPath, "utf8"));
			const transKeys = new Set(Object.keys(transData));

			allWords.forEach((word) => {
				if (!transKeys.has(word)) {
					missing.push(word);
				}
			});
		} else {
			missing = [...allWords]; // All missing if file doesn't exist
		}

		if (missing.length > 0) {
			report[level][lang] = missing;
		}
	});
});

// Also check transcriptions (en only for now usually, but structure might imply levels)
levels.forEach((level) => {
	const wordsFile = path.join(baseDir, "words/levels", `${level}.json`);
	if (!fs.existsSync(wordsFile)) return;
	const wordsData = JSON.parse(fs.readFileSync(wordsFile, "utf8"));
	const allWords = new Set(wordsData.words);

	const transFile = path.join(
		baseDir,
		"transcriptions/levels",
		`${level}.json`,
	);
	let missing = [];
	if (fs.existsSync(transFile)) {
		const transData = JSON.parse(fs.readFileSync(transFile, "utf8"));
		const transKeys = new Set(Object.keys(transData));
		allWords.forEach((word) => {
			if (!transKeys.has(word)) missing.push(word);
		});
	} else {
		missing = [...allWords];
	}
	if (missing.length > 0) {
		if (!report[level]) report[level] = {};
		report[level]["transcription"] = missing;
	}
});

const outputPath = path.join(__dirname, "missing_all_report.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`Report saved to ${outputPath}`);
