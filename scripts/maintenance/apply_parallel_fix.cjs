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

const batch6 = {
    "inherent": { uk: "властивий", pl: "nieodłączny", de: "inhärent", nl: "inherent", el: "εγγενής", crh: "esaslı" },
    "inhibit": { uk: "пригнічувати", pl: "hamować", de: "hemmen", nl: "remmen", el: "παρεμποδίζω", crh: "kederlemek" },
    "injustice": { uk: "несправедливість", pl: "niesprawiedliwość", de: "Ungerechtigkeit", nl: "onrecht", el: "αδικία", crh: "musaviysizlik" },
    "inmate": { uk: "в'язень", pl: "więzień", de: "Insasse", nl: "gedetineerde", el: "κρατούμενος", crh: "mahbüs" },
    "inquire": { uk: "запитувати", pl: "dowiadywać się", de: "anfragen", nl: "informeren", el: "ρωτώ", crh: "soraştırmaq" },
    "insertion": { uk: "вставка", pl: "wstawienie", de: "Einfügung", nl: "invoeging", el: "εισαγωγή", crh: "qoyuv" },
    "insider": { uk: "інсайдер", pl: "informator", de: "Insider", nl: "insider", el: "γνώστης εκ των έσω", crh: "içten kimese" },
    "inspection": { uk: "огляд", pl: "kontrola", de: "Inspektion", nl: "inspectie", el: "επιθεώρηση", crh: "teftiş" },
    "inspiration": { uk: "натхнення", pl: "inspiracja", de: "Inspiration", nl: "inspiratie", el: "έμπνευση", crh: "ilham" },
    "instinct": { uk: "інстинкт", pl: "instynkt", de: "Instinkt", nl: "instinct", el: "ένστικτο", crh: "iç-duyğu" },
    "institutional": { uk: "інституційний", pl: "instytucjonalny", de: "institutionell", nl: "institutioneel", el: "θεσμικός", crh: "teşkilâtlı" },
    "instruct": { uk: "інструктувати", pl: "instruować", de: "anweisen", nl: "instrueren", el: "καθοδηγώ", crh: "ögretmek" },
    "instrumental": { uk: "інструментальний", pl: "pomocny", de: "instrumental", nl: "instrumentaal", el: "καθοριστικός", crh: "aletli" },
    "insufficient": { uk: "недостатній", pl: "niewystarczający", de: "unzureichend", nl: "onvoldoende", el: "ανεπαρκής", crh: "yetersiz" },
    "insult": { uk: "образа", pl: "zniewaga", de: "Beleidigung", nl: "belediging", el: "προσβολή", crh: "aqaret" },
    "intact": { uk: "неушкоджений", pl: "nienaruszony", de: "intakt", nl: "intact", el: "ανέπαφος", crh: "sap-sağlam" },
    "intake": { uk: "споживання", pl: "spożycie", de: "Einnahme", nl: "inname", el: "πρόσληψη", crh: "aluv" },
    "integral": { uk: "невід'ємний", pl: "integralny", de: "integral", nl: "integraal", el: "αναπόσπαστος", crh: "esas" },
    "integrated": { uk: "інтегрований", pl: "zintegrowany", de: "integriert", nl: "geïntegreerd", el: "ολοκληρωμένος", crh: "qatışqan" },
    "integration": { uk: "інтеграція", pl: "integracja", de: "Integration", nl: "integratie", el: "ενσωμάτωση", crh: "birleşüv" }
};

applyTranslations(batch6);
