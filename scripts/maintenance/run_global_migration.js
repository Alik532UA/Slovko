import fs from 'fs';
import path from 'path';

const mapping = JSON.parse(fs.readFileSync('polysemy_migration.json', 'utf8'));

const directories = [
    'src/lib/data/words/levels',
    'src/lib/data/words/topics',
    'src/lib/data/translations',
    'src/lib/data/transcriptions',
    'src/lib/data/phrases/levels'
];

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        console.error(`Error parsing ${filePath}:`, e);
        return;
    }

    let modified = false;

    if (Array.isArray(data)) {
        // Handle arrays (like in some phrases or topics)
        const newData = data.map(item => {
            if (typeof item === 'string' && mapping[item]) {
                modified = true;
                return mapping[item];
            }
            return item;
        });
        if (modified) data = newData;
    } else if (typeof data === 'object' && data !== null) {
        // Handle objects
        if (data.words && Array.isArray(data.words)) {
            // Level files: { "words": [...] }
            data.words = data.words.map(w => {
                if (mapping[w]) {
                    modified = true;
                    return mapping[w];
                }
                return w;
            });
        } else {
            // Translation/Transcription files: { "key": "value" }
            const newData = {};
            for (const [key, value] of Object.entries(data)) {
                const newKey = mapping[key] || key;
                if (newKey !== key) modified = true;
                newData[newKey] = value;
            }
            data = newData;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        console.log(`Updated: ${filePath}`);
    }
}

function scanDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (item.endsWith('.json')) {
            processFile(fullPath);
        }
    }
}

console.log('Starting global migration...');
directories.forEach(dir => {
    if (fs.existsSync(dir)) {
        scanDir(dir);
    }
});
console.log('Migration complete.');