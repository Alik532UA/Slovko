const fs = require('fs');
const path = require('path');

const ROOT_DIR = '.';
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');

const cleanupMap = {
    'contribute': { uk: 'сприяти', el: 'συνεισφέρω', pl: 'przyczyniać się', nl: 'bijdragen', de: 'beitragen', crh: 'isse qoşmaq' },
    'workplace': { uk: 'робоче місце', el: 'χώρος εργασίας', pl: 'miejsce pracy', nl: 'werkplek', de: 'Arbeitsplatz', crh: 'iş yeri' },
    'pretend': { uk: 'прикидатися', el: 'προσποιούμαι', pl: 'udawać', nl: 'veinzen', de: 'vortäuschen', crh: 'özüni köstermek' },
    'frustrate': { uk: 'перешкоджати', el: 'ματαίω', pl: 'krzyżować plany', nl: 'frustreren', de: 'frustrieren', crh: 'engel olmaq' },
    'unfold': { uk: 'розгортатися', el: 'ξεδιπλώνω', pl: 'rozwijać się', nl: 'ontvouwen', de: 'entfalten', crh: 'açılmaq' },
    'apprehensive': { uk: 'тривожний', el: 'ανήσυχος', pl: 'pełen obaw', nl: 'bezorgd', de: 'besorgt', crh: 'qorqaq' },
    'conceive': { uk: 'задумувати', el: 'συλλαμβάνω', pl: 'począć', nl: 'bedenken', de: 'konzipieren', crh: 'tüşünip çıqarmaq' },
    'lyric': { uk: 'текст пісні', el: 'στίχος', pl: 'tekst piosenki', nl: 'songtekst', de: 'Liedtext', crh: 'lirika' },
    'timing': { uk: 'вибір часу', el: 'συγχρονισμός', pl: 'wyczucie czasu', nl: 'timing', de: 'Timing', crh: 'vaqıtlauv' },
    'consequently': { uk: 'отже', el: 'κατά συνέπεια', pl: 'w konsekwencji', nl: 'bijgevolg', de: 'folglich', crh: 'neticede' },
    'adoption': { uk: 'прийняття', el: 'υιοθεσία', pl: 'adopcja', nl: 'adoptie', de: 'Annahme', crh: 'evlâtlıqqa aluv' },
    'allowance': { uk: 'допомога', el: 'επίδομα', pl: 'zasiłek', nl: 'toelage', de: 'Zulage', crh: 'maaş' },
    'resolution': { uk: 'вирішення', el: 'απόφαση', pl: 'uchwała', nl: 'resolutie', de: 'Beschluss', crh: 'qarar' },
    'derive': { uk: 'отримувати', el: 'προέρχομαι', pl: 'wywodzić się', nl: 'afleiden', de: 'ableiten', crh: 'almaq' },
    'overlook': { uk: 'не помічати', el: 'παραβλέπω', pl: 'przeoczyć', nl: 'over het hoofd zien', de: 'übersehen', crh: 'közden qaçırmaq' },
    'neither': { uk: 'ні той, ні інший', el: 'ούτε', pl: 'ani', nl: 'noch', de: 'weder', crh: 'ne ... ne de' },
    'disagree': { uk: 'не погоджуватися', el: 'διαφωνώ', pl: 'nie zgadzać się', nl: 'het oneens zijn', de: 'widersprechen', crh: 'razı olmamaq' }
};

const walk = (dir) => {
    let results = [];
    if (!fs.existsSync(dir)) return results;
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
    } catch (e) { return; }

    let changed = false;
    for (const [key, langValues] of Object.entries(cleanupMap)) {
        if (data[key] && langValues[lang]) {
            if (data[key] !== langValues[lang]) {
                data[key] = langValues[lang];
                changed = true;
                console.log(`[${lang}] Updated ${key}: ${data[key]}`);
            }
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, (hasBOM ? '\ufeff' : '') + JSON.stringify(data, null, '\t') + '\n', 'utf8');
    }
});
