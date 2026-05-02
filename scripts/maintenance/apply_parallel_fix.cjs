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
                const searchKey = key.toLowerCase();
                if (translations[searchKey] && translations[searchKey][lang]) {
                    content[key] = translations[searchKey][lang];
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

const batch66 = {
    "initial": { uk: "початковий", el: "αρχικός", de: "anfänglich", nl: "aanvankelijk", pl: "początkowy", crh: "başlanğıç" },
    "initially": { uk: "спочатку", el: "αρχικά", de: "anfangs", nl: "aanvankelijk", pl: "początkowo", crh: "başta" },
    "initiative": { uk: "ініціатива", el: "πρωτοβουλία", de: "Initiative", nl: "initiatief", pl: "inicjatywa", crh: "teşebbüs" },
    "inner": { uk: "внутрішній", el: "εσωτερικός", de: "innerer", nl: "binnenste", pl: "wewnętrzny", crh: "içki" },
    "insight": { uk: "розуміння / інсайт", el: "διορατικότητα", de: "Einblick", nl: "inzicht", pl: "wgląd", crh: "añlayış" },
    "instance": { uk: "екземпляр / випадок", el: "περίπτωση", de: "Instanz", nl: "instantie", pl: "instancja / przypadek", crh: "misal" },
    "institute": { uk: "інститут", el: "ινστιτούτο", de: "Institut", nl: "instituut", pl: "instytut", crh: "institut" },
    "institution": { uk: "установа", el: "ίδρυμα", de: "Institution", nl: "instelling", pl: "instytucja", crh: "müessise" },
    "intended": { uk: "призначений", el: "προοριζόμενος", de: "beabsichtigt", nl: "bedoeld", pl: "przeznaczony", crh: "niyet etilgen" },
    "intense": { uk: "інтенсивний", el: "έντονος", de: "intensiv", nl: "intens", pl: "intensywny", crh: "şiddetli" },
    "investigation": { uk: "розслідування", el: "έρευνα", de: "Untersuchung", nl: "onderzoek", pl: "dochodzenie", crh: "tahqiqat" },
    "investment": { uk: "інвестиція", el: "επένδυση", de: "Investition", nl: "investering", pl: "inwestycja", crh: "investitsiya" },
    "judgement": { uk: "судження", el: "κρίση", de: "Urteil", nl: "oordeel", pl: "osąd", crh: "üküm" },
    "junior": { uk: "молодший", el: "νεότερος", de: "Junior", nl: "junior", pl: "młodszy", crh: "kiçik" },
    "labour": { uk: "праця", el: "εργασία", de: "Arbeit", nl: "arbeid", pl: "praca", crh: "emek" },
    "largely": { uk: "значною мірою", el: "κυρίως", de: "größtenteils", nl: "grotendeels", pl: "w dużej mierze", crh: "eskiden" },
    "leadership": { uk: "лідерство", el: "ηγεσία", de: "Führung", nl: "leiderschap", pl: "przywództwo", crh: "yolbaşçılıq" },
    "league": { uk: "ліга", el: "λίγκα", de: "Liga", nl: "competitie", pl: "liga", crh: "liga" },
    "licence": { uk: "ліцензія", el: "άδεια", de: "Lizenz", nl: "licentie", pl: "licencja", crh: "litsenziya" },
    "limited": { uk: "обмежений", el: "περιορισμένος", de: "begrenzt", nl: "beperkt", pl: "ograniczony", crh: "sıñırlı" },
    "lively": { uk: "жвавий", el: "ζωντανός", de: "lebhaft", nl: "levendig", pl: "ożywiony", crh: "canlı" },
    "load": { uk: "завантаження / вантаж", el: "φορτίο", de: "Last", nl: "lading", pl: "ładunek", crh: "yük" },
    "loan": { uk: "позика", el: "δάνειο", de: "Kredit", nl: "lening", pl: "pożyczka", crh: "borç" },
    "lord": { uk: "лорд / господь", el: "λόρδος", de: "Herr", nl: "heer", pl: "pan", crh: "rabbim" },
    "lower": { uk: "нижчий", el: "χαμηλότερος", de: "niedriger", nl: "lager", pl: "niższy", crh: "alçaq" },
    "lung": { uk: "легеня", el: "πνεύμονας", de: "Lunge", nl: "long", pl: "płuco", crh: "öpke" },
    "mass": { uk: "маса", el: "μάζα", de: "Masse", nl: "massa", pl: "masa", crh: "kütle" },
    "massive": { uk: "масивний", el: "τεράστιος", de: "massiv", nl: "massief", pl: "masywny", crh: "balaban" },
    "master": { uk: "майстер", el: "δάσκαλος / κύριος", de: "Meister", nl: "meester", pl: "mistrz", crh: "usta" },
    "matching": { uk: "відповідний", el: "ταιριαστός", de: "passend", nl: "bijpassend", pl: "pasujący", crh: "uyğun" }
};

applyTranslations(batch66);
