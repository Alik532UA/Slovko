const fs = require('fs');
const path = require('path');

function applyTranslations(translations) {
    const langs = ['uk', 'el', 'de', 'nl', 'pl', 'crh'];
    const baseDir = 'src/lib/data/translations';

    langs.forEach(lang => {
        const langDir = path.join(baseDir, lang, 'levels');
        if (!fs.existsSync(langDir)) return;

        fs.readdirSync(langDir).forEach(file => {
            if (!file.endsWith('.json')) return;
            const filePath = path.join(langDir, file);
            let contentStr = fs.readFileSync(filePath, 'utf8');
            let content = JSON.parse(contentStr.replace(/^\uFEFF/, ''));
            let changed = false;

            Object.keys(content).forEach(key => {
                if (translations[key] && translations[key][lang]) {
                    content[key] = translations[key][lang];
                    changed = true;
                }
            });

            if (changed) {
                fs.writeFileSync(filePath, '\uFEFF' + JSON.stringify(content, null, '\t'), 'utf8');
                console.log(`Updated keys in ${lang}/${file}`);
            }
        });
    });
}

const batchFinalClean = {
    "hey_exclam.": { uk: "ей!", el: "έι!", de: "hey!", nl: "hé!", pl: "hej!", crh: "ey!" },
    "oh_exclam.": { uk: "о!", el: "ω!", de: "oh!", nl: "oh!", pl: "o!", crh: "o!" },
    "ok_exclam.": { uk: "окей!", el: "εντάξει!", de: "okay!", nl: "oké!", pl: "okej!", crh: "eyi!" },
    "the_definite_article": { uk: "означений артикль", el: "οριστικό άρθρο", de: "bestimmter Artikel", nl: "bepaald lidwoord", pl: "przedimek określony", crh: "belirli artikul" },
    "adj._a": { uk: "прикметник", el: "επίθετο", de: "Adjektiv", nl: "bijvoeglijk naamwoord", pl: "przymiotnik", crh: "sıfat" },
    "ah_exclam.": { uk: "а!", el: "α!", de: "ach!", nl: "ach!", pl: "ach!", crh: "a!" },
    "wow_exclam.": { uk: "ого!", el: "ουάου!", de: "wow!", nl: "wauw!", pl: "wow!", crh: "maşalla!" },
    "zone_n": { uk: "зона", el: "ζώνη", de: "Zone", nl: "zone", pl: "strefa", crh: "zona" },
    "smartphone": { uk: "смартфон", el: "έξυπνο τηλέφωνο", de: "Smartphone", nl: "smartphone", pl: "smartfon", crh: "smartfon" },
    "aids": { uk: "СНІД", el: "AIDS", de: "AIDS", nl: "aids", pl: "AIDS", crh: "AİDS" }
};

applyTranslations(batchFinalClean);
