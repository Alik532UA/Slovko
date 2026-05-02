const fs = require('fs');
const path = require('path');

const langs = ['uk', 'el', 'de', 'nl', 'pl', 'crh'];
const stubs = {};

langs.forEach(lang => {
    const dir = path.join('src/lib/data/translations', lang, 'levels');
    if (!fs.existsSync(dir)) return;
    
    fs.readdirSync(dir).forEach(file => {
        if (!file.endsWith('.json')) return;
        const contentStr = fs.readFileSync(path.join(dir, file), 'utf8');
        const content = JSON.parse(contentStr.replace(/^\uFEFF/, ''));
        
        Object.entries(content).forEach(([key, val]) => {
            if (key.toLowerCase() === val.toLowerCase() && key.length > 2) {
                if (!stubs[key]) stubs[key] = { file, langs: [] };
                stubs[key].langs.push(lang);
            }
        });
    });
});

const sortedKeys = Object.keys(stubs).sort();
const result = {};
sortedKeys.forEach(k => result[k] = stubs[k]);

if (!fs.existsSync('.temp')) fs.mkdirSync('.temp');
fs.writeFileSync('.temp/all_stubs.json', JSON.stringify(result, null, 2));
console.log('Total unique stub keys found:', sortedKeys.length);
