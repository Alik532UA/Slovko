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

const batch5 = {
    "imprison": { uk: "ув'язнювати", pl: "uwięzić", de: "ins Gefängnis werfen", nl: "gevangenzetten", el: "φυλακίζω", crh: "aps etmek" },
    "imprisonment": { uk: "ув'язнення", pl: "uwięzienie", de: "Haft", nl: "gevangenisstraf", el: "φυλάκιση", crh: "aps" },
    "inability": { uk: "нездатність", pl: "niezdolność", de: "Unfähigkeit", nl: "onvermogen", el: "ανικανότητα", crh: "qabiliyetsizlik" },
    "inadequate": { uk: "неадекватний", pl: "nieadekwatny", de: "unangemessen", nl: "ontoereikend", el: "ανεπαρκής", crh: "yetersiz" },
    "inappropriate": { uk: "неналежний", pl: "nieodpowiedni", de: "unangemessen", nl: "ongepast", el: "ακατάλληλος", crh: "uyğunsız" },
    "incarcerate": { uk: "ув'язнювати", pl: "uwięzić", de: "einsperren", nl: "opsluiten", el: "εγκλείω", crh: "aps etmek" },
    "incarceration": { uk: "ув'язнення", pl: "uwięzienie", de: "Einkerkerung", nl: "opsluiting", el: "εγκλεισμός", crh: "aps" },
    "incidence": { uk: "рівень захворюваності", pl: "częstość występowania", de: "Häufigkeit", nl: "incidentie", el: "συχνότητα εμφάνισης", crh: "rastkelüv" },
    "inclined": { uk: "схильний", pl: "skłonny", de: "geneigt", nl: "geneigd", el: "προδιατεθειμένος", crh: "meyilli" },
    "inclusion": { uk: "включення", pl: "włączenie", de: "Inklusion", nl: "insluiting", el: "ένταξη", crh: "içine aluv" },
    "incur": { uk: "зазнати", pl: "ponieść", de: "übernehmen", nl: "oplopen", el: "υφίσταμαι", crh: "oğramaq" },
    "indicator": { uk: "показник", pl: "wskaźnik", de: "Indikator", nl: "indicator", el: "δείκτης", crh: "köstergiç" },
    "indictment": { uk: "обвинувальний акт", pl: "akt oskarżenia", de: "Anklage", nl: "aanklacht", el: "κατηγορητήριο", crh: "qabaatlav" },
    "indigenous": { uk: "корінний", pl: "rdzenny", de: "eingeboren", nl: "inheems", el: "αυτόχθων", crh: "yerli" },
    "indulge": { uk: "потурати", pl: "pobłażać", de: "verwöhnen", nl: "verwennen", el: "ενδίδω", crh: "berilmek" },
    "inequality": { uk: "нерівність", pl: "nierówność", de: "Ungleichheit", nl: "ongelijkheid", el: "ανισότητα", crh: "musaviysizlik" },
    "infamous": { uk: "ганебний", pl: "cieszący się złą sławą", de: "berüchtigt", nl: "berucht", el: "διαβόητος", crh: "rezi" },
    "infant": { uk: "немовля", pl: "niemowlę", de: "Säugling", nl: "baby", el: "βρέφος", crh: "bebek" },
    "inflict": { uk: "завдавати", pl: "wymierzać", de: "zufügen", nl: "toebrengen", el: "επιβάλλω", crh: "uydurmaq" },
    "influential": { uk: "впливовий", pl: "wpływowy", de: "einflussreich", nl: "invloedrijk", el: "σημαντικός", crh: "itibarlı" }
};

applyTranslations(batch5);
