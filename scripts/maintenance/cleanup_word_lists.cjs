const fs = require("fs");
const path = require("path");

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

levels.forEach((level) => {
	const wordsPath = path.join(
		__dirname,
		"..",
		"..",
		"src",
		"lib",
		"data",
		"words",
		"levels",
		`${level}.json`,
	);
	if (fs.existsSync(wordsPath)) {
		const wordsData = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
		const originalCount = wordsData.words.length;

		// Remove duplicates while preserving order
		const uniqueWords = [];
		const seen = new Set();

		wordsData.words.forEach((word) => {
			if (!seen.has(word)) {
				uniqueWords.push(word);
				seen.add(word);
			}
		});

		wordsData.words = uniqueWords;

		fs.writeFileSync(wordsPath, JSON.stringify(wordsData, null, 4), "utf8");
		console.log(
			`Cleaned ${level}.json: ${originalCount} -> ${uniqueWords.length} words`,
		);
	}
});
