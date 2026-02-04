import fs from "fs";
import path from "path";

const baseDir = "src/lib/data/translations";
const languages = ["uk", "crh", "nl", "de"];
const report = [];

function scanDir(dir, lang) {
	const items = fs.readdirSync(dir);
	for (const item of items) {
		const fullPath = path.join(dir, item);
		if (fs.statSync(fullPath).isDirectory()) {
			scanDir(fullPath, lang);
		} else if (item.endsWith(".json")) {
			const content = JSON.parse(fs.readFileSync(fullPath, "utf8"));

			// Завантажуємо англійський відповідник для порівняння
			let enContent = {};
			const enPath = fullPath.replace(
				path.join(baseDir, lang),
				path.join(baseDir, "en"),
			);
			if (fs.existsSync(enPath)) {
				enContent = JSON.parse(fs.readFileSync(enPath, "utf8"));
			}

			for (const [key, value] of Object.entries(content)) {
				const issues = [];
				const enValue = enContent[key];

				// Пропускаємо технічні ключі
				if (key === "id" || key === "version") continue;

				// 1. Перевірка на несемантичні ключі (числові суфікси)
				if (key.match(/_\d+$/)) {
					issues.push("Non-semantic key (numeric suffix)");
				}

				// 2. Справжня перевірка на відсутній переклад (збігається з англійським значенням)
				if (lang !== "en" && enValue && value === enValue) {
					// Виключення для слів, які однакові в багатьох мовах (міжнародні запозичення)
					const exceptions = [
						"Wi-Fi",
						"OK",
						"SMS",
						"Taxi",
						"Hotel",
						"Radio",
						"Pizza",
						"Pasta",
						"Sushi",
						"Logo",
						"Blog",
						"Email",
						"Internet",
						"Bank",
						"Park",
						"Metal",
						"Million",
						"Model",
						"Opera",
						"Pilot",
						"Plan",
						"Sport",
						"Supermarket",
						"Tennis",
						"Video",
						"Terminal",
						"Agent",
						"Drama",
						"Alibi",
						"Zebra",
						"Panda",
						"Koala",
						"Server",
						"Virus",
						"Router",
						"Modem",
						"USB",
						"Disk",
						"Festival",
						"Normal",
					];

					const isException = exceptions.some(
						(ex) => value.toLowerCase() === ex.toLowerCase(),
					);

					if (!isException) {
						issues.push("Missing translation (matches English value)");
					}
				}

				// 3. Перевірка на рівність ключу (якщо ключ — це англійське слово)
				if (lang !== "en" && key === value && !key.includes("_")) {
					// Тільки якщо ми ще не додали помилку про збіг з англійським значенням
					if (!issues.includes("Missing translation (matches English value)")) {
						issues.push("Potential missing translation (value equals key)");
					}
				}

				if (issues.length > 0) {
					report.push({
						file: fullPath,
						lang: lang,
						key: key,
						value: value,
						enValue: enValue,
						issues: issues,
					});
				}
			}
		}
	}
}

languages.forEach((lang) => {
	const langDir = path.join(baseDir, lang);
	if (fs.existsSync(langDir)) {
		scanDir(langDir, lang);
	}
});

fs.writeFileSync(
	"translation_issues_report.json",
	JSON.stringify(report, null, 2),
);
console.log(`Analysis complete. Found ${report.length} issues.`);
