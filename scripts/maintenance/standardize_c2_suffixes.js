import fs from "fs";
import path from "path";

const mapping = {
    "_artuv": "_growth",
    "_buyv": "_buildup",
    "_inat": "_stubborn",
    "_qatt": "_firm",
    "_auv": "_bitterness",
    "_yamanlq": "_malice",
    "_alamaq": "_understand",
    "_yaqalamaq": "_arrest"
};

const dirs = [
    "src/lib/data/words/levels",
    "src/lib/data/translations"
];

const semanticsFile = "src/lib/data/semantics.ts";

function processFile(filePath) {
    let content = fs.readFileSync(filePath, "utf8");
    let changed = false;
    for (const [oldSuffix, newSuffix] of Object.entries(mapping)) {
        if (content.includes(oldSuffix)) {
            // Використовуємо регулярний вираз для точної заміни суфіксів у ключах
            const regex = new RegExp(oldSuffix + '(?=["\\s,:])', "g");
            content = content.replace(regex, newSuffix);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`Updated suffixes in ${filePath}`);
    }
}

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (item.endsWith(".json") || item.endsWith(".ts")) {
            processFile(fullPath);
        }
    }
}

dirs.forEach(dir => scanDir(dir));
if (fs.existsSync(semanticsFile)) processFile(semanticsFile);
