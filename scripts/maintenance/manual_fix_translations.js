import fs from 'fs';
import path from 'path';

const fixes = [
    // NL Fixes
    { lang: 'nl', key: 'database', val: 'database' },
    { lang: 'nl', key: 'database_management', val: 'database' },
    { lang: 'nl', key: 'wake', val: 'wekken' },
    { lang: 'nl', key: 'hard', val: 'hard' },
    { lang: 'nl', key: 'free', val: 'gratis' },
    { lang: 'nl', key: 'bet', val: 'weddenschap' },
    { lang: 'nl', key: 'main', val: 'belangrijkste' },
    { lang: 'nl', key: 'hostel', val: 'hostel' },
    { lang: 'nl', key: 'airline', val: 'luchtvaartmaatschappij' },
    { lang: 'nl', key: 'pardon', val: 'pardon' },
    { lang: 'nl', key: 'atm', val: 'pinautomaat' },
    { lang: 'nl', key: 'wild', val: 'wild' },
    { lang: 'nl', key: 'drug', val: 'drug' },
    { lang: 'nl', key: 'alarm', val: 'alarm' },
    { lang: 'nl', key: 'entail_involve', val: 'betekenen' },
    { lang: 'nl', key: 'entail_cost', val: 'betekenen' },
    { lang: 'nl', key: 'overlook_ignore', val: 'negeren' },
    { lang: 'nl', key: 'seize_grab', val: 'grijpen' },
    
    // DE Fixes
    { lang: 'de', key: 'right', val: 'rechts' },
    { lang: 'de', key: 'nurse', val: 'Krankenschwester' },
    { lang: 'de', key: 'drop', val: 'fallen lassen' },
    { lang: 'de', key: 'sorry_adj', val: 'traurig' },
    { lang: 'de', key: 'skate', val: 'Eislaufen' },
    { lang: 'de', key: 'moment', val: 'Moment' },
    { lang: 'de', key: 'past', val: 'Vergangenheit' },
    { lang: 'de', key: 'rest', val: 'ausruhen' },
    { lang: 'de', key: 'tube', val: 'U-Bahn' },
    { lang: 'de', key: 'atm', val: 'Geldautomat' },
    { lang: 'de', key: 'alarm', val: 'Alarm' },
    { lang: 'de', key: 'realise_verb', val: 'realisieren' },
    { lang: 'de', key: 'state_declare', val: 'erklären' },
    { lang: 'de', key: 'state_country', val: 'Staat' }
];

const baseDir = 'src/lib/data/translations';

function applyFixes() {
    fixes.forEach(fix => {
        const langDir = path.join(baseDir, fix.lang);
        if (!fs.existsSync(langDir)) return;

        const scan = (dir) => {
            fs.readdirSync(dir).forEach(item => {
                const fullPath = path.join(dir, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    scan(fullPath);
                } else if (item.endsWith('.json')) {
                    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                    if (data[fix.key] !== undefined) {
                        data[fix.key] = fix.val;
                        fs.writeFileSync(fullPath, JSON.stringify(data, null, 4));
                        console.log(`Fixed [${fix.lang}] ${fix.key} in ${item}`);
                    }
                }
            });
        };
        scan(langDir);
    });
}

applyFixes();
