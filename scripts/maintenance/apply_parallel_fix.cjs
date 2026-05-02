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
                if (translations[key] || translations[searchKey]) {
                    const trans = translations[key] || translations[searchKey];
                    if (trans[lang]) {
                        content[key] = trans[lang];
                        changed = true;
                    }
                }
            });

            if (changed) {
                fs.writeFileSync(filePath, '\uFEFF' + JSON.stringify(content, null, '\t'), 'utf8');
                console.log(`Updated keys in ${lang}/${file}`);
            }
        });
    });
}

const batch113 = {
    "emotional": { de: "emotional", nl: "emotioneel", pl: "emocjonalny", crh: "heyecanlı" },
    "wolf": { de: "Wolf", nl: "wolf", pl: "wilk", crh: "bori" },
    "organ": { de: "Organ", nl: "orgaan", pl: "organ", crh: "organ" },
    "protein": { de: "Protein", nl: "eiwit", pl: "białko", crh: "protein" },
    "absolution": { de: "Absolution", nl: "vergeving", pl: "rozgrzeszenie", crh: "günadan azat etüv" },
    "alibi": { de: "Alibi", nl: "alibi", pl: "alibi", crh: "alibi" },
    "alluvial": { de: "alluvial", nl: "alluviaal", pl: "aluwialny", crh: "allüvial" },
    "ambivalent": { de: "ambivalent", nl: "ambivalent", pl: "ambivalentny", crh: "ekilemli" },
    "analyst": { de: "Analyst", nl: "analist", pl: "analityk", crh: "analitik" },
    "anathema": { de: "Anathema", nl: "anathema", pl: "anatema", crh: "lânet" },
    "animation": { de: "Animation", nl: "animatie", pl: "animacja", crh: "animatsiya" },
    "apartheid": { de: "Apartheid", nl: "apartheid", pl: "apartheid", crh: "aparteid" },
    "audio": { de: "Audio", nl: "audio", pl: "audio", crh: "ses" },
    "clip": { de: "Clip", nl: "clip", pl: "klip", crh: "qısqaç" },
    "deck": { de: "Deck", nl: "dek", pl: "pokład", crh: "paluba" },
    "depression": { de: "Depression", nl: "depressie", pl: "depresja", crh: "depressiya" },
    "dominant": { de: "dominant", nl: "dominant", pl: "dominujący", crh: "üstün" },
    "elegant": { de: "elegant", nl: "elegant", pl: "elegancki", crh: "zarif" },
    "emission": { de: "Emission", nl: "emissie", pl: "emisja", crh: "tışarı çıqaruv" },
    "engagement_involvement": { de: "Engagement", nl: "betrokkenheid", pl: "zaangażowanie", crh: "iştirak" },
    "evolution": { de: "Evolution", nl: "evolutie", pl: "ewolucja", crh: "evrim" },
    "expansion": { de: "Expansion", nl: "expansie", pl: "ekspansja", crh: "kenişletüv" },
    "expertise": { de: "Expertise", nl: "expertise", pl: "ekspertyza", crh: "ustalıq" },
    "format": { de: "Format", nl: "formaat", pl: "format", crh: "format" },
    "formation": { de: "Formation", nl: "formatie", pl: "formacja", crh: "teşkil" },
    "forum": { de: "Forum", nl: "forum", pl: "forum", crh: "forum" },
    "fossil": { de: "Fossil", nl: "fossiel", pl: "skamieniałość", crh: "fosil" },
    "fragment": { de: "Fragment", nl: "fragment", pl: "fragment", crh: "parça" },
    "gaming": { de: "Gaming", nl: "gaming", pl: "gry", crh: "oyunlar" },
    "genre": { de: "Genre", nl: "genre", pl: "gatunek", crh: "janr" }
};

applyTranslations(batch113);
