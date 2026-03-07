import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const SEMANTICS_PATH = path.join(PROJECT_ROOT, 'src/lib/data/semantics.ts');

console.log('🧹 Robust cleanup of semantics.ts...');

const content = fs.readFileSync(SEMANTICS_PATH, 'utf-8');

// Use a more inclusive regex to capture the blocks even with weird whitespace
const groupRegex = /(\w+):\s*{\s*base:\s*"(\w+)",\s*specific:\s*\[([\s\S]*?)\]\s*}/g;

const groups = {}; // base -> Set of specific keys
let match;

while ((match = groupRegex.exec(content)) !== null) {
    const base = match[2];
    const specificStr = match[3];
    const specificKeys = specificStr.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);

    if (!groups[base]) {
        groups[base] = new Set();
    }
    specificKeys.forEach(k => groups[base].add(k));
}

const sortedBases = Object.keys(groups).sort();
console.log(`Found ${sortedBases.length} unique concepts.`);

// Reconstruct file
let entries = "";
sortedBases.forEach(base => {
    const specific = Array.from(groups[base]).sort();
    const specList = specific.map(k => `"${k}"`).join(', ');
    entries += `\t${base}: {\n\t\tbase: "${base}",\n\t\tspecific: [${specList}]\n\t},\n`;
});

const header = `import type { SemanticGroup } from "./types";\n\n/**\n * Центральний реєстр семантичних зв'язків (Schema).\n * Визначає, які специфічні ключі відносяться до яких базових понять.\n */\nexport const semanticHierarchy: Record<string, SemanticGroup> = {\n`;
const footer = `};\n\n/**\n * Отримує базовий ключ для специфічного ключа.\n */\nexport function getBaseKey(specificKey: string): string | null {\n\tfor (const key in semanticHierarchy) {\n\t\tconst group = semanticHierarchy[key];\n\t\tif (group.specific.includes(specificKey)) {\n\t\t\treturn group.base;\n\t\t}\n\t}\n\treturn null;\n}\n\n/**\n * Отримує групу за базовим ключем.\n */\nexport function getSemanticGroup(baseKey: string): SemanticGroup | null {\n\treturn semanticHierarchy[baseKey] || null;\n}\n`;

fs.writeFileSync(SEMANTICS_PATH, header + entries + footer);
console.log("✅ Done.");
