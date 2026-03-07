import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const SEMANTICS_PATH = path.join(PROJECT_ROOT, 'src/lib/data/semantics.ts');
const TRANSLATIONS_DIR = path.join(PROJECT_ROOT, 'src/lib/data/translations');

function stripBOM(content) {
    // Видалити BOM та будь-які невидимі символи на початку рядка
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

console.log(`Found ${semanticGroups.length} semantic groups in semantics.ts`);

// 2. Process each language
const languages = fs.readdirSync(TRANSLATIONS_DIR).filter(f => fs.statSync(path.join(TRANSLATIONS_DIR, f)).isDirectory());

languages.forEach(lang => {
    console.log(`Processing language: ${lang}`);
    const langDir = path.join(TRANSLATIONS_DIR, lang, 'levels');
    if (!fs.existsSync(langDir)) return;

    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    // Load all translations for this language into one map for easy lookup
    const allTranslations = {};
    const fileContents = {}; // path -> content

    files.forEach(file => {
        const filePath = path.join(langDir, file);
        const content = JSON.parse(stripBOM(fs.readFileSync(filePath, 'utf-8')));
        fileContents[filePath] = content;
        Object.assign(allTranslations, content);
    });

    let langUpdated = false;

    // Check each group
    semanticGroups.forEach(group => {
        const baseTranslation = allTranslations[group.base];
        if (!baseTranslation) return; // If base is not in this language yet, skip

        group.specific.forEach(specKey => {
            if (!allTranslations[specKey]) {
                // MISSING! Add it to the same file where base exists, or to the first general file
                console.log(`[${lang}] Missing specific key: ${specKey}. Defaulting to: ${baseTranslation}`);
                
                // Find which file contains the base key
                let targetFilePath = null;
                for (const [fPath, content] of Object.entries(fileContents)) {
                    if (content[group.base]) {
                        targetFilePath = fPath;
                        break;
                    }
                }

                // If base not found in files (unlikely but possible if it's in another level), use general
                if (!targetFilePath) {
                    const generalFile = files.find(f => f.includes('general')) || files[0];
                    targetFilePath = path.join(langDir, generalFile);
                }

                fileContents[targetFilePath][specKey] = baseTranslation;
                allTranslations[specKey] = baseTranslation; // Update map too
                langUpdated = true;
            }
        });
    });

    if (langUpdated) {
        // Save files
        for (const [fPath, content] of Object.entries(fileContents)) {
            fs.writeFileSync(fPath, JSON.stringify(content, null, '\t'), 'utf-8');
        }
        console.log(`[${lang}] Updated translations.`);
    }
});

console.log("Sync Complete.");
