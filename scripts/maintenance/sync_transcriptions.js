import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const SEMANTICS_PATH = path.join(PROJECT_ROOT, 'src/lib/data/semantics.ts');
const TRANSCRIPTIONS_DIR = path.join(PROJECT_ROOT, 'src/lib/data/transcriptions/en/levels');

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

// 2. Load all transcriptions
const files = fs.readdirSync(TRANSCRIPTIONS_DIR).filter(f => f.endsWith('.json'));
const fileContents = {};
const allIPA = {};

files.forEach(file => {
    const filePath = path.join(TRANSCRIPTIONS_DIR, file);
    const content = JSON.parse(stripBOM(fs.readFileSync(filePath, 'utf-8')));
    fileContents[filePath] = content;
    Object.assign(allIPA, content);
});

let updated = false;

semanticGroups.forEach(group => {
    const baseIPA = allIPA[group.base];
    if (!baseIPA) return;

    group.specific.forEach(specKey => {
        if (!allIPA[specKey]) {
            // Missing IPA! Find where base is and add specKey nearby
            let targetFile = null;
            for (const [fPath, content] of Object.entries(fileContents)) {
                if (content[group.base]) {
                    targetFile = fPath;
                    break;
                }
            }

            if (!targetFile) targetFile = path.join(TRANSCRIPTIONS_DIR, files[0]);

            fileContents[targetFile][specKey] = baseIPA;
            allIPA[specKey] = baseIPA;
            updated = true;
            console.log(`Added IPA for ${specKey}: ${baseIPA}`);
        }
    });
});

if (updated) {
    for (const [fPath, content] of Object.entries(fileContents)) {
        fs.writeFileSync(fPath, JSON.stringify(content, null, '\t'), 'utf-8');
    }
    console.log("Transcriptions synced.");
}
