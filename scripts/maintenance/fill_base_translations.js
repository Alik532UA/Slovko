import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const SEMANTICS_PATH = path.join(PROJECT_ROOT, 'src/lib/data/semantics.ts');
const TRANSLATIONS_DIR = path.join(PROJECT_ROOT, 'src/lib/data/translations');

function stripBOM(content) {
    return content.replace(/^\uFEFF/, '').trim();
}

// 1. Get all semantic groups
const semanticsContent = fs.readFileSync(SEMANTICS_PATH, 'utf-8');
const regex = /(\w+):\s*{\s*base:\s*"(\w+)",\s*specific:\s*\[([\s\S]*?)\]/g;
const semanticGroups = [];
let match;

while ((match = regex.exec(semanticsContent)) !== null) {
    const base = match[2];
    const specific = match[3].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    semanticGroups.push({ base, specific });
}

console.log(`Found ${semanticGroups.length} semantic groups.`);

// 2. Process each language
const languages = fs.readdirSync(TRANSLATIONS_DIR).filter(f => fs.statSync(path.join(TRANSLATIONS_DIR, f)).isDirectory());

languages.forEach(lang => {
    const langDir = path.join(TRANSLATIONS_DIR, lang, 'levels');
    if (!fs.existsSync(langDir)) return;

    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    const fileContents = {}; // path -> content
    const allTranslations = {};

    files.forEach(file => {
        const filePath = path.join(langDir, file);
        const content = JSON.parse(stripBOM(fs.readFileSync(filePath, 'utf-8')));
        fileContents[filePath] = content;
        Object.assign(allTranslations, content);
    });

    let updated = false;

    semanticGroups.forEach(group => {
        if (!allTranslations[group.base]) {
            // Find a translation from specific keys GLOBAL map
            let fallbackTranslation = null;

            for (const specKey of group.specific) {
                if (allTranslations[specKey]) {
                    fallbackTranslation = allTranslations[specKey];
                    break;
                }
            }

            if (fallbackTranslation) {
                // Find which file to put it in. 
                // Prefer 'general' file of the level where base word is expected, 
                // but for simplicity, we'll put it in the first file we find that belongs to any level
                // or just the first file in the list.
                const generalFile = files.find(f => f.includes('general')) || files[0];
                const targetFilePath = path.join(langDir, generalFile);
                
                fileContents[targetFilePath][group.base] = fallbackTranslation;
                allTranslations[group.base] = fallbackTranslation;
                updated = true;
            }
        }
    });

    if (updated) {
        for (const [fPath, content] of Object.entries(fileContents)) {
            fs.writeFileSync(fPath, JSON.stringify(content, null, '\t'), 'utf-8');
        }
        console.log(`[${lang}] Updated base translations.`);
    }
});

console.log("Migration Complete.");
