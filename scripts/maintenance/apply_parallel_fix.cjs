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

const batch11 = {
    "magistrate": { uk: "суддя", pl: "sędzia pokoju", de: "Magistrat", nl: "magistraat", el: "δικαστής", crh: "hakim" },
    "magnetic": { uk: "магнітний", pl: "magnetyczny", de: "magnetisch", nl: "magnetisch", el: "μαγνητικός", crh: "mıqnatisiy" },
    "magnitude": { uk: "величина", pl: "wielkość", de: "Größe", nl: "grootte", el: "μέγεθος", crh: "büyüklik" },
    "mainland": { uk: "материк", pl: "ląd stały", de: "Festland", nl: "vasteland", el: "ηπειρωτική χώρα", crh: "qara" },
    "mainstream": { uk: "основний потік", pl: "główny nurt", de: "Mainstream", nl: "mainstream", el: "κυρίαρχη τάση", crh: "umumiy aqım" },
    "maintenance": { uk: "обслуговування", pl: "konserwacja", de: "Wartung", nl: "onderhoud", el: "συντήρηση", crh: "baquv" },
    "mandate": { uk: "мандат", pl: "mandat", de: "Mandat", nl: "mandaat", el: "εντολή", crh: "vekâlet" },
    "mandatory": { uk: "обов'язковий", pl: "obowiązkowy", de: "verpflichtend", nl: "verplicht", el: "υποχρεωτικός", crh: "mecburiy" },
    "manifest": { uk: "маніфест", pl: "manifest", de: "manifest", nl: "manifest", el: "έκδηλος", crh: "beyan" },
    "manipulation": { uk: "маніпуляція", pl: "manipulacja", de: "Manipulation", nl: "manipulatie", el: "χειραγώγηση", crh: "manipulyatsiya" },
    "manuscript": { uk: "рукопис", pl: "rękopis", de: "Manuskript", nl: "manuscript", el: "χειρόγραφο", crh: "qol yazması" },
    "marginal": { uk: "незначний", pl: "marginalny", de: "marginal", nl: "marginaal", el: "οριακός", crh: "ehemmiyetsiz" },
    "marine": { uk: "морський", pl: "morski", de: "Meeres-", nl: "marien", el: "θαλάσσιος", crh: "deñizge ait" },
    "marketplace": { uk: "ринок", pl: "rynek", de: "Marktplatz", nl: "marktplaats", el: "αγορά", crh: "bazar meydanı" },
    "mask": { uk: "маска", pl: "maska", de: "Maske", nl: "masker", el: "μάσκα", crh: "maska" },
    "massacre": { uk: "різанина", pl: "masakra", de: "Massaker", nl: "bloedbad", el: "σφαγή", crh: "qatliâm" },
    "mathematical": { uk: "математичний", pl: "matematyczny", de: "mathematisch", nl: "wiskundig", el: "μαθηματικός", crh: "riyaziy" },
    "mature": { uk: "зрілий", pl: "dojrzały", de: "reif", nl: "volwassen", el: "ώριμος", crh: "olğun" },
    "maximize": { uk: "максимізувати", pl: "maksymalizować", de: "maximieren", nl: "maximaliseren", el: "μεγιστοποιώ", crh: "maksimalleştirmek" },
    "meaningful": { uk: "значущий", pl: "znaczący", de: "bedeutungsvoll", nl: "zinvol", el: "ουσιαστικός", crh: "manalı" }
};

applyTranslations(batch11);
