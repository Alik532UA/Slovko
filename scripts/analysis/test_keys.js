import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const getAllKeys = () => {
	const keys = new Set();
	const walk = (dir) => {
		const files = fs.readdirSync(dir);
		files.forEach((file) => {
			const p = path.join(dir, file);
			if (fs.statSync(p).isDirectory()) {
				walk(p);
			} else if (file.endsWith(".json")) {
				const data = JSON.parse(fs.readFileSync(p, "utf-8"));
				if (data.words) {
					data.words.forEach((w) => keys.add(w.toLowerCase()));
				}
			}
		});
	};
	walk(path.join(ROOT, "src/lib/data/words"));
	return keys;
};

const keys = getAllKeys();
console.log("Has 'mean'?", keys.has("mean"));
console.log("Has 'fix'?", keys.has("fix"));
console.log("Total keys:", keys.size);
