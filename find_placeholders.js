import fs from 'fs';
import path from 'path';

const baseDir = 'src/lib/data/translations';
const languages = fs.readdirSync(baseDir).filter(l => l !== 'en');

languages.forEach(lang => {
    const langDir = path.join(baseDir, lang, 'levels');
    if (!fs.existsSync(langDir)) return;

    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));

    files.forEach(file => {
        const filePath = path.join(langDir, file);
        let rawContent = fs.readFileSync(filePath, 'utf-8');
        if (rawContent.charCodeAt(0) === 0xFEFF) {
            rawContent = rawContent.slice(1);
        }
        if (rawContent.trim() === '') return;
        const content = JSON.parse(rawContent);
        
        for (const [key, value] of Object.entries(content)) {
            if (key === value && key.length > 1) { // ignore single letters maybe?
                console.log(`${lang}/${file}: ${key} -> ${value}`);
            }
        }
    });
});
