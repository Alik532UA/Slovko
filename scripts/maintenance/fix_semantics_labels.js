import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const SEMANTICS_PATH = path.join(PROJECT_ROOT, 'src/lib/data/semantics.ts');
const TRANSLATIONS_DIR = path.join(PROJECT_ROOT, 'src/lib/data/translations');

function stripBOM(content) {
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    return content;
}

// 1. Load Semantics TS (Regex parse)
const semanticsContent = fs.readFileSync(SEMANTICS_PATH, 'utf-8');
// Find all "specific: ["..."]"
const regex = /specific:\s*\[(.*?)\]/g;
let match;
const allSpecificKeys = new Set();
const keyToBase = {};

while ((match = regex.exec(semanticsContent)) !== null) {
    const keys = match[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
    keys.forEach(k => {
        if(k) allSpecificKeys.add(k);
        // Try to find base... actually we just need suffix for label
    });
}

// 2. Process each language
const languages = fs.readdirSync(TRANSLATIONS_DIR).filter(f => fs.statSync(path.join(TRANSLATIONS_DIR, f)).isDirectory());

languages.forEach(lang => {
    const enSemanticsPath = path.join(TRANSLATIONS_DIR, lang, 'semantics.json');
    if (!fs.existsSync(enSemanticsPath)) {
        fs.writeFileSync(enSemanticsPath, JSON.stringify({ labels: {} }, null, '\t'));
    }

    const enSemanticsRaw = fs.readFileSync(enSemanticsPath, 'utf-8');
    const enSemantics = JSON.parse(stripBOM(enSemanticsRaw));

    let updated = false;

    allSpecificKeys.forEach(key => {
        if (!enSemantics.labels[key]) {
            // Generate label
            const parts = key.split('_');
            if (parts.length > 1) {
                 const suffix = parts.slice(1).join(' ');
                 enSemantics.labels[key] = suffix.replace(/_/g, ' '); 
                 updated = true;
            }
        }
    });

    if (updated) {
        fs.writeFileSync(enSemanticsPath, JSON.stringify(enSemantics, null, '\t'));
        console.log(`Updated semantics.json for ${lang}`);
    }
});
