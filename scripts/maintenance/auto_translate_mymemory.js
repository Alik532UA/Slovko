import fs from "fs";
import path from "path";

async function translate(text, from, to) {
	if (text.length === 0) return text;
	try {
		const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
		const response = await fetch(url);
		const data = await response.json();
		if (data.responseData && data.responseData.translatedText) {
			return data.responseData.translatedText;
		}
	} catch (e) {
		console.error(`Translation failed for ${text}:`, e);
	}
	return text;
}

async function processFile(filePath, lang) {
	console.log(`Processing ${filePath}...`);
	let data = JSON.parse(fs.readFileSync(filePath, "utf8"));
	let changed = false;

	const keysToTranslate = Object.keys(data).filter((key) => {
		const value = data[key];
		const baseKey = key.split("_")[0];
		// Translate if value equals key, is English text, or is empty
		return (
			value.toLowerCase() === baseKey.toLowerCase() ||
			value === "" ||
			value === key
		);
	});

	console.log(`Found ${keysToTranslate.length} keys to translate in ${lang}`);

	// Process in small batches to avoid rate limits
	for (let i = 0; i < keysToTranslate.length; i++) {
		const key = keysToTranslate[i];
		const textToTranslate = key.split("_")[0];
		const translated = await translate(textToTranslate, "en", lang);

		if (
			translated &&
			translated.toLowerCase() !== textToTranslate.toLowerCase()
		) {
			data[key] = translated;
			changed = true;
		}

		// Delay to respect API limits (MyMemory is ~1000 words/day free)
		if (i % 5 === 0) await new Promise((r) => setTimeout(r, 1000));

		if (i > 0 && i % 20 === 0) {
			console.log(`Progress: ${i}/${keysToTranslate.length}`);
			// Save partially to not lose progress
			fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
		}

		// Stop if we hit a lot of errors or just to keep batches manageable
		if (i >= 50) {
			console.log(
				"Stopping at 50 translations per file to respect API limits.",
			);
			break;
		}
	}

	if (changed) {
		fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
	}
}

const targetLangs = ["uk", "de", "nl", "crh"];
const baseDir = "src/lib/data/translations";

async function run() {
	for (const lang of targetLangs) {
		const langDir = path.join(baseDir, lang, "levels");
		if (!fs.existsSync(langDir)) continue;

		const files = fs.readdirSync(langDir).filter((f) => f.endsWith(".json"));
		for (const file of files) {
			await processFile(path.join(langDir, file), lang);
		}
	}
}

run();
