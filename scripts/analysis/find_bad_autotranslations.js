import fs from 'fs';
import path from 'path';

const baseDir = 'src/lib/data/translations';
const targetLangs = ['nl', 'de'];
const report = [];

function checkFile(filePath, lang) {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const enPath = filePath.replace(path.join(baseDir, lang), path.join(baseDir, 'en'));
    if (!fs.existsSync(enPath)) return;
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));

    for (const [key, value] of Object.entries(content)) {
        const enValue = enContent[key];
        if (!enValue) continue;

        // Критерії підозрілого перекладу:
        // 1. Наявність технічних знаків %s або {}
        // 2. Довжина перекладу в 3 рази більша за оригінал (для коротких слів)
        // 3. Переклад містить більше 3 слів, хоча оригінал — одне
        const isTooLong = value.length > enValue.length * 3 && value.length > 10;
        const hasPlaceholders = /%s|\{|\}|%d/.test(value);
        const manyWords = value.split(' ').length > 3 && enValue.split(' ').length === 1;

        if (isTooLong || hasPlaceholders || manyWords) {
            report.push({
                file: filePath,
                lang: lang,
                key: key,
                en: enValue,
                bad: value,
                reason: isTooLong ? 'Too long' : (hasPlaceholders ? 'Placeholders' : 'Too many words')
            });
        }
    }
}

function scan(dir, lang) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            scan(fullPath, lang);
        } else if (item.endsWith('.json')) {
            checkFile(fullPath, lang);
        }
    }
}

targetLangs.forEach(lang => {
    const langDir = path.join(baseDir, lang);
    if (fs.existsSync(langDir)) scan(langDir, lang);
});

console.log(JSON.stringify(report, null, 2));
