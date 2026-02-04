import fs from "fs";
import path from "path";

const wordsLevelsDir = "src/lib/data/words/levels";
const wordsTopicsDir = "src/lib/data/words/topics";

// 1. Отримуємо всі ключі з рівнів
const levelKeys = new Set();
const levelFiles = fs
	.readdirSync(wordsLevelsDir)
	.filter((f) => f.endsWith(".json"));
levelFiles.forEach((file) => {
	const content = JSON.parse(
		fs.readFileSync(path.join(wordsLevelsDir, file), "utf8"),
	);
	if (content.words) content.words.forEach((w) => levelKeys.add(wordId(w)));
});

function wordId(w) {
	return typeof w === "string" ? w : w.id; // На випадок якщо структура зміниться
}

// 2. Перевіряємо теми
const topicFiles = fs
	.readdirSync(wordsTopicsDir)
	.filter((f) => f.endsWith(".json"));
let errors = 0;

topicFiles.forEach((file) => {
	const keys = JSON.parse(
		fs.readFileSync(path.join(wordsTopicsDir, file), "utf8"),
	);
	const missing = keys.filter((key) => !levelKeys.has(key));

	if (missing.length > 0) {
		console.error(
			`\x1b[31m[ERROR]\x1b[0m Topic '${file}' contains missing keys:`,
			missing,
		);
		errors += missing.length;
	}
});

if (errors === 0) {
	console.log(
		"\x1b[32m[SUCCESS]\x1b[0m All topic keys are correctly defined in levels.",
	);
	process.exit(0);
} else {
	console.error(`\x1b[31m[FAILED]\x1b[0m Found ${errors} missing keys.`);
	process.exit(1);
}
