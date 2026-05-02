const fs = require('fs');
const path = require('path');

const langs = ['uk', 'el', 'de', 'nl', 'pl', 'crh'];
const stubs = {};

langs.forEach(lang => {
    const dir = path.join('src/lib/data/translations', lang, 'levels');
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach(file => {
        if (!file.endsWith('.json')) return;
        const filePath = path.join(dir, file);
        const contentStr = fs.readFileSync(filePath, 'utf8');
        let content;
        try {
            content = JSON.parse(contentStr.replace(/^\uFEFF/, ''));
        } catch (e) {
            console.error(`Error parsing ${filePath}: ${e.message}`);
            return;
        }

        Object.entries(content).forEach(([key, val]) => {
            // Check if untranslated (ignore case, ignore suffixes in key for comparison)
            const cleanKey = key.split('_')[0].split('(')[0].trim().toLowerCase();
            const cleanVal = val.toLowerCase();
            
            if (cleanKey === cleanVal && key.length > 1) {
                if (!stubs[lang]) stubs[lang] = [];
                stubs[lang].push({ file, key, val });
            }
        });
    });
});

fs.writeFileSync('.temp/current_stubs_report.json', JSON.stringify(stubs, null, 2));
console.log('Stubs report generated in .temp/current_stubs_report.json');
langs.forEach(l => {
    console.log(`${l}: ${stubs[l] ? stubs[l].length : 0} stubs`);
});
