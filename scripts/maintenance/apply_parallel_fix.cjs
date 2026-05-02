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

const batch16 = {
    "outlook": { uk: "прогноз / світогляд", pl: "perspektywa", de: "Aussicht", nl: "vooruitzicht", el: "προοπτική", crh: "baqış açısı" },
    "outrage": { uk: "обурення", pl: "oburzenie", de: "Empörung", nl: "verontwaardiging", el: "αγανάκτηση", crh: "ğadap" },
    "outsider": { uk: "сторонній", pl: "osoba z zewnątrz", de: "Außenseiter", nl: "buitenstaander", el: "ξένος", crh: "tışarıdan kimese" },
    "overly": { uk: "надмірно", pl: "nadmiernie", de: "übermäßig", nl: "overmatig", el: "υπερβολικά", crh: "ziyade" },
    "oversee": { uk: "наглядати", pl: "nadzorować", de: "beaufsichtigen", nl: "toezien op", el: "επιβλέπω", crh: "nezaret etmek" },
    "overturn": { uk: "перекинути", pl: "wywrócić", de: "umwerfen", nl: "omverwerpen", el: "ανατρέπω", crh: "yuvarlamaq" },
    "overwhelm": { uk: "перевантажувати", pl: "przytłaczać", de: "überwältigen", nl: "overweldigen", el: "κατακλύζω", crh: "bastırmaq" },
    "overwhelming": { uk: "переважний", pl: "przytłaczający", de: "überwältigend", nl: "overweldigend", el: "συντριπτικός", crh: "balaban" },
    "pad": { uk: "подушечка", pl: "podkładka", de: "Polster", nl: "kussen", el: "μαξιλαράκι", crh: "yastıçıq" },
    "parameter": { uk: "параметр", pl: "parametr", de: "Parameter", nl: "parameter", el: "παράμετρος", crh: "parametr" },
    "parental": { uk: "батьківський", pl: "rodzicielski", de: "elterlich", nl: "ouderlijk", el: "γονικός", crh: "ana-babağa ait" },
    "parish": { uk: "парафія", pl: "parafia", de: "Gemeinde", nl: "parochie", el: "ενορία", crh: "cemaat" },
    "parliamentary": { uk: "парламентський", pl: "parlamentarny", de: "parlamentarisch", nl: "parlementair", el: "κοινοβουλευτικός", crh: "parlament" },
    "partial": { uk: "частковий", pl: "częściowy", de: "teilweise", nl: "gedeeltelijk", el: "μερικός", crh: "qısmiy" },
    "partially": { uk: "частково", pl: "częściowo", de: "teilweise", nl: "gedeeltelijk", el: "εν μέρει", crh: "qısmen" },
    "passing": { uk: "проходження", pl: "mijanie", de: "Vorbeigehen", nl: "voorbijgaan", el: "πέρασμα", crh: "keçüv" },
    "passive": { uk: "пасивний", pl: "pasywny", de: "passiv", nl: "passief", el: "παθητικός", crh: "pasiv" },
    "pastor": { uk: "пастор", pl: "pastor", de: "Pastor", nl: "pastor", el: "πάστορας", crh: "pastor" },
    "patent": { uk: "патент", pl: "patent", de: "Patent", nl: "patent", el: "πατέντα", crh: "patent" },
    "pathway": { uk: "шлях", pl: "ścieżka", de: "Pfad", nl: "pad", el: "μονοπάτι", crh: "yol" }
};

applyTranslations(batch16);
