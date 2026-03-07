import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const TRANSLATIONS_DIR = path.join(PROJECT_ROOT, 'src/lib/data/translations/en/levels');
const SEMANTICS_PATH = path.join(PROJECT_ROOT, 'src/lib/data/semantics.ts');

function stripBOM(content) {
    return content.replace(/^\uFEFF/, '').trim();
}

console.log('🏗️ Reconstructing semantics.ts from translations...');

const files = fs.readdirSync(TRANSLATIONS_DIR).filter(f => f.endsWith('.json'));
const concepts = {}; // base -> Set of specific keys

files.forEach(file => {
    const content = JSON.parse(stripBOM(fs.readFileSync(path.join(TRANSLATIONS_DIR, file), 'utf-8')));
    Object.keys(content).forEach(key => {
        if (key.includes('_')) {
            // Heuristic: everything before the FIRST underscore is the base
            // (Works for most cases in Slovko like affair_matter, bank_river)
            const parts = key.split('_');
            const base = parts[0];
            
            // Check if base word itself exists in translations (as a core word)
            // Or if there are multiple keys with this prefix
            if (!concepts[base]) concepts[base] = new Set();
            concepts[base].add(key);
        }
    });
});

// Filter out singletons that are likely phrasal verbs (unless base word exists)
// Actually, better to keep all that were split.
const validGroups = {};
Object.keys(concepts).forEach(base => {
    const keys = Array.from(concepts[base]);
    if (keys.length > 1) {
        validGroups[base] = keys.sort();
    }
});

// Build the file
let entries = "";
Object.keys(validGroups).sort().forEach(base => {
    const specific = validGroups[base].map(k => `"${k}"`).join(', ');
    entries += `\t${base}: {\n\t\tbase: "${base}",\n\t\tspecific: [${specific}]\n\t},\n`;
});

const header = `import type { SemanticGroup } from "./types";\n\n/**\n * Центральний реєстр семантичних зв'язків (Schema).\n * Визначає, які специфічні ключі відносяться до яких базових понять.\n */\nexport const semanticHierarchy: Record<string, SemanticGroup> = {\n`;
const footer = `};\n\n/**\n * Отримує базовий ключ для специфічного ключа.\n */\nexport function getBaseKey(specificKey: string): string | null {\n\tfor (const key in semanticHierarchy) {\n\t\tconst group = semanticHierarchy[key];\n\t\tif (group.specific.includes(specificKey)) {\n\t\t\treturn group.base;\n\t\t}\n\t}\n\treturn null;\n}\n\n/**\n * Отримує групу за базовим ключем.\n */\nexport function getSemanticGroup(baseKey: string): SemanticGroup | null {\n\treturn semanticHierarchy[baseKey] || null;\n}\n`;

fs.writeFileSync(SEMANTICS_PATH, header + entries + footer);

console.log(`✅ Reconstructed semantics.ts with ${Object.keys(validGroups).length} unique concepts.`);
