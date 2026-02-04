import fs from "fs";
import path from "path";

// Джерело: англійські теми (еталон структури)
const sourceDir = "src/lib/data/translations/en/topics";
// Ціль: папка для визначень тем (тільки ключі)
const targetDir = "src/lib/data/words/topics";

if (!fs.existsSync(targetDir)) {
	fs.mkdirSync(targetDir, { recursive: true });
}

const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".json"));

console.log(`Знайдено ${files.length} тем для конвертації.`);

files.forEach((file) => {
	const sourcePath = path.join(sourceDir, file);
	const targetPath = path.join(targetDir, file);

	const sourceContent = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

	// Фільтруємо службові ключі
	const keys = Object.keys(sourceContent).filter(
		(key) =>
			key !== "id" &&
			key !== "name" &&
			key !== "description" &&
			key !== "version",
	);

	// Зберігаємо як масив ключів
	fs.writeFileSync(targetPath, JSON.stringify(keys, null, 4));
	console.log(`Converted ${file}: ${keys.length} words.`);
});

console.log("Конвертація завершена успішно.");
