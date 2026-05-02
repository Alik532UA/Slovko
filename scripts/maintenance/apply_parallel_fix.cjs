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

const batch13 = {
    "minimal": { uk: "мінімальний", pl: "minimalny", de: "minimal", nl: "minimaal", el: "ελάχιστος", crh: "en az" },
    "minimize": { uk: "мінімізувати", pl: "minimalizować", de: "minimieren", nl: "minimaliseren", el: "ελαχιστοποιώ", crh: "minimalleştirmek" },
    "mining": { uk: "видобуток корисних копалин", pl: "górnictwo", de: "Bergbau", nl: "mijnbouw", el: "εξόρυξη", crh: "madencilik" },
    "ministry": { uk: "міністерство", pl: "ministerstwo", de: "Ministerium", nl: "ministerie", el: "υπουργείο", crh: "nazirlik" },
    "miracle": { uk: "чудо", pl: "cud", de: "Wunder", nl: "wonder", el: "θαύμα", crh: "mucize" },
    "misery": { uk: "страждання", pl: "nędza", de: "Elend", nl: "ellende", el: "δυστυχία", crh: "sefalet" },
    "misleading": { uk: "оманливий", pl: "wprowadzający в błąd", de: "irreführend", nl: "misleidend", el: "παραπλανητικός", crh: "aldatıcı" },
    "missile": { uk: "ракета", pl: "pocisk", de: "Rakete", nl: "raket", el: "πύραυλος", crh: "raketa" },
    "mob": { uk: "натовп", pl: "tłum", de: "Pöbel", nl: "menigte", el: "όχλος", crh: "qalabalıq" },
    "mobility": { uk: "мобільність", pl: "mobilność", de: "Mobilität", nl: "mobiliteit", el: "κινητικότητα", crh: "areketlilik" },
    "mobilize": { uk: "мобілізувати", pl: "mobilizować", de: "mobilisieren", nl: "mobiliseren", el: "κινητοποιώ", crh: "seferber etmek" },
    "moderate": { uk: "помірний", pl: "umiarkowany", de: "moderat", nl: "gematigd", el: "μέτριος", crh: "orta" },
    "modification": { uk: "модифікація", pl: "modyfikacja", de: "Modifikation", nl: "modificatie", el: "τροποποίηση", crh: "deñişiklik" },
    "module": { uk: "модуль", pl: "moduł", de: "Modul", nl: "module", el: "μονάδα", crh: "modul" },
    "momentum": { uk: "імпульс", pl: "rozpęd", de: "Schwung", nl: "momentum", el: "ορμή", crh: "tezlik" },
    "monk": { uk: "монах", pl: "mnich", de: "Mönch", nl: "monnik", el: "μοναχός", crh: "rahip" },
    "monopoly": { uk: "монополія", pl: "monopol", de: "Monopol", nl: "monopolie", el: "μονοπώλιο", crh: "inhisar" },
    "morality": { uk: "мораль", pl: "moralność", de: "Moral", nl: "moraliteit", el: "ηθική", crh: "ahlâq" },
    "motive": { uk: "мотив", pl: "motyw", de: "Motiv", nl: "motief", el: "κίνητρο", crh: "sebep" },
    "motorist": { uk: "автомобіліст", pl: "kierowca", de: "Autofahrer", nl: "automobilist", el: "οδηγός αυτοκινήτου", crh: "aydayıcı" }
};

applyTranslations(batch13);
