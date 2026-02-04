import fs from "fs";
import path from "path";
import { glob } from "glob";

const DATA_DIR = "src/lib/data/translations";
const OUTPUT_FILE = "all_translation_maps.json";

// We focus on UK and EN for identification
const LANGS = ["uk", "en"];

async function buildMap() {
	const map = { uk: {}, en: {} };

	for (const lang of LANGS) {
		const files = await glob(`${DATA_DIR}/${lang}/**/*.json`);

		for (const file of files) {
			try {
				const content = JSON.parse(fs.readFileSync(file, "utf8"));
				for (const [key, val] of Object.entries(content)) {
					const normalizedVal = val.toLowerCase().trim();
					if (!map[lang][normalizedVal]) {
						map[lang][normalizedVal] = [];
					}
					if (!map[lang][normalizedVal].includes(key)) {
						map[lang][normalizedVal].push(key);
					}
				}
			} catch (e) {
				console.error(`Error reading ${file}:`, e);
			}
		}
	}

	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(map, null, 2));
	console.log(`Map written to ${OUTPUT_FILE}`);
}

buildMap();
