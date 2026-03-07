import fs from "fs";
import path from "path";

const baseDir = "src/lib/data/translations";
const languages = ["en", "uk", "el", "nl", "de", "crh", "pl"];

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (item.endsWith(".json")) {
            const content = JSON.parse(fs.readFileSync(fullPath, "utf8"));
            let changed = false;
            for (const [key, value] of Object.entries(content)) {
                if (typeof value === "string" && (value.includes("(") || value.includes("（"))) {
                    // Видаляємо дужки та текст всередині них
                    // Також прибираємо зайві пробіли, що могли залишитися
                    const newValue = value.replace(/\s*[\(（][^\)）]*[\)）]/g, "").trim();
                    if (newValue !== value && newValue.length > 0) {
                        content[key] = newValue;
                        changed = true;
                    }
                }
            }
            if (changed) {
                fs.writeFileSync(fullPath, JSON.stringify(content, null, "\t"), "utf8");
                console.log(`Cleaned parentheses in ${fullPath}`);
            }
        }
    }
}

languages.forEach(lang => {
    scanDir(path.join(baseDir, lang));
});
