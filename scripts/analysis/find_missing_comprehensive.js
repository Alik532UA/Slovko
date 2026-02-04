import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const langs = ["en", "uk", "de", "nl", "crh", "el"];
const baseDir = path.join(__dirname, "../../src/lib/data");

const report = {};

levels.forEach((level) => {
	const wordsFile = path.join(baseDir, "words/levels", `${level}.json`);
	if (!fs.existsSync(wordsFile)) return;

	let wordsData;
	try {
		const content = fs.readFileSync(wordsFile, "utf8");
		wordsData = JSON.parse(content);
	} catch (e) {
		console.error(`Error parsing ${wordsFile}: ${e.message}`);
		return;
	}

	// words.json contains a field "words" which is an array of keys
	const allWords = Array.isArray(wordsData.words) ? wordsData.words : [];

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
			try {
				const transData = JSON.parse(fs.readFileSync(transPath, "utf8"));
				const transKeys = new Set(Object.keys(transData));

				allWords.forEach((word) => {
					if (!transKeys.has(word)) {
						missing.push(word);
					}
				});
			} catch (e) {
				console.error(`Error parsing ${transPath}: ${e.message}`);
				missing = ["FILE_ERROR"];
			}
		} else {
			missing = [...allWords];
		}

		if (missing.length > 0) {
			report[level][lang] = {
				count: missing.length,
				words: missing,
			};
		}
	});
});

console.log(JSON.stringify(report, null, 2));
