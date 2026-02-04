import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
if (args.length < 2) {
	console.error(
		"Usage: node scripts/analyze_words.js <txtFile> <level> [outFile]",
	);
	process.exit(1);
}

const [txtFile, level, outFile] = args;
const levelFile = `src/lib/data/words/levels/${level}.json`;
const mapsFile = "all_translation_maps.json";

if (!fs.existsSync(levelFile)) {
	console.error(`Level file not found: ${levelFile}`);
	process.exit(1);
}

const levelData = JSON.parse(fs.readFileSync(levelFile, "utf8"));
const levelWords = new Set(levelData.words);

const maps = JSON.parse(fs.readFileSync(mapsFile, "utf8"));

const txtContent = fs.readFileSync(txtFile, "utf8");
const lines = txtContent
	.split(/\r?\n/)
	.filter((l) => l.trim() && !l.trim().startsWith("//"));

const missing = [];
const addToLevel = [];

function getParts(str) {
	if (!str) return [];
	return str
		.toLowerCase()
		.split(/[\/;()]/)
		.map((s) => s.trim())
		.filter((s) => s);
}

const keyToTrans = { uk: {}, en: {} };

for (const [val, keys] of Object.entries(maps.uk)) {
	keys.forEach((k) => {
		keyToTrans.uk[k] = val;
	});
}
for (const [val, keys] of Object.entries(maps.en)) {
	keys.forEach((k) => {
		keyToTrans.en[k] = val;
	});
}

lines.forEach((line) => {
	const parts = line.split(";");
	if (parts.length < 2) return;
	const enRaw = parts[0].trim();
	const ukRaw = parts[1].trim();

	const enParts = getParts(enRaw);
	const ukParts = getParts(ukRaw);

	let foundKey = null;
	let matchType = "none";

	// 1. Find candidates by English
	const candidates = new Set();
	enParts.forEach((p) => {
		if (maps.en[p]) maps.en[p].forEach((k) => candidates.add(k));
	});

	// 2. Verify with Ukrainian
	for (const key of candidates) {
		const ukVal = keyToTrans.uk[key];
		if (!ukVal) continue;
		const currentUkParts = getParts(ukVal);
		const hasMatch = ukParts.some((up) => currentUkParts.includes(up));

		if (hasMatch) {
			foundKey = key;
			matchType = "strict";
			break;
		}
	}

	if (!foundKey) {
		if (candidates.size > 0) {
			matchType = "polysemy_candidate";
		}
	}

	if (foundKey) {
		if (levelWords.has(foundKey)) {
			// Exists in level
		} else {
			addToLevel.push({ key: foundKey, en: enRaw, uk: ukRaw });
		}
	} else {
		missing.push({
			en: enRaw,
			uk: ukRaw,
			type: matchType,
			candidates: Array.from(candidates),
		});
	}
});

const output = JSON.stringify({ missing, addToLevel }, null, 2);
if (outFile) {
	fs.writeFileSync(outFile, output);
	console.log(`Analysis written to ${outFile}`);
} else {
	console.log(output);
}
