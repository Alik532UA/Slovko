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

const batchParens = {
    "bank_(money)": { uk: "банк", el: "τράπεζα", de: "Bank", nl: "bank", pl: "bank", crh: "bank" },
    "bank_(river)": { uk: "берег", el: "όχθη", de: "Ufer", nl: "oever", pl: "brzeg", crh: "kenar" },
    "rock_(music)": { uk: "рок-музика", el: "ροκ", de: "Rockmusik", nl: "rock", pl: "rock", crh: "rok" },
    "rock_(stone)": { uk: "камінь", el: "πέτρα", de: "Stein", nl: "rots", pl: "kamień", crh: "taş" },
    "set_(group)": { uk: "набір", el: "σετ", de: "Set", nl: "set", pl: "zestaw", crh: "taqım" },
    "set_(put)": { uk: "встановлювати", el: "θέτω", de: "setzen", nl: "zetten", pl: "ustawiać", crh: "qoymaq" },
    "counter_(long_flat_surface)": { uk: "прилавок", el: "πάγκος", de: "Theke", nl: "balie", pl: "lada", crh: "tezgâh" },
    "counter_(argue_against)": { uk: "заперечувати", el: "αντικρούω", de: "entgegenwirken", nl: "tegenwerken", pl: "przeciwdziałać", crh: "qarşı turmaq" }
};

applyTranslations(batchParens);
