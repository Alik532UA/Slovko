import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "src/lib/data");
const translationsDir = path.join(dataDir, "translations");
const levelsDir = path.join(dataDir, "words/levels");

const languages = ["uk", "en", "nl", "crh"];
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

async function migrate() {
	console.log("Starting migration...");

	// 1. Read levels
	const levelWords = {}; // level -> Set of words
	for (const level of levels) {
		const levelPath = path.join(levelsDir, `${level}.json`);
		console.log(`Reading level: ${levelPath}`);
		const content = await fs.readFile(levelPath, "utf-8");
		const json = JSON.parse(content);
		levelWords[level] = new Set(json.words);
	}

	// 2. Process languages
	for (const lang of languages) {
		const filePath = path.join(translationsDir, `${lang}.json`);
		console.log(`Processing language: ${lang} from ${filePath}`);

		try {
			await fs.access(filePath);
		} catch {
			console.warn(`File ${filePath} not found, skipping.`);
			continue;
		}

		const content = await fs.readFile(filePath, "utf-8");
		const translations = JSON.parse(content);

		// Create directory
		const newDir = path.join(translationsDir, lang);
		await fs.mkdir(newDir, { recursive: true });

		const distributed = {};
		levels.forEach((l) => (distributed[l] = {}));
		distributed["common"] = {};

		for (const [key, value] of Object.entries(translations)) {
			let found = false;
			for (const level of levels) {
				if (levelWords[level].has(key)) {
					distributed[level][key] = value;
					found = true;
					break;
				}
			}
			if (!found) {
				distributed["common"][key] = value;
			}
		}

		// Write new files
		for (const [name, data] of Object.entries(distributed)) {
			await fs.writeFile(
				path.join(newDir, `${name}.json`),
				JSON.stringify(data, null, 4),
				"utf-8",
			);
		}

		console.log(`Migrated ${lang}`);
	}

	// 3. Delete old files
	for (const lang of languages) {
		const filePath = path.join(translationsDir, `${lang}.json`);
		console.log(`Deleting old file: ${filePath}`);
		await fs.unlink(filePath);
	}
	console.log("Migration complete.");
}

migrate().catch(console.error);
