import fs from "fs";
import path from "path";

const baseDir = "src/lib/data/translations";
const languages = ["en", "uk", "el", "nl", "de", "crh", "pl"];
const translationMap = {}; // key -> { lang -> value }

function scanDir(dir, lang) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath, lang);
        } else if (item.endsWith(".json") && !item.includes("semantics.json") && !item.includes("tenses")) {
            try {
                const content = JSON.parse(fs.readFileSync(fullPath, "utf8"));
                for (const [key, value] of Object.entries(content)) {
                    if (key === "id" || key === "version") continue;
                    if (!translationMap[key]) translationMap[key] = {};
                    translationMap[key][lang] = value;
                }
            } catch (e) {
                console.error(`Error parsing ${fullPath}: ${e.message}`);
            }
        }
    }
}

console.log("Збір перекладів для всіх мов...");
languages.forEach(lang => {
    scanDir(path.join(baseDir, lang), lang);
});

const report = [];

console.log("Аналіз на неузгодженість...");
for (const [key, translations] of Object.entries(translationMap)) {
    const issues = [];
    
    // 1. Порушення правила суфікса
    if (key.includes("_")) {
        const suffix = key.split("_").pop();
        for (const [lang, value] of Object.entries(translations)) {
            if (lang === "en") continue;
            // Перевірка чи переклад містить контекст (напр. "апельсин (фрукт)")
            if (value.includes("(") || value.includes("（")) {
                issues.push(`[${lang}] Порушення правила суфікса: містить пояснення в дужках.`);
            }
        }
    }

    // 2. Семантична неузгодженість (Bridge Shadow)
    // Шукаємо ключі без суфіксів, які в різних мовах мають занадто різні за змістом переклади
    // Це складно автоматизувати на 100%, але ми можемо помітити "фразіологічність"
    const values = Object.values(translations);
    const hasLongTranslation = values.some(v => v.split(" ").length > 3);
    const hasShortTranslation = values.some(v => v.split(" ").length === 1);
    
    if (hasLongTranslation && hasShortTranslation && !key.includes("_")) {
        issues.push("Семантичний розрив: частина мов переклала одним словом, частина - цілою фразою.");
    }

    // 3. Відсутність у Any-to-Any системі
    const missingLangs = languages.filter(l => !translations[l]);
    if (missingLangs.length > 0) {
         issues.push(`Відсутні переклади: ${missingLangs.join(", ")}`);
    }

    if (issues.length > 0) {
        report.push({ key, translations, issues });
    }
}

let mdOutput = "# 📊 Звіт про повну неузгодженість перекладів\n\n";
mdOutput += `Аналіз проведено для мов: **${languages.join(", ")}**\n`;
mdOutput += `Дата: ${new Date().toISOString().split("T")[0]}\n\n`;

if (report.length === 0) {
    mdOutput += "✅ Усі переклади узгоджені.\n";
} else {
    // Динамічна шапка таблиці для всіх мов
    mdOutput += "| Ключ | Проблеми | " + languages.map(l => l.toUpperCase()).join(" | ") + " |\n";
    mdOutput += "| :--- | :--- | " + languages.map(() => ":---").join(" | ") + " |\n";
    
    report.forEach(item => {
        const issuesStr = item.issues.join("<br>");
        const langValues = languages.map(l => item.translations[l] || "❌").join(" | ");
        mdOutput += `| \`${item.key}\` | ${issuesStr} | ${langValues} |\n`;
    });
}

fs.writeFileSync("cross_language_full_audit.md", mdOutput);
console.log(`Готово! Знайдено ${report.length} потенційних проблем. Звіт: cross_language_full_audit.md`);
