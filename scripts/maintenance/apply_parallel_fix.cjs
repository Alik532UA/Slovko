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

const batch7 = {
    "integrity": { uk: "цілісність", pl: "integralność", de: "Integrität", nl: "integriteit", el: "ακεραιότητα", crh: "bütünlik" },
    "intensify": { uk: "посилювати", pl: "nasilać", de: "intensivieren", nl: "intensiveren", el: "εντείνω", crh: "küçleştirüv" },
    "intensity": { uk: "інтенсивність", pl: "intensywność", de: "Intensität", nl: "intensiteit", el: "ένταση", crh: "küç" },
    "intensive": { uk: "інтенсивний", pl: "intensywny", de: "intensiv", nl: "intensief", el: "εντατικός", crh: "küçlü" },
    "intent": { uk: "намір", pl: "zamiar", de: "Absicht", nl: "intentie", el: "πρόθεση", crh: "niyet" },
    "interactive": { uk: "інтерактивний", pl: "interaktywny", de: "interaktiv", nl: "interactief", el: "διαδραστικός", crh: "interaktiv" },
    "interface": { uk: "інтерфейс", pl: "interfejs", de: "Schnittstelle", nl: "interface", el: "διεπαφή", crh: "arayüz" },
    "interfere": { uk: "втручатися", pl: "ingerować", de: "stören", nl: "interfereren", el: "παρεμβαίνω", crh: "qatışmaq" },
    "interference": { uk: "втручання", pl: "ingerencja", de: "Interferenz", nl: "inmenging", el: "παρεμβολή", crh: "qatışuv" },
    "interim": { uk: "проміжний", pl: "tymczasowy", de: "vorläufig", nl: "tussentijds", el: "προσωρινός", crh: "vaqtınca" },
    "interior": { uk: "інтер'єр", pl: "wnętrze", de: "Innenraum", nl: "interieur", el: "εσωτερικό", crh: "iç" },
    "intermediate": { uk: "середній", pl: "średniozaawansowany", de: "mittel", nl: "gemiddeld", el: "ενδιάμεσος", crh: "orta" },
    "intersection": { uk: "перехрестя", pl: "skrzyżowanie", de: "Kreuzung", nl: "kruispunt", el: "διασταύρωση", crh: "çat" },
    "intervention": { uk: "втручання", pl: "interwencja", de: "Intervention", nl: "interventie", el: "παρέμβαση", crh: "qarışuv" },
    "intimate": { uk: "інтимний", pl: "intymny", de: "intim", nl: "intiem", el: "οικείος", crh: "yakın" },
    "intriguing": { uk: "інтригуючий", pl: "intrygujący", de: "faszinierend", nl: "intrigerend", el: "ιντριγκαδόρικος", crh: "meraklı" },
    "inventory": { uk: "інвентар", pl: "inwentarz", de: "Inventar", nl: "inventaris", el: "απογραφή", crh: "cedvel" },
    "investigator": { uk: "слідчий", pl: "śledczy", de: "Ermittler", nl: "onderzoeker", el: "ερευνητής", crh: "teftişçi" },
    "invisible": { uk: "невидимий", pl: "niewidoczny", de: "unsichtbar", nl: "onzichtbaar", el: "αόρατος", crh: "körünmez" },
    "ironic": { uk: "іронічний", pl: "ironiczny", de: "ironisch", nl: "ironisch", el: "ειρωνικός", crh: "alaylı" }
};

applyTranslations(batch7);
