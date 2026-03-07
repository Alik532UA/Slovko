const fs = require('fs');
const content = fs.readFileSync('src/lib/data/semantics.ts', 'utf8');

// Регулярний вираз для пошуку блоків семантики
// Має підтримувати багаторядковість та варіації в символах
const regex = /([a-zA-Z_0-9]+):\s*{\s*base:\s*\"([a-zA-Z_0-9]+)\",\s*specific:\s*\[([^\]]*)\]\s*},?/g;
const matches = [...content.matchAll(regex)];
const hierarchy = {};

matches.forEach(m => {
  const key = m[1];
  const base = m[2];
  const specific = m[3].split(',').map(s => s.trim().replace(/\"/g, '')).filter(Boolean);
  
  if (!hierarchy[key]) {
    hierarchy[key] = { base, specific: new Set() };
  }
  specific.forEach(s => hierarchy[key].specific.add(s));
});

let newContent = 'import type { SemanticGroup } from "../types";\n\n/**\n * Центральний реєстр семантичних зв\'язків (Schema).\n * Визначає, які специфічні ключі відносяться до яких базових понять.\n */\nexport const semanticHierarchy: Record<string, SemanticGroup> = {\n';

Object.keys(hierarchy).sort().forEach(key => {
  const group = hierarchy[key];
  const specificArr = [...group.specific].sort();
  newContent += `\t${key}: {\n\t\tbase: "${group.base}",\n\t\tspecific: [${specificArr.map(s => '"' + s + '"').join(', ')}]\n\t},\n`;
});

newContent += '};\n\n/**\n * Отримує базовий ключ для специфічного ключа.\n */\nexport function getBaseKey(specificKey: string): string | null {\n\tfor (const key in semanticHierarchy) {\n\t\tconst group = semanticHierarchy[key];\n\t\tif (group.specific.includes(specificKey)) {\n\t\t\treturn group.base;\n\t\t}\n\t}\n\treturn null;\n}\n\n/**\n * Отримує групу за базовим ключем.\n */\nexport function getSemanticGroup(baseKey: string): SemanticGroup | null {\n\treturn semanticHierarchy[baseKey] || null;\n}\n';

fs.writeFileSync('src/lib/data/semantics.ts', newContent);
console.log('Semantics deduplicated and sorted successfully.');
