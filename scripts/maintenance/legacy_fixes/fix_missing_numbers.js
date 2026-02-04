import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "src/lib/data");

const LEVEL = "A1";

const NEW_WORDS = [
	[
		"sixteen",
		"sixteen",
		"шістнадцять",
		"on altı",
		"sechzehn",
		" zestien",
		"ˌsɪksˈtiːn",
	],
	[
		"seventeen",
		"seventeen",
		"сімнадцять",
		"on yedi",
		"siebzehn",
		"zeventien",
		"ˌsevnˈtiːn",
	],
	[
		"eighteen",
		"eighteen",
		"вісімнадцять",
		"on sekiz",
		"achtzehn",
		"achttien",
		"ˌeɪˈtiːn",
	],
	[
		"nineteen",
		"nineteen",
		"дев'ятнадцять",
		"on doquz",
		"neunzehn",
		"negentien",
		"ˌnaɪnˈtiːn",
	],
	["sixty", "sixty", "шістдесят", "altmış", "sechzig", "zestig", "ˈsɪksti"],
	[
		"seventy",
		"seventy",
		"сімдесят",
		"yetmiş",
		"siebzig",
		"zeventig",
		"ˈsevnti",
	],
	["eighty", "eighty", "вісімдесят", "seksen", "achtzig", "tachtig", "ˈeɪti"],
	[
		"ninety",
		"ninety",
		"дев'яносто",
		"doqsan",
		"neunzig",
		"negentig",
		"ˈnaɪnti",
	],
];

function update() {
	const wordsPath = path.join(DATA_DIR, "words/levels", `${LEVEL}.json`);
	const wordsData = JSON.parse(fs.readFileSync(wordsPath, "utf-8"));
	NEW_WORDS.forEach(([key]) => {
		if (!wordsData.words.includes(key)) wordsData.words.push(key);
	});
	fs.writeFileSync(wordsPath, JSON.stringify(wordsData, null, 4));

	["en", "uk", "crh", "de", "nl"].forEach((lang, idx) => {
		const transPath = path.join(
			DATA_DIR,
			"translations",
			lang,
			"levels",
			`${LEVEL}.json`,
		);
		const transData = JSON.parse(fs.readFileSync(transPath, "utf-8"));
		NEW_WORDS.forEach(([key, ...translations]) => {
			transData[key] = translations[idx];
		});
		fs.writeFileSync(transPath, JSON.stringify(transData, null, 4));
	});

	const ipaPath = path.join(DATA_DIR, "transcriptions/levels", `${LEVEL}.json`);
	const ipaData = JSON.parse(fs.readFileSync(ipaPath, "utf-8"));
	NEW_WORDS.forEach(([key, , , , , , ipa]) => {
		ipaData[key] = ipa;
	});
	fs.writeFileSync(ipaPath, JSON.stringify(ipaData, null, 4));
}
update();
