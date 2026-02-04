import fs from "fs";

const args = process.argv.slice(2);
if (args.length < 2) {
	console.error(
		"Usage: node scripts/process_append.js <analysisFile> <levelName>",
	);
	process.exit(1);
}

const [analysisFile, levelName] = args;
const levelFile = `src/lib/data/words/levels/${levelName}.json`;

if (!fs.existsSync(analysisFile)) {
	console.error(`Analysis file not found: ${analysisFile}`);
	process.exit(1);
}
if (!fs.existsSync(levelFile)) {
	console.error(`Level file not found: ${levelFile}`);
	process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(analysisFile, "utf8"));
const levelData = JSON.parse(fs.readFileSync(levelFile, "utf8"));
const levelWords = new Set(levelData.words);

let addedCount = 0;

// 1. Add from addToLevel
analysis.addToLevel.forEach((item) => {
	if (!levelWords.has(item.key)) {
		levelWords.add(item.key);
		levelData.words.push(item.key);
		addedCount++;
	}
});

// 2. Add from missing (polysemy candidates)
// We assume the existing candidate is good enough if it matches English.
analysis.missing.forEach((item) => {
	if (item.candidates && item.candidates.length > 0) {
		const key = item.candidates[0];
		if (!levelWords.has(key)) {
			levelWords.add(key);
			levelData.words.push(key);
			addedCount++;
		}
	}
});

fs.writeFileSync(levelFile, JSON.stringify(levelData, null, 4));
console.log(`Added ${addedCount} existing keys to ${levelName}.`);
