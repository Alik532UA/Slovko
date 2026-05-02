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

const batch127 = {
    "do": { crh: "yapmaq" },
    "flat": { crh: "yassı" },
    "kind": { crh: "turlı" },
    "let": { crh: "musaade etmek" },
    "lot": { crh: "çoq" },
    "may": { crh: "-ıp bilmek" },
    "must": { crh: "kerek" },
    "the": { crh: "the" },
    "pet": { crh: "ev ayvanı" },
    "piston": { crh: "piston" },
    "federal": { crh: "federal" },
    "risk": { crh: "risk" },
    "buck": { crh: "dollar" },
    "dime": { crh: "on tsentlik" },
    "grant": { crh: "grant" },
    "virtual": { crh: "virtual" },
    "disk": { crh: "disk" },
    "cult": { crh: "fırqa" },
    "cynical": { crh: "kinik" },
    "default": { crh: "tışlama" },
    "quota": { crh: "kvota" }
};

applyTranslations(batch127);
