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

const batch4 = {
    "hint": { uk: "підказка", pl: "wskazówka", de: "Hinweis", nl: "hint", el: "υπαινιγμός", crh: "işaret" },
    "homeland": { uk: "батьківщина", pl: "ojczyzna", de: "Heimat", nl: "vaderland", el: "πατρίδα", crh: "vatan" },
    "hopeful": { uk: "сповнений надії", pl: "pełen nadziei", de: "hoffnungsvoll", nl: "hoopvol", el: "ελπιδοφόρος", crh: "ümütli" },
    "horizon": { uk: "горизонт", pl: "horyzont", de: "Horizont", nl: "horizon", el: "ορίζοντας", crh: "ufuq" },
    "horn": { uk: "ріг", pl: "róg", de: "Horn", nl: "hoorn", el: "κέρας", crh: "müyüz" },
    "hostage": { uk: "заручник", pl: "zakładnik", de: "Geisel", nl: "gijzelaar", el: "όμηρος", crh: "yesir" },
    "hostile": { uk: "ворожий", pl: "wrogi", de: "feindlich", nl: "vijandig", el: "εχθρικός", crh: "duşman" },
    "hostility": { uk: "ворожість", pl: "wrogość", de: "Feindseligkeit", nl: "vijandigheid", el: "εχθρότητα", crh: "duşmanlıq" },
    "humanitarian": { uk: "гуманітарний", pl: "humanitarny", de: "humanitär", nl: "humanitair", el: "ανθρωπιστικός", crh: "insaniy" },
    "humanity": { uk: "людство", pl: "ludzkość", de: "Menschheit", nl: "mensheid", el: "ανθρωπότητα", crh: "insaniyet" },
    "humble": { uk: "покірний", pl: "pokorny", de: "bescheiden", nl: "nederig", el: "ταπεινός", crh: "mütevazı" },
    "hydrogen": { uk: "водень", pl: "wodór", de: "Wasserstoff", nl: "waterstof", el: "υδρογόνο", crh: "vodorod" },
    "ideological": { uk: "ідеологічний", pl: "ideologiczny", de: "ideologisch", nl: "ideologisch", el: "ιδεολογικός", crh: "ideologik" },
    "ideology": { uk: "ідеологія", pl: "ideologia", de: "Ideologie", nl: "ideologie", el: "ιδεολογία", crh: "ideologiya" },
    "idiot": { uk: "ідіот", pl: "idiota", de: "Idiot", nl: "idioot", el: "ηλίθιος", crh: "ahmaq" },
    "ignorance": { uk: "невігластво", pl: "ignorancja", de: "Unwissenheit", nl: "onwetendheid", el: "άγνοια", crh: "bilmesizlik" },
    "imagery": { uk: "образи", pl: "obrazowanie", de: "Bilderwelt", nl: "beeldspraak", el: "εικόνες", crh: "timsaller" },
    "immense": { uk: "величезний", pl: "ogromny", de: "immens", nl: "immens", el: "τεράστιος", crh: "asra" },
    "imminent": { uk: "неминучий", pl: "nieuchronny", de: "bevorstehend", nl: "dreigend", el: "επικείμενος", crh: "yaqın" },
    "implementation": { uk: "впровадження", pl: "wdrożenie", de: "Umsetzung", nl: "implementatie", el: "εφαρμογή", crh: "тормушқа ашырув" }
};

applyTranslations(batch4);
