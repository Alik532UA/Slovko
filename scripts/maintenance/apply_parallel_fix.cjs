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

const batch14 = {
    "municipal": { uk: "муніципальний", pl: "miejski", de: "kommunal", nl: "gemeentelijk", el: "δημοτικός", crh: "belediyege ait" },
    "mutual": { uk: "взаємний", pl: "wzajemny", de: "gegenseitig", nl: "wederzijds", el: "αμοιβαίος", crh: "qarşılıqlı" },
    "namely": { uk: "а саме", pl: "mianowicie", de: "nämlich", nl: "namelijk", el: "δηλαδή", crh: "yani" },
    "nationwide": { uk: "загальнонаціональний", pl: "ogólnokrajowy", de: "bundesweit", nl: "landelijk", el: "πανεθνικός", crh: "memleket miqyası" },
    "naval": { uk: "військово-морський", pl: "morski", de: "maritim", nl: "maritiem", el: "ναυτικός", crh: "deñizge ait" },
    "neglect": { uk: "нехтувати", pl: "zaniedbywać", de: "vernachlässigen", nl: "verwaarlozen", el: "παραμελώ", crh: "ihmal etmek" },
    "neighboring": { uk: "сусідній", pl: "sąsiedni", de: "benachbart", nl: "naburig", el: "γειτονικός", crh: "qomşu" },
    "neighbouring": { uk: "сусідній", pl: "sąsiedni", de: "benachbart", nl: "naburig", el: "γειτονικός", crh: "qomşu" },
    "nest": { uk: "гніздо", pl: "gniazdo", de: "Nest", nl: "nest", el: "φωλιά", crh: "yuva" },
    "newsletter": { uk: "інформаційний бюлетень", pl: "biuletyn", de: "Newsletter", nl: "nieuwsbrief", el: "ενημερωτικό δελτίο", crh: "haber kâğıtı" },
    "niche": { uk: "ніша", pl: "nisza", de: "Nische", nl: "nis", el: "κόγχη", crh: "hücre" },
    "noble": { uk: "шляхетний", pl: "szlachetny", de: "adelig", nl: "nobel", el: "ευγενής", crh: "asil" },
    "nod": { uk: "кивати", pl: "skinienie głową", de: "nicken", nl: "knikken", el: "νεύμα", crh: "baş sallamaq" },
    "nomination": { uk: "номінація", pl: "nominacja", de: "Nominierung", nl: "nominatie", el: "υποψηφιότητα", crh: "namzetlik" },
    "nominee": { uk: "номінант", pl: "nominowany", de: "Nominierter", nl: "genomineerde", el: "υποψήφιος", crh: "namzet" },
    "non-profit": { uk: "неприбутковий", pl: "non-profit", de: "gemeinnützig", nl: "non-profit", el: "μη κερδοσκοπικός", crh: "fayda kötermegen" },
    "nonetheless": { uk: "тим не менш", pl: "niemniej jednak", de: "nichtsdestotrotz", nl: "niettemin", el: "παρ' όλα αυτά", crh: "oña baqmadan" },
    "nonprofit": { uk: "неприбутковий", pl: "non-profit", de: "gemeinnützig", nl: "non-profit", el: "μη κερδοσκοπικός", crh: "fayda kötermegen" },
    "noon": { uk: "полудень", pl: "południe", de: "Mittag", nl: "middag", el: "μεσημέρι", crh: "öle" },
    "notable": { uk: "помітний", pl: "godny uwagi", de: "bemerkenswert", nl: "opmerkelijk", el: "αξιοσημείωτος", crh: "diqqatqa lâyıq" }
};

applyTranslations(batch14);
