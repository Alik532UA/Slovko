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

const batch10 = {
    "limb": { uk: "кінцівка", pl: "kończyna", de: "Gliedmaße", nl: "ledemaat", el: "άκρο", crh: "ayaq-qol" },
    "line-up": { uk: "склад", pl: "skład", de: "Aufstellung", nl: "opstelling", el: "σύνθεση", crh: "terkip" },
    "linear": { uk: "лінійний", pl: "liniowy", de: "linear", nl: "lineair", el: "γραμμικός", crh: "sızıqlı" },
    "lineup": { uk: "склад", pl: "skład", de: "Aufstellung", nl: "opstelling", el: "σύνθεση", crh: "terkip" },
    "linger": { uk: "затримуватися", pl: "zwlekać", de: "verweilen", nl: "dralen", el: "χρονοτριβώ", crh: "lengerlemek" },
    "listing": { uk: "список", pl: "wykaz", de: "Auflistung", nl: "lijst", el: "κατάλογος", crh: "cedvel" },
    "liter": { uk: "літр", pl: "litr", de: "Liter", nl: "liter", el: "λίτρο", crh: "litra" },
    "literacy": { uk: "грамотність", pl: "umiejętność czytania", de: "Lese- und Schreibfähigkeit", nl: "geletterdheid", el: "αλφαβητισμός", crh: "okuma-yazuv qabiliyeti" },
    "liver": { uk: "печінка", pl: "wątroba", de: "Leber", nl: "lever", el: "συκάτι", crh: "bağır" },
    "lobby": { uk: "лобі", pl: "lobby", de: "Lobby", nl: "lobby", el: "λόμπι", crh: "lobi" },
    "log": { uk: "журнал", pl: "dziennik", de: "Protokoll", nl: "logboek", el: "αρχείο καταγραφής", crh: "kütük" },
    "logic": { uk: "логіка", pl: "logika", de: "Logik", nl: "logica", el: "λογική", crh: "mantıq" },
    "long-standing": { uk: "давній", pl: "długoletni", de: "langjährig", nl: "langdurig", el: "μακροχρόνιος", crh: "ezeliy" },
    "long-time": { uk: "давній", pl: "dawny", de: "langjährig", nl: "langdurig", el: "μακροχρόνιος", crh: "uzaq vaqıt" },
    "longtime": { uk: "давній", pl: "dawny", de: "langjährig", nl: "langdurig", el: "μακροχρόνιος", crh: "uzaq vaqıt" },
    "loom": { uk: "маячити", pl: "wyłaniać się", de: "sich abzeichnen", nl: "opdoemen", el: "διαφαίνομαι", crh: "körünmek" },
    "loop": { uk: "петля", pl: "pętla", de: "Schleife", nl: "lus", el: "βρόχος", crh: "sırma" },
    "loyalty": { uk: "лояльність", pl: "lojalność", de: "Loyalität", nl: "loyaliteit", el: "πίστη", crh: "sadıqlıq" },
    "machinery": { uk: "обладнання", pl: "maszyny", de: "Maschinen", nl: "machines", el: "μηχανήματα", crh: "maşinalar" },
    "magical": { uk: "магічний", pl: "magiczny", de: "magisch", nl: "magisch", el: "μαγικός", crh: "tılsımlı" }
};

applyTranslations(batch10);
