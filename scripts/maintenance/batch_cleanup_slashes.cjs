const fs = require('fs');
const path = require('path');

const ROOT_DIR = '.';
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');
const LANGS = ['en', 'uk', 'el', 'nl', 'de', 'crh', 'pl'];

const cleanupMap = {
    'still': { uk: 'досі' },
    'thirsty': { uk: 'спраглий' },
    'yourself': { uk: 'ти сам' },
    'lately': { nl: 'de laatste tijd' },
    'commence': { uk: 'розпочинати', pl: 'rozpoczynać' },
    'conceal': { uk: 'приховувати', pl: 'ukrywać', el: 'αποκρύπτω', crh: 'gizlemek' },
    'concede': { uk: 'поступатися', pl: 'przyznawać', el: 'παραδέχομαι', crh: 'berilmek' },
    'condemn': { uk: 'засуджувати', pl: 'potępiać', el: 'καταδικάζω', crh: 'mahükm etmek' },
    'confine': { uk: 'обмежувати', pl: 'ograniczać', el: 'περιορίζω', crh: 'sıñırlamaq' },
    'confront': { uk: 'протистояти', pl: 'stawiać cзоła', el: 'αντιμετωπίζω', crh: 'qarşı çıqmaq' },
    'conquer': { uk: 'завойовувати', pl: 'podbijać', el: 'κατακτώ', crh: 'fethetmek', nl: 'veroveren' },
    'conserve': { uk: 'зберігати', pl: 'oszczędzać', el: 'εξοικονομώ', crh: 'qorumaq', nl: 'besparen' },
    'constitute': { uk: 'становити', pl: 'stanowić', el: 'αποτελώ', crh: 'teşkil etmek', nl: 'vormen' },
    'contend': { uk: 'стверджувати', pl: 'twierdzić', el: 'ισχυρίζομαι', crh: 'iddia etmek', nl: 'beweren' },
    'emerge': { pl: 'pojawiać się' },
    'exaggerate': { pl: 'wyolbrzymiać' },
    'execute': { pl: 'wykonywać' },
    'fluctuate': { pl: 'wahać się' },
    'intervene': { pl: 'interweniować' },
    'invoke': { pl: 'odwoływać się' },
    'merge': { pl: 'łączyć się' },
    'nominate': { pl: 'nominować' },
    'originate': { pl: 'pochodzić' },
    'overlook': { pl: 'przeoczyć' },
    'prosecute': { pl: 'oskarżać' },
    'resemble': { pl: 'przypominać' },
    'strive': { pl: 'dążyć' },
    'uphold': { pl: 'podtrzymywać' },
    'yield': { pl: 'przynosić' }
};

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const p = path.join(dir, file);
        const stat = fs.statSync(p);
        if (stat && stat.isDirectory()) results = results.concat(walk(p));
        else results.push(p);
    });
    return results;
};

const files = walk(TRANS_DIR);

files.forEach(filePath => {
    if (!filePath.endsWith('.json')) return;
    
    // Extract language from path
    const parts = filePath.split(path.sep);
    const langIndex = parts.indexOf('translations');
    if (langIndex === -1 || langIndex + 1 >= parts.length) return;
    const lang = parts[langIndex + 1];

    let content = fs.readFileSync(filePath, 'utf8');
    const hasBOM = content.startsWith('\ufeff');
    if (hasBOM) content = content.slice(1);
    
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        return;
    }

    let changed = false;
    for (const [key, replacements] of Object.entries(cleanupMap)) {
        if (data[key] && replacements[lang]) {
            if (data[key] !== replacements[lang]) {
                data[key] = replacements[lang];
                changed = true;
            }
        }
        
        // Also generic slash cleanup if not specifically mapped
        if (data[key] && data[key].includes(' / ') && !replacements[lang]) {
            data[key] = data[key].split(' / ')[0];
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, (hasBOM ? '\ufeff' : '') + JSON.stringify(data, null, '\t') + '\n', 'utf8');
        console.log(`Updated ${filePath}`);
    }
});
