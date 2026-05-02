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

const batch9 = {
    "lawsuit": { uk: "судовий позов", pl: "pozew sądowy", de: "Klage", nl: "rechtszaak", el: "αγωγή", crh: "dava" },
    "layout": { uk: "макет", pl: "układ", de: "Layout", nl: "lay-out", el: "διάταξη", crh: "sırma" },
    "leak": { uk: "витік", pl: "przeciek", de: "Leck", nl: "lek", el: "διαρροή", crh: "sızuv" },
    "leap": { uk: "стрибок", pl: "skok", de: "Sprung", nl: "sprong", el: "άλμα", crh: "sıçrav" },
    "legacy": { uk: "спадщина", pl: "dziedzictwo", de: "Vermächtnis", nl: "erfenis", el: "κληρονομιά", crh: "miras" },
    "legendary": { uk: "легендарний", pl: "legendarny", de: "legendär", nl: "legendarisch", el: "θρυλικός", crh: "efsaneviy" },
    "legislation": { uk: "законодавство", pl: "ustawodawstwo", de: "Gesetzgebung", nl: "wetgeving", el: "νομοθεσία", crh: "qanuniyet" },
    "legislative": { uk: "законодавчий", pl: "ustawodawczy", de: "legislativ", nl: "wetgevend", el: "νομοθετικός", crh: "qanun berici" },
    "legislature": { uk: "законодавчий орган", pl: "legislatura", de: "Legislative", nl: "wetgevende macht", el: "νομοθετικό σώμα", crh: "qanuniyet meclisi" },
    "legitimate": { uk: "законний", pl: "legalny", de: "legitim", nl: "legitiem", el: "νόμιμος", crh: "qanuniy" },
    "lengthy": { uk: "тривалий", pl: "długotrwały", de: "langwierig", nl: "langdurig", el: "μακροσκελής", crh: "uzun" },
    "lesbian": { uk: "лесбійка", pl: "lesbijka", de: "lesbisch", nl: "lesbisch", el: "λεσβία", crh: "lezbiyanka" },
    "lesser": { uk: "менший", pl: "mniejszy", de: "geringer", nl: "minder", el: "mikρότερος", crh: "ufaq" },
    "lethal": { uk: "смертельний", pl: "śmiertelny", de: "tödlich", nl: "dodelijk", el: "θανατηφόρος", crh: "öldürijilik" },
    "liable": { uk: "відповідальний", pl: "odpowiedzialny", de: "haftbar", nl: "aansprakelijk", el: "υπεύθυνος", crh: "mesul" },
    "liberal": { uk: "ліберальний", pl: "liberalny", de: "liberal", nl: "liberaal", el: "φιλελεύθερος", crh: "liberal" },
    "liberation": { uk: "визволення", pl: "wyzwolenie", de: "Befreiung", nl: "bevrijding", el: "απελευθέρωση", crh: "azat etüv" },
    "liberty": { uk: "свобода", pl: "wolność", de: "Freiheit", nl: "vrijheid", el: "ελευθερία", crh: "hürriyet" },
    "lifelong": { uk: "довічний", pl: "dożywotni", de: "lebenslang", nl: "levenslang", el: "ισόβιος", crh: "ömürlik" },
    "likelihood": { uk: "ймовірність", pl: "prawdopodobieństwo", de: "Wahrscheinlichkeit", nl: "waarschijnlijkheid", el: "πιθανότητα", crh: "ihtimal" }
};

applyTranslations(batch9);
