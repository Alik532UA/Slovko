import fs from "fs";

const ANALYSIS_FILE = "a2_analysis.json";
const LEVEL_FILE = "src/lib/data/words/levels/A2.json";

const analysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, "utf8"));
const levelData = JSON.parse(fs.readFileSync(LEVEL_FILE, "utf8"));
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
// We assume the existing candidate is good enough for A2 level if it matches English.
analysis.missing.forEach((item) => {
	if (item.candidates && item.candidates.length > 0) {
		// Pick the first one.
		// Improvement: Pick the one that is NOT word_X if possible?
		// But our candidates are usually semantic now.
		const key = item.candidates[0];
		if (!levelWords.has(key)) {
			levelWords.add(key);
			levelData.words.push(key);
			addedCount++;
		}
	}
});

fs.writeFileSync(LEVEL_FILE, JSON.stringify(levelData, null, 4));
console.log(`Added ${addedCount} existing keys to A2.`);
