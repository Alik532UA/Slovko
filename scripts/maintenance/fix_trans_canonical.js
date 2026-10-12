import fs from 'fs';
import path from 'path';

const semanticsPath = 'src/lib/data/semantics.ts';
const translationsRootDir = 'src/lib/data/translations';

// Читаємо semantics.ts для отримання мапінгу specific -> base
function getSpecificToBaseMap() {
    const content = fs.readFileSync(semanticsPath, 'utf8');
    const map = {};
    const regex = /(\w+):\s*{\s*base:\s*["'](\w+)["'],\s*specific:\s*\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const base = match[2];
        const specifics = match[3].split(',').map(s => s.trim().replace(/["']/g, ''));
        specifics.forEach(s => {
            map[s] = base;
        });
    }
    return map;
}

function syncTranslations() {
    console.log('--- Starting Global Translation Sync ---');
    const specificToBase = getSpecificToBaseMap();
    const langs = fs.readdirSync(translationsRootDir).filter(f => fs.statSync(path.join(translationsRootDir, f)).isDirectory());

    langs.forEach(lang => {
        const langDir = path.join(translationsRootDir, lang, 'levels');
        if (!fs.existsSync(langDir)) return;

        const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
        
        files.forEach(file => {
            const filePath = path.join(langDir, file);
            let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            let changed = false;

            // Прохід 1: Знаходимо переклади для специфічних ключів і копіюємо їх в базу
            Object.keys(data).forEach(key => {
                const base = specificToBase[key];
                if (base && !data[base]) {
                    data[base] = data[key];
                    console.log(`[${lang}/${file}] Cloned: ${key} -> ${base} ("${data[base]}")`);
                    changed = true;
                }
            });

            if (changed) {
                // Сортуємо ключі для порядку
                const sortedData = {};
                Object.keys(data).sort().forEach(k => {
                    sortedData[k] = data[k];
                });
                fs.writeFileSync(filePath, JSON.stringify(sortedData, null, '\t') + '\n');
            }
        });
    });
    console.log('--- Sync Finished ---');
}

syncTranslations();
