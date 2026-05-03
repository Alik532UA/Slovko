const fs = require('fs');
const path = require('path');

const ROOT_DIR = '.';
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');
const LANGS = ['en', 'uk', 'el', 'nl', 'de', 'crh', 'pl'];

// Mapping base keys to their primary meaning (consolidated)
const baseKeyConsolidation = {
    'have': { de: 'haben', nl: 'hebben', uk: 'мати', el: 'έχω', crh: 'saip olmaq', pl: 'mieć' },
    'should': { uk: 'варто', pl: 'powinien', el: 'πρέπει', nl: 'zou moeten', de: 'sollte', crh: 'kerek' },
    'still': { uk: 'досі', pl: 'nadal', el: 'ακόμα', nl: 'nog steeds', de: 'immer noch', crh: 'alâ da' },
    'thirsty': { uk: 'спраглий', pl: 'spragniony', el: 'διψασμένος', nl: 'dorstig', de: 'durstig', crh: 'suvsağan' },
    'yourself': { uk: 'ти сам', pl: 'siebie', el: 'ο εαυτός σου', nl: 'jezelf', de: 'dich selbst', crh: 'özüñ' },
    'disagree': { uk: 'не погоджуватися', de: 'widersprechen', nl: 'niet mee eens zijn', el: 'διαφωνώ', crh: 'razı olmamaq', pl: 'nie zgadzać się' },
    'mine': { uk: 'мій', el: 'δικός μου', nl: 'mijn', de: 'mein', crh: 'menimki', pl: 'mój' },
    'fit': { uk: 'підходити', el: 'ταιριάζω', nl: 'passen', de: 'passen', crh: 'uyğun kelmek', pl: 'pasować' },
    'cure': { uk: 'ліки', el: 'θεραπεία', nl: 'genezing', de: 'Heilung', crh: 'ilâc', pl: 'lekarstwo' },
    'confidence': { uk: 'впевненість', el: 'αυτοπεποίθηση', nl: 'zelfvertrouwen', de: 'Selbstvertrauen', crh: 'özüne inam', pl: 'pewność siebie' },
    'trial': { uk: 'судовий процес', el: 'δίκη', nl: 'proces', de: 'Prozess', crh: 'mahkeme', pl: 'proces' },
    'collapse': { uk: 'крах', el: 'κατάρρευση', nl: 'instorting', de: 'Einsturz', crh: 'yıqıluv', pl: 'zapaść' },
    'cabin': { uk: 'салон літака', el: 'θάλαμος επιβατών', nl: 'cabine', de: 'Flugzeugkabine', crh: 'tayyare kabinası', pl: 'kabina samolotu' },
    'approach': { uk: 'підхід', el: 'προσέγγιση', nl: 'aanpak', de: 'Ansatz', crh: 'usul', pl: 'podejście' },
    'throughout': { uk: 'по всьому', el: "καθ' όλη τη διάρκεια", nl: 'doorheen', de: 'durchaus', crh: 'boyunca', pl: 'przez' },
    'pretend': { uk: 'прикидатися', el: 'προσποιούμαι', nl: 'doen alsof', de: 'so tun als ob', crh: 'özüni köstermek', pl: 'udawać' },
    'unfold': { uk: 'розгортатися', el: 'ξεδιπλώνω', nl: 'ontvouwen', de: 'entfalten', crh: 'açılmaq', pl: 'rozwijać się' },
    'apprehensive': { uk: 'тривожний', el: 'ανήσυχος', nl: 'bezorgd', de: 'besorgt', crh: 'qorqaq', pl: 'pełen obaw' },
    'conceive': { uk: 'задумувати', el: 'συλλαμβάνω', nl: 'bedenken', de: 'konzipieren', crh: 'tüşünip çıqarmaq', pl: 'począć' }
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
    for (const [key, langValues] of Object.entries(baseKeyConsolidation)) {
        if (data[key] && langValues[lang]) {
            if (data[key] !== langValues[lang]) {
                data[key] = langValues[lang];
                changed = true;
                console.log(`[${lang}] Fixed ${key}: ${data[key]}`);
            }
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, (hasBOM ? '\ufeff' : '') + JSON.stringify(data, null, '\t') + '\n', 'utf8');
    }
});

console.log('✅ Base keys consolidation complete.');
