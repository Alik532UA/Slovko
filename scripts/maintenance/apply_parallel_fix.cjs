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

const batch12 = {
    "meantime": { uk: "тим часом", pl: "tymczasem", de: "Zwischenzeit", nl: "tussentijd", el: "εν τω μεταξύ", crh: "bu arada" },
    "medieval": { uk: "середньовічний", pl: "średniowieczny", de: "mittelalterlich", nl: "middeleeuws", el: "μεσαιωνικός", crh: "orta asırğa ait" },
    "meditation": { uk: "медитація", pl: "medytacja", de: "Meditation", nl: "meditatie", el: "διαλογισμός", crh: "tefekkür" },
    "melody": { uk: "мелодія", pl: "melodia", de: "Melodie", nl: "melodie", el: "μελωδία", crh: "ezgi" },
    "memo": { uk: "пам'ятка", pl: "notatka służbowa", de: "Memo", nl: "memo", el: "σημείωμα", crh: "hatırlatuv" },
    "memoir": { uk: "мемуари", pl: "pamiętnik", de: "Memoiren", nl: "memoires", el: "απομνημόνευμα", crh: "hâtıralar" },
    "memorial": { uk: "меморіал", pl: "pomnik", de: "Denkmal", nl: "gedenkteken", el: "μνημείο", crh: "eykel" },
    "mentor": { uk: "наставник", pl: "mentor", de: "Mentor", nl: "mentor", el: "μέντορας", crh: "mürşid" },
    "merchant": { uk: "купець", pl: "kupiec", de: "Kaufmann", nl: "koopman", el: "έμπορος", crh: "tüccar" },
    "mercy": { uk: "милосердя", pl: "miłosierdzie", de: "Gnade", nl: "genade", el: "έλεος", crh: "merhamet" },
    "mere": { uk: "простий", pl: "zwyczajny", de: "bloß", nl: "louter", el: "απλός", crh: "adi" },
    "merely": { uk: "лише", pl: "jedynie", de: "lediglich", nl: "slechts", el: "απλώς", crh: "ancaq" },
    "merger": { uk: "злиття", pl: "fuzja", de: "Fusion", nl: "fusie", el: "συγχώνευση", crh: "birleşüv" },
    "merit": { uk: "заслуга", pl: "zasługa", de: "Verdienst", nl: "verdienste", el: "αξία", crh: "liyqat" },
    "methodology": { uk: "методологія", pl: "metodologia", de: "Methodik", nl: "methodologie", el: "μεθοδολογία", crh: "metodologiya" },
    "midst": { uk: "посеред", pl: "pośród", de: "Mitte", nl: "midden", el: "μέσω", crh: "ortasında" },
    "migration": { uk: "міграція", pl: "migracja", de: "Migration", nl: "migratie", el: "μετανάστευση", crh: "icret" },
    "militant": { uk: "бойовик", pl: "bojownik", de: "militant", nl: "militant", el: "μαχητικός", crh: "uruşqan" },
    "militia": { uk: "ополчення", pl: "milicja", de: "Miliz", nl: "militie", el: "πολιτοφυλακή", crh: "halq ordusı" },
    "mill": { uk: "млин", pl: "młyn", de: "Mühle", nl: "molen", el: "μύλος", crh: "degirmen" }
};

applyTranslations(batch12);
